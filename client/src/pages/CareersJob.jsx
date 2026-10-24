import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa'
import { ServerUrl } from '../App'
import CareersShell from '../components/careers/CareersShell'
import AuthModel from '../components/AuthModel'
import ScreeningFields from '../components/jobs/ScreeningFields'
import { missingAnswer } from '../components/jobs/screeningUtils'
import { jobMeta, stageOf, timeAgo } from '../components/jobs/jobUtils'

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black'
const empty = { name: "", email: "", phone: "", location: "", resumeUrl: "", linkedinUrl: "", coverNote: "", company_website: "" }

function CareersJob() {
    const { slug, jobId } = useParams()
    const { userData } = useSelector((state) => state.user)
    const [data, setData] = useState(null)
    const [error, setError] = useState("")
    const [form, setForm] = useState(empty)
    const [answers, setAnswers] = useState({})
    const [shareStats, setShareStats] = useState(true)
    const [sending, setSending] = useState(false)
    const [done, setDone] = useState(false)
    const [showAuth, setShowAuth] = useState(false)

    useEffect(() => {
        axios.get(ServerUrl + `/api/careers/${slug}/jobs/${jobId}`, { withCredentials: true })
            .then(r => { setData(r.data); document.title = `${r.data.job.title} at ${r.data.org.name}` })
            .catch(e => setError(e.response?.data?.message || "Could not load this job"))
    }, [slug, jobId, userData])

    if (error) return <div className='min-h-screen grid place-items-center text-gray-500 px-4 text-center'>{error}</div>
    if (!data) return <div className='min-h-screen grid place-items-center text-gray-500'>Loading...</div>

    const { org, job, application } = data
    const isStudent = userData?.role === "student"
    const isCompany = userData?.role === "company"
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

    const submit = async (e) => {
        e.preventDefault()
        const missing = missingAnswer(job.questions, answers)
        if (missing) return toast.error(`Please answer: ${missing.text}`)
        setSending(true)
        try {
            if (isStudent) {
                // signed-in students apply with their HireLoop account, same as the jobs board
                await axios.post(ServerUrl + `/api/jobs/${job._id}/apply`,
                    { resumeUrl: form.resumeUrl || userData.resumeUrl, coverNote: form.coverNote, shareStats, answers }, { withCredentials: true })
            } else {
                await axios.post(ServerUrl + `/api/careers/${slug}/jobs/${job._id}/apply`, { ...form, answers })
            }
            setDone(true)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not send your application")
        } finally {
            setSending(false)
        }
    }

    const applyBox = () => {
        if (done) {
            return (
                <div className='text-center py-6' data-testid='applied'>
                    <FaCheckCircle className='text-emerald-600 mx-auto' size={36} />
                    <p className='text-xl font-semibold mt-3'>Application sent</p>
                    <p className='text-sm text-gray-500 mt-1'>Thanks for applying to {org.name}. The team will get back to you.</p>
                    {isStudent && <Link to='/applications' className='inline-block mt-4 text-sm underline'>Track it in My applications</Link>}
                </div>
            )
        }
        if (application) {
            const st = stageOf(application.status)
            return (
                <div className='text-center py-4'>
                    <p className='flex items-center justify-center gap-2 text-emerald-600 font-medium'><FaCheckCircle /> You applied {timeAgo(application.createdAt)}</p>
                    <p className='text-sm mt-2'>Status: <span className={`px-2.5 py-0.5 rounded-full text-xs ${st.style}`}>{st.label}</span></p>
                </div>
            )
        }
        if (job.status !== "open") return <p className='text-center text-gray-500 py-4'>This role is no longer accepting applications.</p>

        return (
            <form onSubmit={submit} className='space-y-4'>
                <h2 className='text-xl font-semibold'>Apply for this role</h2>
                {isCompany && <p className='text-sm bg-amber-50 text-amber-800 rounded-xl p-3'>You're signed in as a company account, so this is a preview. Candidates see this form.</p>}
                {isStudent
                    ? <p className='text-sm bg-emerald-50 text-emerald-800 rounded-xl p-3'>Applying as <b>{userData.name}</b> ({userData.email}) with your HireLoop profile.</p>
                    : <>
                        <div className='grid sm:grid-cols-2 gap-3'>
                            <input required placeholder='Full name *' value={form.name} onChange={set("name")} className={inputClass} />
                            <input required type='email' placeholder='Email *' value={form.email} onChange={set("email")} className={inputClass} />
                            <input placeholder='Phone' value={form.phone} onChange={set("phone")} className={inputClass} />
                            <input placeholder='City' value={form.location} onChange={set("location")} className={inputClass} />
                        </div>
                        <input placeholder='LinkedIn profile (https://...)' value={form.linkedinUrl} onChange={set("linkedinUrl")} className={inputClass} />
                    </>}
                <div>
                    <input placeholder={isStudent && userData.resumeUrl ? `Resume link (default: your profile resume)` : 'Resume link (Google Drive, Dropbox...)'} value={form.resumeUrl} onChange={set("resumeUrl")} className={inputClass} />
                    <p className='text-xs text-gray-400 mt-1'>Set the link so "anyone with the link can view".</p>
                </div>
                {/* hidden from people; bots fill it in */}
                <input tabIndex={-1} autoComplete='off' aria-hidden='true' value={form.company_website} onChange={set("company_website")} name='company_website'
                    className='absolute -left-[9999px] w-px h-px opacity-0' />

                {job.questions?.length > 0 && <div className='pt-2'>
                    <p className='text-sm font-medium mb-3'>A few questions</p>
                    <ScreeningFields questions={job.questions} value={answers} onChange={setAnswers} />
                </div>}

                <textarea rows={4} placeholder="Why you'd be a good fit (optional)" value={form.coverNote} onChange={set("coverNote")} className={`${inputClass} resize-none`} />

                {isStudent &&
                    <label className='flex items-start gap-3 p-3 rounded-xl bg-gray-50 text-sm cursor-pointer'>
                        <input type='checkbox' checked={shareStats} onChange={e => setShareStats(e.target.checked)} className='mt-0.5 w-4 h-4 accent-emerald-600' />
                        Share my HireLoop practice record (problems solved, streak, sheets) with {org.name}
                    </label>}

                <button disabled={sending || isCompany} className='w-full bg-black text-white py-3 rounded-full hover:opacity-90 disabled:opacity-50'>
                    {sending ? "Sending..." : "Submit application"}
                </button>
                {!userData &&
                    <p className='text-xs text-center text-gray-500'>Practising on HireLoop? <button type='button' onClick={() => setShowAuth(true)} className='underline'>Log in</button> to apply with your profile and practice record.</p>}
            </form>
        )
    }

    return (
        <CareersShell org={org}>
            <div className='max-w-5xl mx-auto px-4 py-8'>
                <Link to={`/careers/${org.slug}`} className='inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-5'><FaArrowLeft size={11} /> All roles at {org.name}</Link>
                <div className='grid lg:grid-cols-5 gap-6'>
                    <article className='lg:col-span-3 self-start bg-white rounded-2xl border border-gray-100 shadow-sm p-7'>
                        <h1 className='text-3xl font-bold text-gray-900'>{job.title}</h1>
                        <p className='text-gray-500 mt-2'>{jobMeta(job)}</p>
                        {job.skills?.length > 0 &&
                            <div className='flex flex-wrap gap-1.5 mt-4'>
                                {job.skills.map(s => <span key={s} className='text-xs px-2.5 py-1 rounded-md bg-gray-50 border border-gray-100 text-gray-600'>{s}</span>)}
                            </div>}
                        <div className='mt-6 text-gray-700 whitespace-pre-wrap leading-relaxed'>{job.description}</div>
                        <p className='text-xs text-gray-400 mt-6'>Posted {timeAgo(job.createdAt)}</p>
                    </article>
                    <aside className='lg:col-span-2'>
                        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:sticky lg:top-6'>{applyBox()}</div>
                    </aside>
                </div>
            </div>
            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </CareersShell>
    )
}

export default CareersJob
