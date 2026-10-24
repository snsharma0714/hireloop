import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { motion } from "motion/react"
import { FaArrowLeft, FaPlus, FaRegCopy, FaVideo, FaTimes, FaCheck } from 'react-icons/fa'
import { MdOutlineEmail } from 'react-icons/md'
import { ServerUrl } from '../App'
import { can } from '../components/company/access'
import Auth from './Auth'

const STATUS_STYLES = {
    scheduled: "bg-blue-100 text-blue-700",
    live: "bg-red-100 text-red-600",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-gray-200 text-gray-600"
}

const emptyForm = {
    title: "",
    companyName: "",
    candidateName: "",
    candidateEmail: "",
    scheduledAt: "",
    durationMin: 60,
    description: ""
}

const roomLink = (token) => `${window.location.origin}/room/${token}`

function HiringDashboard() {
    const { userData } = useSelector((state) => state.user)
    const navigate = useNavigate()
    const [interviews, setInterviews] = useState([])
    const [filter, setFilter] = useState("all")
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [copiedId, setCopiedId] = useState(null)

    const loadInterviews = async () => {
        try {
            const result = await axios.get(ServerUrl + "/api/schedule", { withCredentials: true })
            setInterviews(result.data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (userData) loadInterviews()
    }, [userData])

    const stats = useMemo(() => ({
        all: interviews.length,
        scheduled: interviews.filter(i => i.status === "scheduled").length,
        live: interviews.filter(i => i.status === "live").length,
        completed: interviews.filter(i => i.status === "completed").length,
        cancelled: interviews.filter(i => i.status === "cancelled").length
    }), [interviews])

    const visible = filter === "all" ? interviews : interviews.filter(i => i.status === filter)

    const handleSchedule = async (e) => {
        e.preventDefault()
        setError("")
        setSaving(true)
        try {
            const payload = { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() }
            const result = await axios.post(ServerUrl + "/api/schedule", payload, { withCredentials: true })
            setInterviews([result.data, ...interviews])
            setForm(emptyForm)
            setShowForm(false)
        } catch (error) {
            setError(error.response?.data?.message || "Could not schedule interview")
        } finally {
            setSaving(false)
        }
    }

    const copyLink = async (item) => {
        try {
            await navigator.clipboard.writeText(roomLink(item.token))
            setCopiedId(item._id)
            setTimeout(() => setCopiedId(null), 1500)
        } catch (error) {
            console.log(error)
        }
    }

    const emailInvite = (item) => {
        const when = new Date(item.scheduledAt).toLocaleString()
        const subject = `Interview invitation: ${item.title}${item.companyName ? ` at ${item.companyName}` : ""}`
        const body = `Hi ${item.candidateName},

You're invited to an interview for ${item.title}${item.companyName ? ` at ${item.companyName}` : ""}.

When: ${when} (${item.durationMin} minutes)
Join here: ${roomLink(item.token)}

Please join from a laptop with a working camera and microphone, using Chrome or Edge.

Best regards,
${userData?.name}`
        window.location.href = `mailto:${item.candidateEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    }

    const cancelInterview = async (item) => {
        if (!window.confirm(`Cancel the interview with ${item.candidateName}? Their link will stop working.`)) return
        try {
            const result = await axios.patch(ServerUrl + `/api/schedule/${item._id}`, { status: "cancelled" }, { withCredentials: true })
            setInterviews(interviews.map(i => i._id === item._id ? result.data : i))
        } catch (error) {
            console.log(error)
        }
    }

    if (!userData) {
        return <Auth />
    }

    return (
        <div className='pb-10'>
            <div className='p-6 lg:p-10 max-w-6xl'>

                <div className='mb-8 flex items-start justify-between gap-4 flex-wrap'>
                    <div className='flex items-start gap-4'>
                        <div>
                            <h1 className='text-3xl font-bold text-gray-800'>Interviews</h1>
                            <p className='text-gray-500 mt-2'>Every live interview in your workspace. Schedule one here, or from a candidate on a job's pipeline.</p>
                        </div>
                    </div>
                    {can(userData, "recruiter") && <button onClick={() => setShowForm(true)} className='flex items-center gap-2 bg-black text-white px-5 py-3 rounded-full shadow-md hover:opacity-90 transition'>
                        <FaPlus size={14} /> Schedule Interview
                    </button>}
                </div>

                <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-8'>
                    {["all", "scheduled", "live", "completed", "cancelled"].map(key => (
                        <button key={key} onClick={() => setFilter(key)}
                            className={`p-4 rounded-2xl text-left border transition ${filter === key ? "bg-black text-white border-black" : "bg-white border-gray-100 shadow-sm hover:shadow-md"}`}>
                            <p className='text-2xl font-bold'>{stats[key]}</p>
                            <p className={`text-sm capitalize ${filter === key ? "text-gray-300" : "text-gray-500"}`}>{key}</p>
                        </button>
                    ))}
                </div>

                {visible.length === 0 ?
                    <div className='bg-white p-10 rounded-2xl shadow text-center text-gray-500'>
                        {interviews.length === 0 ? "No interviews yet. Schedule your first one." : "No interviews with this status."}
                    </div>
                    :
                    <div className='grid gap-4'>
                        {visible.map(item => (
                            <div key={item._id} className='bg-white p-6 rounded-2xl shadow-md border border-gray-100'>
                                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                                    <div>
                                        <div className='flex items-center gap-3 flex-wrap'>
                                            <h3 className='text-lg font-semibold text-gray-800'>{item.candidateName}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[item.status]}`}>{item.status}</span>
                                        </div>
                                        <p className='text-gray-500 text-sm mt-1'>{item.title}{item.companyName && ` • ${item.companyName}`} • {item.candidateEmail}</p>
                                        <p className='text-xs text-gray-400 mt-2'>{new Date(item.scheduledAt).toLocaleString()} • {item.durationMin} min{item.interviewer?.name && ` • interviewer: ${item.interviewer.name}`}</p>
                                    </div>

                                    <div className='flex items-center gap-2 flex-wrap'>
                                        {can(userData, "recruiter") && ["scheduled", "live"].includes(item.status) && <>
                                            <button onClick={() => copyLink(item)} title='Copy candidate link' className='flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm'>
                                                {copiedId === item._id ? <FaCheck className='text-emerald-600' /> : <FaRegCopy />} {copiedId === item._id ? "Copied" : "Link"}
                                            </button>
                                            <button onClick={() => emailInvite(item)} title='Email invite' className='flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm'>
                                                <MdOutlineEmail size={16} /> Invite
                                            </button>
                                            <button onClick={() => navigate(`/room/${item.token}`)} className='flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 text-sm'>
                                                <FaVideo /> Join
                                            </button>
                                            <button onClick={() => cancelInterview(item)} title='Cancel interview' className='p-3 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50'>
                                                <FaTimes />
                                            </button>
                                        </>}
                                        {item.status === "completed" &&
                                            <button onClick={() => navigate(`/company/interviews/${item._id}`)} className='px-4 py-2 rounded-full bg-black text-white text-sm hover:opacity-90'>
                                                View Feedback
                                            </button>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>}
            </div>

            {showForm &&
                <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4'>
                    <motion.form
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleSchedule}
                        className='relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto'>
                        <button type='button' onClick={() => setShowForm(false)} className='absolute top-6 right-6 text-gray-500 hover:text-black'>
                            <FaTimes />
                        </button>
                        <h2 className='text-2xl font-semibold mb-6'>Schedule Interview</h2>

                        <div className='grid gap-4'>
                            <input required placeholder='Role / title (e.g. Frontend Engineer)' value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className='border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                            <input placeholder='Company name' value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} className='border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                            <div className='grid md:grid-cols-2 gap-4'>
                                <input required placeholder='Candidate name' value={form.candidateName} onChange={e => setForm({ ...form, candidateName: e.target.value })} className='border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                                <input required type='email' placeholder='Candidate email' value={form.candidateEmail} onChange={e => setForm({ ...form, candidateEmail: e.target.value })} className='border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                            </div>
                            <div className='grid md:grid-cols-2 gap-4'>
                                <input required type='datetime-local' value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} className='border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                                <select value={form.durationMin} onChange={e => setForm({ ...form, durationMin: Number(e.target.value) })} className='border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black'>
                                    {[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} minutes</option>)}
                                </select>
                            </div>
                            <textarea rows={3} placeholder='Notes for the candidate (topics, round type...)' value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className='border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black resize-none' />
                        </div>

                        {error && <p className='text-red-500 text-sm mt-4'>{error}</p>}

                        <button disabled={saving} className='w-full mt-6 bg-black text-white py-3 rounded-full hover:opacity-90 disabled:opacity-50'>
                            {saving ? "Scheduling..." : "Schedule & Generate Link"}
                        </button>
                    </motion.form>
                </div>}
        </div>
    )
}

export default HiringDashboard
