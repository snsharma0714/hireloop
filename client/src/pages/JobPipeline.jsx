import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaTimes, FaExternalLinkAlt, FaFire, FaCode, FaListUl, FaUsers, FaRegCopy, FaVideo, FaLock, FaPlus, FaSearch } from 'react-icons/fa'
import { ServerUrl } from '../App'
import { can } from '../components/company/access'
import { STAGES, confirmMove, stageOf, timeAgo } from '../components/jobs/jobUtils'
import { DIFFICULTY_STYLES } from '../components/practice/practiceUtils'
import { ACTIVITY_INFO, SOURCE_LABELS } from '../components/company/candidateUtils'

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black'

function PracticeRecord({ stats, isStudent }) {
    if (!stats) {
        return <p className='flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-4'><FaLock size={12} />
            {isStudent ? "This candidate chose not to share their practice record." : "Added by your team, so there's no HireLoop practice record."}</p>
    }
    return (
        <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-2'>
                {[
                    { icon: <FaCode />, label: "Problems solved", value: stats.solved },
                    { icon: <FaFire />, label: "Day streak", value: stats.streak },
                    { icon: <FaListUl />, label: "Sheet problems", value: stats.sheetSolved },
                    { icon: <FaUsers />, label: "Pair sessions", value: stats.sessionsCompleted }
                ].map(s => (
                    <div key={s.label} className='bg-gray-50 rounded-xl p-3'>
                        <p className='flex items-center gap-2 text-lg font-bold'><span className='text-gray-400 text-sm'>{s.icon}</span>{s.value}</p>
                        <p className='text-xs text-gray-500'>{s.label}</p>
                    </div>
                ))}
            </div>
            <div className='flex gap-2 text-xs flex-wrap'>
                {Object.entries(stats.byDifficulty).map(([d, v]) => (
                    <span key={d} className={`px-2.5 py-1 rounded-full ${DIFFICULTY_STYLES[d]}`}>{d} {v.solved}/{v.total}</span>
                ))}
                <span className='px-2.5 py-1 rounded-full bg-gray-100 text-gray-600'>Active {stats.activeDaysLast30} of last 30 days</span>
            </div>
            {stats.languages.length > 0 && <p className='text-xs text-gray-500'>Solves in: {stats.languages.join(", ")}</p>}
            {stats.recentSolved.length > 0 &&
                <div>
                    <p className='text-xs font-medium text-gray-500 mb-1'>Recently solved</p>
                    <ul className='text-sm space-y-1'>
                        {stats.recentSolved.map(p => (
                            <li key={p.title} className='flex justify-between gap-2'>
                                <span className='truncate'>{p.title}</span>
                                <span className={`text-xs px-2 rounded-full shrink-0 ${DIFFICULTY_STYLES[p.difficulty]}`}>{p.difficulty}</span>
                            </li>
                        ))}
                    </ul>
                </div>}
        </div>
    )
}

