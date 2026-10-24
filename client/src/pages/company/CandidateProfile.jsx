import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaExternalLinkAlt, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding, FaExclamationTriangle } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { can } from '../../components/company/access'
import { ACTIVITY_INFO, SOURCE_LABELS } from '../../components/company/candidateUtils'
import { STAGES, stageOf, timeAgo } from '../../components/jobs/jobUtils'
import CandidateForm from '../../components/company/CandidateForm'
import EventForm from '../../components/company/EventForm'
import { kindOf, whenLabel } from '../../components/company/calendarUtils'

// Write to a candidate; it goes out from the server and lands on their timeline
function EmailComposer({ candidate, orgName, onClose, onSent }) {
    const [subject, setSubject] = useState("")
    const [body, setBody] = useState(`Hi ${candidate.name.split(" ")[0]},



Best,
${orgName}`)
    const [sending, setSending] = useState(false)

    const send = async (e) => {
        e.preventDefault()
        setSending(true)
        try {
            const res = await axios.post(ServerUrl + `/api/candidates/${candidate._id}/email`, { subject, body }, { withCredentials: true })
            if (res.data.status === "sent") toast.success(`Email sent to ${candidate.email}`)
            else toast.error(`Not sent: ${res.data.error}`)
            onSent()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not send")
            setSending(false)
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4' onClick={onClose}>
            <form onSubmit={send} onClick={e => e.stopPropagation()} className='w-full max-w-lg bg-white rounded-3xl shadow-2xl p-7 space-y-3'>
                <h2 className='text-xl font-semibold'>Email {candidate.name}</h2>
                <p className='text-xs text-gray-500'>To {candidate.email} • replies come to your own email</p>
                <input required autoFocus placeholder='Subject' value={subject} onChange={e => setSubject(e.target.value)} className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black' />
                <textarea required rows={9} aria-label='Message' value={body} onChange={e => setBody(e.target.value)} className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black resize-y' />
                <div className='flex justify-end gap-2'>
                    <button type='button' onClick={onClose} className='text-sm px-5 py-2.5 rounded-full bg-gray-100'>Cancel</button>
                    <button disabled={sending} className='text-sm px-5 py-2.5 rounded-full bg-black text-white disabled:opacity-50'>{sending ? "Sending..." : "Send"}</button>
                </div>
            </form>
        </div>
    )
}

function CandidateProfile() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)
    const canEdit = can(userData, "recruiter")
    const [data, setData] = useState(null)
    const [error, setError] = useState("")
    const [jobs, setJobs] = useState([])
    const [lists, setLists] = useState([])
    const [editing, setEditing] = useState(false)
    const [scheduling, setScheduling] = useState(false)
    const [emailing, setEmailing] = useState(false)
    const [entry, setEntry] = useState({ type: "note", text: "", jobId: "" })
    const [addJob, setAddJob] = useState({ jobId: "", status: "applied" })
    const [version, setVersion] = useState(0)

    useEffect(() => {
        axios.get(ServerUrl + `/api/candidates/${id}`, { withCredentials: true })
            .then(r => setData(r.data)).catch(e => setError(e.response?.data?.message || "Could not load candidate"))
    }, [id, version])
    useEffect(() => {
        axios.get(ServerUrl + "/api/jobs/mine", { withCredentials: true }).then(r => setJobs(r.data)).catch(() => {})
        axios.get(ServerUrl + "/api/candidates/lists", { withCredentials: true }).then(r => setLists(r.data)).catch(() => {})
    }, [version])

    const reload = () => setVersion(v => v + 1)
    // resolves true on success so callers can chain follow-ups only when it worked
    const call = async (fn, ok) => {
        try {
            await fn()
            if (ok) toast.success(ok)
            reload()
            return true
        } catch (e) {
            toast.error(e.response?.data?.message || "Something went wrong")
            return false
        }
    }

    if (error) return <div className='p-10 text-gray-500'>{error}</div>
    if (!data) return <div className='p-10 text-gray-500'>Loading...</div>
    const { candidate: c, applications, activities, duplicates, stats } = data
    const inJobs = new Set(applications.map(a => a.job?._id))
    const memberOf = new Set(data.lists.map(l => l._id))

    const logEntry = (e) => {
        e.preventDefault()
        call(() => axios.post(ServerUrl + `/api/candidates/${id}/activities`, entry, { withCredentials: true }), "Logged").then(done => done && setEntry({ ...entry, text: "" }))
    }

    return (
        <div className='p-6 lg:p-10 max-w-6xl'>
            <button onClick={() => navigate("/company/candidates")} className='flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-5'><FaArrowLeft size={12} /> Candidates</button>

            {duplicates.length > 0 &&
                <div className='bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm'>
                    <p className='flex items-center gap-2 font-medium text-amber-800'><FaExclamationTriangle /> Possible duplicate</p>
                    {duplicates.map(d => (
                        <div key={d._id} className='flex items-center justify-between gap-3 mt-2 flex-wrap'>
                            <span>
                                <button onClick={() => navigate(`/company/candidates/${d._id}`)} className='underline'>{d.name}</button>
                                <span className='text-gray-500'> {[d.email, d.phone].filter(Boolean).join(" • ")}</span>
                            </span>
                            {canEdit && <button onClick={() => window.confirm(`Merge ${c.name} into ${d.name}? Jobs, activity and lists move over and this record is removed.`) &&
                                call(() => axios.post(ServerUrl + `/api/candidates/${id}/merge`, { intoId: d._id }, { withCredentials: true }), "Merged").then(done => done && navigate(`/company/candidates/${d._id}`))}
                                className='text-xs px-3 py-1.5 rounded-full bg-amber-600 text-white'>Merge into {d.name.split(" ")[0]}</button>}
                        </div>
                    ))}
                </div>}

            <div className='grid lg:grid-cols-3 gap-6'>
                {/* profile */}
                <div className='space-y-5'>
                    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
                        <h1 className='text-2xl font-bold text-gray-800'>{c.name}</h1>
                        {c.headline && <p className='text-gray-600 text-sm mt-1'>{c.headline}</p>}
                        <div className='space-y-1.5 text-sm text-gray-600 mt-4'>
                            {c.email && <p className='flex items-center gap-2'><FaEnvelope className='text-gray-400' /> <a href={`mailto:${c.email}`} className='hover:underline'>{c.email}</a></p>}
                            {c.phone && <p className='flex items-center gap-2'><FaPhone className='text-gray-400' /> {c.phone}</p>}
                            {c.location && <p className='flex items-center gap-2'><FaMapMarkerAlt className='text-gray-400' /> {c.location}</p>}
                            {c.currentCompany && <p className='flex items-center gap-2'><FaBuilding className='text-gray-400' /> {c.currentCompany}</p>}
                        </div>
                        <div className='flex flex-wrap gap-2 mt-4'>
                            {c.resumeUrl && <a href={c.resumeUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-black text-white'>Resume <FaExternalLinkAlt size={9} /></a>}
                            {c.linkedinUrl && <a href={c.linkedinUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-600 text-white'>LinkedIn <FaExternalLinkAlt size={9} /></a>}
                        </div>
                        {c.skills.length > 0 && <div className='flex flex-wrap gap-1.5 mt-4'>{c.skills.map(s => <span key={s} className='text-xs px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100'>{s}</span>)}</div>}
                        {c.tags.length > 0 && <div className='flex flex-wrap gap-1.5 mt-3'>{c.tags.map(t => <button key={t} onClick={() => navigate(`/company/candidates?tag=${encodeURIComponent(t)}`)} className='text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700'>#{t}</button>)}</div>}
                        {c.summary && <p className='text-sm text-gray-600 mt-4 whitespace-pre-wrap'>{c.summary}</p>}
                        <p className='text-xs text-gray-400 mt-4'>{SOURCE_LABELS[c.source]}{c.createdBy && ` by ${c.createdBy.name}`} • {timeAgo(c.createdAt)}{c.student && " • has a HireLoop account"}</p>
                        {canEdit && <div className='flex gap-3 mt-4 text-sm'>
                            {c.email && <button onClick={() => setEmailing(true)} className='underline'>Send email</button>}
                            <button onClick={() => setEditing(true)} className='underline'>Edit</button>
                            <button onClick={() => window.confirm(`Delete ${c.name} from the talent pool?`) && call(() => axios.delete(ServerUrl + `/api/candidates/${id}`, { withCredentials: true }), "Deleted").then(done => done && navigate("/company/candidates"))}
                                className='text-red-500'>Delete</button>
                        </div>}
                    </div>

                    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
                        <p className='font-semibold mb-3'>Lists</p>
                        <div className='flex flex-wrap gap-2'>
                            {data.lists.length === 0 && <p className='text-sm text-gray-400'>Not in any list.</p>}
                            {data.lists.map(l => <button key={l._id} onClick={() => navigate(`/company/candidates?list=${l._id}`)} className='text-xs px-3 py-1 rounded-full bg-gray-100'>{l.name}</button>)}
                        </div>
                        {canEdit && lists.some(l => !memberOf.has(l._id)) &&
                            <select value='' onChange={e => e.target.value && call(() => axios.post(ServerUrl + "/api/candidates/bulk", { ids: [id], listId: e.target.value }, { withCredentials: true }), "Added to list")}
                                className='mt-3 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm'>
                                <option value=''>Add to a list...</option>
                                {lists.filter(l => !memberOf.has(l._id)).map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                            </select>}
                    </div>

                    {stats &&
                        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
                            <p className='font-semibold mb-3'>HireLoop practice record</p>
                            <div className='grid grid-cols-2 gap-2 text-center'>
                                {[["Solved", stats.solved], ["Streak", stats.streak], ["Sheet problems", stats.sheetSolved], ["Pair sessions", stats.sessionsCompleted]].map(([l, v]) => (
                                    <div key={l} className='bg-gray-50 rounded-xl p-3'><p className='text-lg font-bold'>{v}</p><p className='text-xs text-gray-500'>{l}</p></div>
                                ))}
                            </div>
                        </div>}
                </div>

                {/* jobs + timeline */}
                <div className='lg:col-span-2 space-y-5'>
                    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
                        <p className='font-semibold mb-3'>Jobs</p>
                        {applications.length === 0 && <p className='text-sm text-gray-400 mb-3'>Not in any job's pipeline yet.</p>}
                        <div className='divide-y divide-gray-100'>
                            {applications.map(a => {
                                const st = stageOf(a.status)
                                return (
                                    <div key={a._id} className='flex items-center justify-between gap-3 py-3'>
                                        <button onClick={() => a.job && navigate(`/company/jobs/${a.job._id}`)} className='text-sm font-medium hover:underline text-left'>{a.job?.title}</button>
                                        <span className='flex items-center gap-3'>
                                            {a.screeningPassed === false && <span className='text-xs text-red-500'>✗ screening</span>}
                                            {a.interview && <span className='text-xs text-purple-600'>interview {a.interview.status}</span>}
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full ${st.style}`}>{st.label}</span>
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        {canEdit && jobs.some(j => !inJobs.has(j._id) && j.status === "open") &&
                            <div className='flex gap-2 mt-3'>
                                <select value={addJob.jobId} onChange={e => setAddJob({ ...addJob, jobId: e.target.value })} className='flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm'>
                                    <option value=''>Add to a job...</option>
                                    {jobs.filter(j => !inJobs.has(j._id) && j.status === "open").map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
                                </select>
                                <select value={addJob.status} onChange={e => setAddJob({ ...addJob, status: e.target.value })} className='border border-gray-200 rounded-xl px-2 text-sm'>
                                    {STAGES.filter(s => !["hired", "rejected"].includes(s.key)).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                                <button disabled={!addJob.jobId} onClick={() => call(() => axios.post(ServerUrl + `/api/candidates/${id}/jobs`, addJob, { withCredentials: true }), "Added to job").then(done => done && setAddJob({ jobId: "", status: "applied" }))}
                                    className='px-4 rounded-xl bg-black text-white text-sm disabled:opacity-40'>Add</button>
                            </div>}
                    </div>

                    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
                        <div className='flex items-center justify-between mb-3'>
                            <p className='font-semibold'>Calendar</p>
                            {canEdit && <button onClick={() => setScheduling(true)} className='text-xs px-3 py-1.5 rounded-full bg-black text-white'>Schedule</button>}
                        </div>
                        {data.events.length === 0 && <p className='text-sm text-gray-400'>No calls or meetings on the calendar.</p>}
                        <div className='divide-y divide-gray-100'>
                            {data.events.map(ev => (
                                <div key={ev._id} className={`flex items-start gap-3 py-2.5 ${new Date(ev.start) < new Date() ? "opacity-60" : ""}`}>
                                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${kindOf(ev).dot}`} />
                                    <div className='min-w-0'>
                                        <p className='text-sm font-medium text-gray-800'>{ev.title}</p>
                                        <p className='text-xs text-gray-500'>{whenLabel(ev)}{ev.attendees.length > 0 && ` • ${ev.attendees.map(a => a.name).join(", ")}`}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
                        <p className='font-semibold mb-3'>Activity</p>
                        {canEdit &&
                            <form onSubmit={logEntry} className='bg-gray-50 rounded-2xl p-3 mb-5 space-y-2'>
                                <div className='flex gap-2 flex-wrap'>
                                    {["note", "call", "email", "meeting"].map(t => (
                                        <button type='button' key={t} onClick={() => setEntry({ ...entry, type: t })}
                                            className={`text-xs px-3 py-1.5 rounded-full ${entry.type === t ? "bg-black text-white" : "bg-white border border-gray-200"}`}>{ACTIVITY_INFO[t].icon} {ACTIVITY_INFO[t].label}</button>
                                    ))}
                                    <select value={entry.jobId} onChange={e => setEntry({ ...entry, jobId: e.target.value })} className='ml-auto text-xs border border-gray-200 rounded-full px-2 bg-white'>
                                        <option value=''>Not about a specific job</option>
                                        {applications.map(a => a.job && <option key={a.job._id} value={a.job._id}>{a.job.title}</option>)}
                                    </select>
                                </div>
                                <textarea rows={2} value={entry.text} onChange={e => setEntry({ ...entry, text: e.target.value })}
                                    placeholder={entry.type === "call" ? "Called about notice period: 30 days, open to Bengaluru..." : "What happened?"}
                                    className='w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black resize-none bg-white' />
                                <button disabled={!entry.text.trim()} className='text-sm px-4 py-1.5 rounded-full bg-black text-white disabled:opacity-40'>Log {ACTIVITY_INFO[entry.type].label.toLowerCase()}</button>
                            </form>}
                        <ol className='space-y-4'>
                            {activities.length === 0 && <p className='text-sm text-gray-400'>No activity yet.</p>}
                            {activities.map(a => (
                                <li key={a._id} className='flex gap-3'>
                                    <span className='text-lg leading-none mt-0.5'>{ACTIVITY_INFO[a.type]?.icon}</span>
                                    <div className='min-w-0'>
                                        <p className='text-sm text-gray-800 whitespace-pre-wrap'>{a.text}</p>
                                        <p className='text-xs text-gray-400 mt-0.5'>
                                            {ACTIVITY_INFO[a.type]?.label}{a.job && ` • ${a.job.title}`}{a.by && ` • ${a.by.name}`} • {timeAgo(a.at)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>

            {emailing && <EmailComposer candidate={c} orgName={userData?.org?.name} onClose={() => setEmailing(false)} onSent={() => { setEmailing(false); reload() }} />}
            {scheduling && <EventForm lockCandidate defaults={{ candidate: { _id: c._id, name: c.name }, kind: "call", job: applications[0]?.job?._id }}
                onClose={() => setScheduling(false)} onSaved={() => { setScheduling(false); reload() }} />}
            {editing && <CandidateForm initial={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
        </div>
    )
}

export default CandidateProfile
