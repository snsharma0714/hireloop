import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaPlus, FaTimes, FaUsers, FaCode, FaFire, FaCheckCircle, FaBriefcase, FaRobot, FaListUl } from 'react-icons/fa'
import { ServerUrl } from '../App'
import Auth from './Auth'
import Navbar from '../components/Navbar'
import { DIFFICULTY_STYLES, countByDay, currentStreak } from '../components/practice/practiceUtils'

const timeAgo = (date) => {
    const mins = Math.round((Date.now() - new Date(date)) / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins} min ago`
    if (mins < 1440) return `${Math.round(mins / 60)} h ago`
    return new Date(date).toLocaleDateString()
}

function StatCard({ icon, label, value, tint }) {
    return (
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4'>
            <div className={`w-11 h-11 rounded-xl grid place-items-center ${tint}`}>{icon}</div>
            <div>
                <p className='text-2xl font-bold leading-tight'>{value}</p>
                <p className='text-xs text-gray-500'>{label}</p>
            </div>
        </div>
    )
}

function CreateSessionModal({ problems, onClose, onCreated }) {
    const [slug, setSlug] = useState("")
    const [search, setSearch] = useState("")
    const [isPublic, setIsPublic] = useState(true)
    const [saving, setSaving] = useState(false)

    const visible = problems.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))

    const create = async () => {
        setSaving(true)
        try {
            const res = await axios.post(ServerUrl + "/api/schedule/peer", { problemSlug: slug, isPublic }, { withCredentials: true })
            onCreated(res.data)
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not create session")
            setSaving(false)
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4'>
            <div className='relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] flex flex-col'>
                <button onClick={onClose} className='absolute top-6 right-6 text-gray-500 hover:text-black'><FaTimes /></button>
                <h2 className='text-2xl font-semibold mb-1'>Start a practice session</h2>
                <p className='text-sm text-gray-500 mb-5'>Pick a problem, then solve it live with a partner: video, chat and a shared editor.</p>

                <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search problems'
                    className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black mb-3' />
                <div className='flex-1 min-h-0 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-72'>
                    {visible.map(p => (
                        <button key={p.slug} onClick={() => setSlug(p.slug)}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm ${slug === p.slug ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                            <span className='flex items-center gap-2 min-w-0'>
                                {slug === p.slug ? <FaCheckCircle className='text-emerald-600 shrink-0' /> : <span className='w-3.5 shrink-0' />}
                                <span className='truncate'>{p.title}</span>
                            </span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 ${DIFFICULTY_STYLES[p.difficulty]}`}>{p.difficulty}</span>
                        </button>
                    ))}
                </div>

                <label className='flex items-center gap-3 mt-5 text-sm cursor-pointer'>
                    <input type='checkbox' checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className='w-4 h-4 accent-emerald-600' />
                    <span>List on the dashboard so anyone can join <span className='text-gray-400'>(otherwise only people with the link)</span></span>
                </label>

                <button onClick={create} disabled={!slug || saving} className='w-full mt-6 bg-black text-white py-3 rounded-full hover:opacity-90 disabled:opacity-50'>
                    {saving ? "Creating..." : "Create session"}
                </button>
            </div>
        </div>
    )
}

