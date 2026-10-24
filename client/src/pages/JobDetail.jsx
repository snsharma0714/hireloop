import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaMapMarkerAlt, FaExternalLinkAlt, FaTimes, FaCheckCircle } from 'react-icons/fa'
import { ServerUrl } from '../App'
import Navbar from '../components/Navbar'
import AuthModel from '../components/AuthModel'
import { stageOf, timeAgo } from '../components/jobs/jobUtils'
import ScreeningFields from '../components/jobs/ScreeningFields'
import { missingAnswer } from '../components/jobs/screeningUtils'

function ApplyModal({ job, onClose, onApplied }) {
    const { userData } = useSelector((state) => state.user)
    const [resumeUrl, setResumeUrl] = useState(userData?.resumeUrl || "")
    const [coverNote, setCoverNote] = useState("")
    const [shareStats, setShareStats] = useState(true)
    const [answers, setAnswers] = useState({})
    const [stats, setStats] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        axios.get(ServerUrl + "/api/practice/stats", { withCredentials: true }).then(r => setStats(r.data)).catch(() => {})
    }, [])

    const solved = stats ? Object.values(stats.byDifficulty).reduce((n, d) => n + d.solved, 0) : 0

    const apply = async () => {
        const missing = missingAnswer(job.questions, answers)
        if (missing) return toast.error(`Please answer: ${missing.text}`)
        setSaving(true)
        try {
            await axios.post(ServerUrl + `/api/jobs/${job._id}/apply`, { resumeUrl, coverNote, shareStats, answers }, { withCredentials: true })
            toast.success("Application sent!")
            onApplied()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not apply")
            setSaving(false)
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4'>
            <div className='relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto'>
                <button onClick={onClose} className='absolute top-6 right-6 text-gray-500 hover:text-black'><FaTimes /></button>
                <h2 className='text-2xl font-semibold'>Apply to {job.company?.companyName}</h2>
                <p className='text-sm text-gray-500 mb-5'>{job.title}</p>

                <label className='block text-sm text-gray-600 mb-1'>Resume link</label>
                <input value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder='https://drive.google.com/...'
                    className='w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                <p className='text-xs text-gray-400 mt-1'>A Google Drive or Dropbox link set to "anyone with the link can view".</p>

                {job.questions?.length > 0 && <div className='mt-5'>
                    <p className='text-sm font-medium mb-3'>A few questions from {job.company?.companyName}</p>
                    <ScreeningFields questions={job.questions} value={answers} onChange={setAnswers} />
                </div>}

                <label className='block text-sm text-gray-600 mt-4 mb-1'>Why you're a good fit <span className='text-gray-400'>(optional)</span></label>
                <textarea rows={4} value={coverNote} onChange={e => setCoverNote(e.target.value)}
                    className='w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black resize-none' />

                <label className='flex items-start gap-3 mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 cursor-pointer'>
                    <input type='checkbox' checked={shareStats} onChange={e => setShareStats(e.target.checked)} className='mt-1 w-4 h-4 accent-emerald-600' />
                    <span className='text-sm'>
                        <b>Share my practice record with {job.company?.companyName}</b>
                        <span className='block text-gray-600 mt-1'>
                            They'll see: {solved} problems solved{stats && ` (${stats.byDifficulty.Easy.solved} easy, ${stats.byDifficulty.Medium.solved} medium, ${stats.byDifficulty.Hard.solved} hard)`},
                            your streak, {stats?.sheetSolved ?? 0} sheet problems done, practice sessions and recently solved problems. Not your code.
                        </span>
                    </span>
                </label>

                <button onClick={apply} disabled={saving} className='w-full mt-6 bg-black text-white py-3 rounded-full hover:opacity-90 disabled:opacity-50'>
                    {saving ? "Sending..." : "Submit application"}
                </button>
            </div>
        </div>
    )
}

function JobDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)
    const [job, setJob] = useState(null)
    const [error, setError] = useState("")
    const [showApply, setShowApply] = useState(false)
    const [showAuth, setShowAuth] = useState(false)
    const [version, setVersion] = useState(0)

    useEffect(() => {
        axios.get(ServerUrl + `/api/jobs/${id}`, { withCredentials: true })
            .then(r => setJob(r.data))
            .catch(e => setError(e.response?.data?.message || "Could not load job"))
    }, [id, userData, version])

    if (error) return <div className='min-h-screen flex items-center justify-center text-gray-500'>{error}</div>
    if (!job) return <div className='min-h-screen flex items-center justify-center text-gray-500'>Loading...</div>

    const applyArea = () => {
        if (job.application) {
            const stage = stageOf(job.application.status)
            return (
                <div className='text-center'>
                    <p className='flex items-center justify-center gap-2 text-emerald-600 font-medium'><FaCheckCircle /> Applied {timeAgo(job.application.createdAt)}</p>
                    <p className='text-sm mt-2'>Status: <span className={`px-2.5 py-0.5 rounded-full text-xs ${stage.style}`}>{stage.label}</span></p>
                    <button onClick={() => navigate("/applications")} className='mt-4 text-sm underline'>Track in My applications</button>
                </div>
            )
        }
        if (job.status !== "open") return <p className='text-center text-gray-500'>This job is no longer accepting applications.</p>
        if (!userData) return <button onClick={() => setShowAuth(true)} className='w-full bg-black text-white py-3 rounded-full'>Log in to apply</button>
        if (userData.role !== "student") return <p className='text-center text-sm text-gray-500'>Only student accounts can apply.</p>
        return <button onClick={() => setShowApply(true)} className='w-full bg-black text-white py-3 rounded-full hover:opacity-90'>Apply now</button>
    }

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 pb-10'>
            <Navbar />
            <div className='w-[92vw] lg:w-[70vw] mx-auto mt-8'>
                <button onClick={() => navigate("/jobs")} className='flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-5'><FaArrowLeft size={12} /> All jobs</button>

                <div className='grid lg:grid-cols-3 gap-6'>
                    <div className='lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-7'>
                        <h1 className='text-3xl font-bold text-gray-800'>{job.title}</h1>
                        <p className='text-gray-600 mt-1'>{job.company?.companyName}</p>
                        <div className='flex flex-wrap items-center gap-2 mt-4 text-sm'>
                            <span className='px-3 py-1 rounded-full bg-gray-100 text-gray-700'>{job.type}</span>
                            {job.remote && <span className='px-3 py-1 rounded-full bg-emerald-50 text-emerald-700'>Remote</span>}
                            {job.location && <span className='flex items-center gap-1 text-gray-500'><FaMapMarkerAlt size={11} /> {job.location}</span>}
                            {job.salary && <span className='text-gray-500'>• {job.salary}</span>}
                            {job.experience && <span className='text-gray-500'>• {job.experience}</span>}
                        </div>
                        {job.skills?.length > 0 &&
                            <div className='flex flex-wrap gap-1.5 mt-4'>
                                {job.skills.map(s => <span key={s} className='text-xs px-2.5 py-1 rounded-md bg-gray-50 border border-gray-100 text-gray-600'>{s}</span>)}
                            </div>}
                        <div className='mt-6 text-gray-700 whitespace-pre-wrap leading-relaxed'>{job.description}</div>
                    </div>

                    <div className='space-y-4'>
                        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>{applyArea()}</div>
                        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
                            <p className='font-semibold'>{job.company?.companyName}</p>
                            {job.company?.companyAbout && <p className='text-sm text-gray-600 mt-2 whitespace-pre-wrap'>{job.company.companyAbout}</p>}
                            {job.company?.companyWebsite &&
                                <a href={job.company.companyWebsite} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 text-sm underline mt-3'>Website <FaExternalLinkAlt size={10} /></a>}
                            <p className='text-xs text-gray-400 mt-3'>Posted {timeAgo(job.createdAt)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {showApply && <ApplyModal job={job} onClose={() => setShowApply(false)} onApplied={() => { setShowApply(false); setVersion(v => v + 1) }} />}
            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </div>
    )
}

export default JobDetail