function CandidatePanel({ app, onClose, onChanged, canEdit }) {
    const navigate = useNavigate()
    const [note, setNote] = useState("")
    const [when, setWhen] = useState("")
    const [duration, setDuration] = useState(60)
    // optional: a built-in problem that's on screen as soon as the room opens
    const [firstQuestion, setFirstQuestion] = useState("")
    const [problems, setProblems] = useState([])
    useEffect(() => {
        if (!canEdit || app.interview) return
        axios.get(ServerUrl + "/api/practice/problems", { withCredentials: true }).then(r => setProblems(r.data)).catch(() => {})
    }, [canEdit, app.interview])
    const [busy, setBusy] = useState(false)
    // talent-pool details, with the student's HireLoop profile filling any gaps
    const s = { ...app.student, ...Object.fromEntries(Object.entries(app.candidate || {}).filter(([, v]) => v && (!Array.isArray(v) || v.length))) }
    const iv = app.interview
    const roomLink = iv && `${window.location.origin}/room/${iv.token}`

    const patch = async (body, okMessage) => {
        setBusy(true)
        try {
            await axios.patch(ServerUrl + `/api/jobs/applications/${app._id}`, body, { withCredentials: true })
            if (okMessage) toast.success(okMessage)
            await onChanged()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not update")
        } finally {
            setBusy(false)
        }
    }

    const schedule = async () => {
        setBusy(true)
        try {
            await axios.post(ServerUrl + `/api/jobs/applications/${app._id}/schedule`, { scheduledAt: new Date(when).toISOString(), durationMin: duration, problemSlug: firstQuestion || undefined }, { withCredentials: true })
            toast.success("Interview scheduled. The candidate sees it in My applications.")
            setWhen("")
            await onChanged()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not schedule")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex justify-end bg-black/20' onClick={onClose}>
            <aside onClick={e => e.stopPropagation()} className='w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto p-6 space-y-6'>
                <div className='flex items-start justify-between gap-3'>
                    <div>
                        <button onClick={() => navigate(`/company/candidates/${app.candidate._id}`)} className='text-xl font-semibold hover:underline text-left'>{s.name}</button>
                        {s.headline && <p className='text-sm text-gray-600'>{s.headline}</p>}
                        <p className='text-xs text-gray-400 mt-1'>{[s.email, s.phone].filter(Boolean).join(" • ")}{s.college && ` • ${s.college}`}{s.graduationYear && ` '${String(s.graduationYear).slice(2)}`}</p>
                        <p className='text-xs text-gray-400'>{SOURCE_LABELS[app.candidate?.source]}</p>
                    </div>
                    <button onClick={onClose} className='text-gray-500 hover:text-black p-1'><FaTimes /></button>
                </div>

                <div className='flex flex-wrap gap-2'>
                    {app.resumeUrl
                        ? <a href={app.resumeUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-black text-white'>Resume <FaExternalLinkAlt size={10} /></a>
                        : <span className='text-sm text-gray-400'>No resume link</span>}
                    {s.skills?.map(k => <span key={k} className='text-xs px-2.5 py-1 rounded-md bg-gray-50 border border-gray-100'>{k}</span>)}
                </div>

                <div>
                    <p className='text-sm font-medium mb-2'>Stage</p>
                    <div className='flex flex-wrap gap-2'>
                        {STAGES.map(st => (
                            <button key={st.key} disabled={busy || !canEdit} onClick={() => confirmMove(s.name, app.status, st.key) && patch({ status: st.key }, `Moved to ${st.label}`)}
                                className={`text-xs px-3 py-1.5 rounded-full border ${app.status === st.key ? `${st.style} border-transparent font-medium` : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                                {st.label}
                            </button>
                        ))}
                    </div>
                </div>

                {app.answers?.length > 0 && <div>
                    <p className='text-sm font-medium mb-2'>Screening answers {app.screeningPassed === false && <span className='ml-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-normal'>doesn't match everything you asked for</span>}</p>
                    <div className='space-y-2'>
                        {app.answers.map((a, i) => (
                            <div key={i} className={`text-sm rounded-xl p-3 ${a.ok === false ? "bg-red-50" : a.ok ? "bg-emerald-50" : "bg-gray-50"}`}>
                                <p className='text-xs text-gray-500'>{a.question}</p>
                                <p className='mt-0.5 whitespace-pre-wrap'>{a.ok === true && "✓ "}{a.ok === false && "✗ "}{{ yes: "Yes", no: "No" }[a.answer] || a.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>}

                {app.coverNote && <div>
                    <p className='text-sm font-medium mb-1'>Cover note</p>
                    <p className='text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3'>{app.coverNote}</p>
                </div>}

                <div>
                    <p className='text-sm font-medium mb-2'>Practice record on HireLoop</p>
                    <PracticeRecord stats={app.stats} isStudent={Boolean(app.student)} />
                </div>

                <div>
                    <p className='text-sm font-medium mb-2'>Interview</p>
                    {iv ? (
                        <div className='bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3'>
                            <p className='text-sm'>{new Date(iv.scheduledAt).toLocaleString()} • {iv.durationMin} min • <span className='capitalize'>{iv.status}</span></p>
                            <div className='flex flex-wrap gap-2'>
                                {canEdit && ["scheduled", "live"].includes(iv.status) && <>
                                    <button onClick={() => navigate(`/room/${iv.token}`)} className='flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-purple-600 text-white'><FaVideo /> Join room</button>
                                    <button onClick={() => navigator.clipboard.writeText(roomLink).then(() => toast.success("Link copied"))} className='flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white border'><FaRegCopy /> Copy link</button>
                                </>}
                                {iv.status === "completed" &&
                                    <button onClick={() => navigate(`/company/interviews/${iv._id}`)} className='text-xs px-3 py-1.5 rounded-full bg-black text-white'>Scorecard & AI summary</button>}
                            </div>
                        </div>
                    ) : !canEdit ? <p className='text-sm text-gray-400'>Not scheduled yet.</p> : (
                        <div className='space-y-2'>
                        <div className='flex gap-2'>
                            <input type='datetime-local' value={when} onChange={e => setWhen(e.target.value)} className={inputClass} />
                            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className='border border-gray-200 rounded-xl px-2 text-sm'>
                                {[30, 45, 60, 90].map(m => <option key={m} value={m}>{m}m</option>)}
                            </select>
                            <button disabled={!when || busy} onClick={schedule} className='text-sm px-4 rounded-xl bg-black text-white disabled:opacity-40'>Schedule</button>
                        </div>
                        <select aria-label='First question' value={firstQuestion} onChange={e => setFirstQuestion(e.target.value)} className='w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600'>
                            <option value=''>First question: choose in the room</option>
                            {problems.map(p => <option key={p.slug} value={p.slug}>{p.title} ({p.difficulty})</option>)}
                        </select>
                        </div>
                    )}
                </div>

                <div>
                    <p className='text-sm font-medium mb-2'>Activity <span className='text-xs text-gray-400 font-normal'>(private to your team)</span></p>
                    <div className='space-y-2 mb-2 max-h-72 overflow-y-auto'>
                        {(app.activities || []).map(a => (
                            <div key={a._id} className={`text-sm rounded-xl p-3 ${a.type === "note" ? "bg-yellow-50" : "bg-gray-50"}`}>
                                <p className='whitespace-pre-wrap'>{ACTIVITY_INFO[a.type]?.icon} {a.text}</p>
                                <p className='text-[11px] text-gray-400 mt-1'>{a.by?.name && `${a.by.name} • `}{a.job?.title && `${a.job.title} • `}{timeAgo(a.at)}</p>
                            </div>
                        ))}
                    </div>
                    {canEdit && <>
                    <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder='Add a note for your team...' className={`${inputClass} resize-none`} />
                    <button disabled={!note.trim() || busy} onClick={() => patch({ note }).then(() => setNote(""))} className='mt-2 text-sm px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40'>Add note</button>
                    </>}
                </div>

                <button onClick={() => navigate(`/company/candidates/${app.candidate._id}`)} className='text-sm underline'>Open full profile, calls and meetings</button>
            </aside>
        </div>
    )
}

// Search the talent pool and drop someone into this job's pipeline
function AddFromPool({ jobId, inPipeline, onClose, onAdded }) {
    const navigate = useNavigate()
    const [q, setQ] = useState("")
    const [results, setResults] = useState([])

    useEffect(() => {
        const id = setTimeout(() => {
            axios.get(ServerUrl + "/api/candidates", { params: { q }, withCredentials: true }).then(r => setResults(r.data.candidates)).catch(() => {})
        }, 250)
        return () => clearTimeout(id)
    }, [q])

    const add = async (c) => {
        try {
            await axios.post(ServerUrl + `/api/candidates/${c._id}/jobs`, { jobId, status: "applied" }, { withCredentials: true })
            toast.success(`${c.name} added to the pipeline`)
            onAdded()
        } catch (e) {
            toast.error(e.response?.data?.message || "Could not add")
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4'>
            <div className='relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-7 max-h-[85vh] flex flex-col'>
                <button onClick={onClose} className='absolute top-6 right-6 text-gray-500 hover:text-black'><FaTimes /></button>
                <h2 className='text-xl font-semibold mb-4'>Add from talent pool</h2>
                <div className='flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 mb-3'>
                    <FaSearch className='text-gray-400' size={13} />
                    <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder='Search name, skill, tag...' className='flex-1 outline-none text-sm' />
                </div>
                <div className='flex-1 overflow-y-auto divide-y divide-gray-100'>
                    {results.map(c => (
                        <div key={c._id} className='flex items-center justify-between gap-3 py-2.5'>
                            <div className='min-w-0'>
                                <p className='text-sm font-medium truncate'>{c.name}</p>
                                <p className='text-xs text-gray-500 truncate'>{[c.headline, c.email].filter(Boolean).join(" • ")}</p>
                            </div>
                            {inPipeline.has(c._id)
                                ? <span className='text-xs text-gray-400 shrink-0'>in pipeline</span>
                                : <button onClick={() => add(c)} className='text-xs px-3 py-1.5 rounded-full bg-black text-white shrink-0'>Add</button>}
                        </div>
                    ))}
                    {results.length === 0 && <p className='text-sm text-gray-500 py-4 text-center'>No matches. <button onClick={() => navigate("/company/candidates")} className='underline'>Add a new candidate</button></p>}
                </div>
            </div>
        </div>
    )
}

function JobPipeline() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)
    const canEdit = can(userData, "recruiter")
    const [data, setData] = useState(null)
    const [error, setError] = useState("")
    const [openId, setOpenId] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const [adding, setAdding] = useState(false)

    const load = useCallback(async () => {
        try {
            const res = await axios.get(ServerUrl + `/api/jobs/${id}/applications`, { withCredentials: true })
            setData(res.data)
        } catch (e) {
            setError(e.response?.data?.message || "Could not load pipeline")
        }
    }, [id])

    useEffect(() => {
        axios.get(ServerUrl + `/api/jobs/${id}/applications`, { withCredentials: true })
            .then(res => setData(res.data))
            .catch(e => setError(e.response?.data?.message || "Could not load pipeline"))
    }, [id])

    const move = async (appId, status) => {
        const app = data.applications.find(a => a._id === appId)
        if (!app || app.status === status) return
        if (!confirmMove(app.candidate.name, app.status, status)) return
        // optimistic move, then reload from the server
        setData(d => ({ ...d, applications: d.applications.map(a => a._id === appId ? { ...a, status } : a) }))
        try {
            const res = await axios.patch(ServerUrl + `/api/jobs/applications/${appId}`, { status }, { withCredentials: true })
            toast.success(`${app.candidate.name} moved to ${stageOf(status).label}${res.data.notified ? "" : " (no email sent, they've been here before)"}`)
        } catch (e) {
            toast.error(e.response?.data?.message || "Could not move candidate")
        }
        load()
    }

    if (error) return <div className='min-h-screen flex items-center justify-center text-gray-500'>{error}</div>
    if (!data) return <div className='min-h-screen flex items-center justify-center text-gray-500'>Loading...</div>

    const openApp = data.applications.find(a => a._id === openId)

    return (
        <div className='pb-10'>
            <div className='px-4 lg:px-8 mt-8'>
                <button onClick={() => navigate("/company/jobs")} className='flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4'><FaArrowLeft size={12} /> All jobs</button>
                <div className='flex items-end justify-between gap-4 flex-wrap mb-6'>
                    <div>
                        <h1 className='text-2xl font-bold text-gray-800'>{data.job.title}</h1>
                        <p className='text-sm text-gray-500 mt-1'>{data.applications.length} applicant{data.applications.length === 1 ? "" : "s"} • {canEdit ? "drag cards between columns, click a card for details" : "read-only view"}</p>
                    </div>
                    <div className='flex items-center gap-3'>
                        <button onClick={() => navigate(`/jobs/${data.job._id}`)} className='text-sm underline text-gray-600'>View public job page</button>
                        {canEdit && <button onClick={() => setAdding(true)} className='flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-black text-white'><FaPlus size={11} /> Add from talent pool</button>}
                    </div>
                </div>

                <div className='flex gap-4 overflow-x-auto pb-4'>
                    {STAGES.map(stage => {
                        const cards = data.applications.filter(a => a.status === stage.key)
                        return (
                            <div key={stage.key}
                                onDragOver={e => { e.preventDefault(); setDragOver(stage.key) }}
                                onDragLeave={() => setDragOver(null)}
                                onDrop={e => { e.preventDefault(); setDragOver(null); move(e.dataTransfer.getData("text/plain"), stage.key) }}
                                className={`w-72 shrink-0 rounded-2xl p-3 transition ${dragOver === stage.key ? "bg-emerald-100/70" : "bg-white/60"} border border-gray-100`}>
                                <div className='flex items-center justify-between px-1 mb-3'>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stage.style}`}>{stage.label}</span>
                                    <span className='text-xs text-gray-400'>{cards.length}</span>
                                </div>
                                <div className='space-y-2 min-h-24' data-stage={stage.key}>
                                    {cards.map(a => (
                                        <div key={a._id} draggable={canEdit}
                                            onDragStart={e => e.dataTransfer.setData("text/plain", a._id)}
                                            onClick={() => setOpenId(a._id)}
                                            className='bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:shadow-md active:cursor-grabbing'>
                                            <p className='font-medium text-sm text-gray-800'>{a.candidate.name}</p>
                                            {(a.candidate.headline || a.student?.headline) && <p className='text-xs text-gray-500 truncate'>{a.candidate.headline || a.student?.headline}</p>}
                                            <div className='flex flex-wrap items-center gap-1.5 mt-2 text-[11px]'>
                                                {a.stats
                                                    ? <>
                                                        <span className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700'>{a.stats.solved} solved</span>
                                                        {a.stats.streak > 0 && <span className='px-2 py-0.5 rounded-full bg-orange-50 text-orange-600'>🔥 {a.stats.streak}</span>}
                                                    </>
                                                    : a.student
                                                        ? <span className='px-2 py-0.5 rounded-full bg-gray-100 text-gray-500'>record private</span>
                                                        : <span className='px-2 py-0.5 rounded-full bg-gray-100 text-gray-500'>{SOURCE_LABELS[a.candidate.source]}</span>}
                                                {a.interview && <span className='px-2 py-0.5 rounded-full bg-purple-50 text-purple-700'>interview {a.interview.status}</span>}
                                                {a.screeningPassed === false && <span className='px-2 py-0.5 rounded-full bg-red-50 text-red-600'>✗ screening</span>}
                                                {a.screeningPassed === true && <span className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700'>✓ screening</span>}
                                            </div>
                                            <p className='text-[11px] text-gray-400 mt-2'>applied {timeAgo(a.createdAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {adding && <AddFromPool jobId={id} inPipeline={new Set(data.applications.map(a => a.candidate._id))} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load() }} />}
            {openApp && <CandidatePanel app={openApp} onClose={() => setOpenId(null)} onChanged={load} canEdit={canEdit} />}
        </div>
    )
}

export default JobPipeline