function Dashboard() {
    const { userData } = useSelector((state) => state.user)
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)
    const [problems, setProblems] = useState([])
    const [active, setActive] = useState([])
    const [mine, setMine] = useState([])
    const [showCreate, setShowCreate] = useState(false)

    useEffect(() => {
        if (!userData) return
        const loadSessions = async () => {
            try {
                const [a, m] = await Promise.all([
                    axios.get(ServerUrl + "/api/schedule/peer/active", { withCredentials: true }),
                    axios.get(ServerUrl + "/api/schedule/peer/mine", { withCredentials: true })
                ])
                setActive(a.data)
                setMine(m.data)
            } catch (error) {
                console.log(error)
            }
        }
        const load = async () => {
            try {
                const [s, p] = await Promise.all([
                    axios.get(ServerUrl + "/api/practice/stats", { withCredentials: true }),
                    axios.get(ServerUrl + "/api/practice/problems", { withCredentials: true })
                ])
                setStats(s.data)
                setProblems(p.data)
            } catch (error) {
                console.log(error)
            }
        }
        load()
        loadSessions()
        // keep the open-sessions list fresh
        const id = setInterval(loadSessions, 15000)
        return () => clearInterval(id)
    }, [userData])

    const streak = useMemo(() => currentStreak(countByDay(stats?.activity)), [stats])

    if (!userData) return <Auth />

    const solved = stats ? Object.values(stats.byDifficulty).reduce((n, d) => n + d.solved, 0) : 0
    const completed = mine.filter(s => s.status === "completed").length
    const myId = String(userData._id)
    const joinable = active.filter(s => s.host?._id !== myId)
    const myOpen = mine.filter(s => ["scheduled", "live"].includes(s.status) && s.host?._id === myId)

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 pb-10'>
            <Navbar />
            <div className='w-[92vw] lg:w-[75vw] mx-auto mt-10'>
                <div className='flex items-start justify-between gap-4 flex-wrap mb-8'>
                    <div>
                        <h1 className='text-3xl font-bold text-gray-800'>Welcome back, {userData.name?.split(" ")[0]} 👋</h1>
                        <p className='text-gray-500 mt-2'>Practice solo, pair up with a partner, or run real interviews, all in one place.</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className='flex items-center gap-2 bg-black text-white px-5 py-3 rounded-full shadow-md hover:opacity-90'>
                        <FaPlus size={13} /> Start a session
                    </button>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                    <StatCard icon={<FaCode />} label='Problems solved' value={solved} tint='bg-emerald-100 text-emerald-700' />
                    <StatCard icon={<FaFire />} label='Day streak' value={streak} tint='bg-orange-100 text-orange-600' />
                    <StatCard icon={<FaUsers />} label='Sessions completed' value={completed} tint='bg-blue-100 text-blue-600' />
                    <StatCard icon={<FaListUl />} label='Sheet problems done' value={stats?.sheetSolved ?? 0} tint='bg-purple-100 text-purple-600' />
                </div>

                <div className='grid md:grid-cols-4 gap-4 mb-10'>
                    {[
                        { icon: <FaCode />, title: "Practice problems", text: "LeetCode-style editor with hidden tests", to: "/practice" },
                        { icon: <FaListUl />, title: "DSA sheets", text: "Blind 75, NeetCode 150, Striver SDE", to: "/practice?tab=sheets" },
                        { icon: <FaRobot />, title: "AI mock interview", text: "Answer AI questions, get a report", to: "/interview" },
                        { icon: <FaBriefcase />, title: "Hiring", text: "Schedule interviews with candidates", to: "/hiring" }
                    ].map(a => (
                        <button key={a.title} onClick={() => navigate(a.to)} className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-lg transition'>
                            <div className='text-gray-700 mb-3'>{a.icon}</div>
                            <p className='font-semibold text-gray-800'>{a.title}</p>
                            <p className='text-xs text-gray-500 mt-1'>{a.text}</p>
                        </button>
                    ))}
                </div>

                <div className='grid lg:grid-cols-2 gap-6'>
                    <div>
                        <h2 className='font-semibold text-gray-800 mb-3 flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' /> Open sessions
                        </h2>
                        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100'>
                            {myOpen.map(s => (
                                <div key={s._id} className='flex items-center justify-between gap-3 px-5 py-4'>
                                    <div className='min-w-0'>
                                        <p className='font-medium text-gray-800 truncate'>{s.title} <span className='text-xs text-gray-400 font-normal'>• your session</span></p>
                                        <p className='text-xs text-gray-500'>{s.participant ? `with ${s.participant.name}` : "waiting for a partner"} • {timeAgo(s.createdAt)}</p>
                                    </div>
                                    <button onClick={() => navigate(`/room/${s.token}`)} className='text-sm px-4 py-2 rounded-full bg-black text-white shrink-0'>Rejoin</button>
                                </div>
                            ))}
                            {joinable.map(s => {
                                const full = s.participant && s.participant._id !== myId
                                return (
                                    <div key={s._id} className='flex items-center justify-between gap-3 px-5 py-4'>
                                        <div className='min-w-0'>
                                            <p className='font-medium text-gray-800 truncate'>{s.title}</p>
                                            <p className='text-xs text-gray-500'>
                                                {s.problem && <span className={`px-2 py-0.5 rounded-full mr-2 ${DIFFICULTY_STYLES[s.problem.difficulty]}`}>{s.problem.difficulty}</span>}
                                                hosted by {s.host?.name} • {timeAgo(s.createdAt)}
                                            </p>
                                        </div>
                                        <button disabled={full} onClick={() => navigate(`/room/${s.token}`)}
                                            className='text-sm px-4 py-2 rounded-full bg-emerald-600 text-white shrink-0 disabled:bg-gray-200 disabled:text-gray-500'>
                                            {full ? "Full" : "Join"}
                                        </button>
                                    </div>
                                )
                            })}
                            {myOpen.length + joinable.length === 0 &&
                                <p className='p-8 text-center text-sm text-gray-500'>No open sessions right now. Start one and invite a friend!</p>}
                        </div>
                    </div>

                    <div>
                        <h2 className='font-semibold text-gray-800 mb-3'>Your recent sessions</h2>
                        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100'>
                            {mine.filter(s => s.status === "completed").slice(0, 8).map(s => (
                                <div key={s._id} className='flex items-center justify-between gap-3 px-5 py-4'>
                                    <div className='min-w-0'>
                                        <p className='font-medium text-gray-800 truncate'>{s.title}</p>
                                        <p className='text-xs text-gray-500'>
                                            {s.host?._id === myId ? (s.participant ? `with ${s.participant.name}` : "nobody joined") : `with ${s.host?.name}`} • {timeAgo(s.endedAt || s.createdAt)}
                                        </p>
                                    </div>
                                    {s.problem && <button onClick={() => navigate(`/practice/${s.problem.slug}`)} className='text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 shrink-0'>Practice again</button>}
                                </div>
                            ))}
                            {completed === 0 && <p className='p-8 text-center text-sm text-gray-500'>Sessions you finish show up here.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {showCreate && <CreateSessionModal problems={problems} onClose={() => setShowCreate(false)} onCreated={(s) => navigate(`/room/${s.token}`)} />}
        </div>
    )
}

export default Dashboard
