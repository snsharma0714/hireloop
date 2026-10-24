import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { FaArrowLeft, FaCheckCircle, FaRegCircle, FaSearch, FaFire } from 'react-icons/fa'
import { MdOutlineTimelapse } from 'react-icons/md'
import { ServerUrl } from '../App'
import ActivityHeatmap from '../components/practice/ActivityHeatmap'
import { DIFFICULTY_STYLES, VERDICT_STYLES, countByDay, currentStreak } from '../components/practice/practiceUtils'

function StatsPanel({ stats }) {
    const counts = useMemo(() => countByDay(stats.activity), [stats.activity])
    const streak = currentStreak(counts)
    const solved = Object.values(stats.byDifficulty).reduce((n, d) => n + d.solved, 0)
    const total = Object.values(stats.byDifficulty).reduce((n, d) => n + d.total, 0)
    const pct = total ? Math.round((solved / total) * 100) : 0

    return (
        <div className='grid md:grid-cols-3 gap-4 mb-8'>
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-6'>
                <div className='w-24 h-24 rounded-full grid place-items-center shrink-0' style={{ background: `conic-gradient(#059669 ${pct * 3.6}deg, #f3f4f6 0deg)` }}>
                    <div className='w-[78px] h-[78px] rounded-full bg-white grid place-items-center text-center'>
                        <div>
                            <p className='text-xl font-bold leading-none'>{solved}</p>
                            <p className='text-[11px] text-gray-400'>of {total}</p>
                        </div>
                    </div>
                </div>
                <div className='flex-1 space-y-2'>
                    {Object.entries(stats.byDifficulty).map(([d, v]) => (
                        <div key={d}>
                            <div className='flex justify-between text-xs mb-1'>
                                <span className={DIFFICULTY_STYLES[d].split(" ")[0]}>{d}</span>
                                <span className='text-gray-500'>{v.solved}/{v.total}</span>
                            </div>
                            <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                                <div className={`h-full ${d === "Easy" ? "bg-emerald-500" : d === "Medium" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${v.total ? (v.solved / v.total) * 100 : 0}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2'>
                <div className='flex items-center justify-between flex-wrap gap-3 mb-4'>
                    <p className='font-semibold'>Activity</p>
                    <div className='flex items-center gap-4 text-sm'>
                        <span className='flex items-center gap-1.5 text-orange-500'><FaFire /> {streak} day streak</span>
                        <span className='text-gray-500'>{stats.sheetSolved} sheet problems done</span>
                    </div>
                </div>
                <ActivityHeatmap counts={counts} />
            </div>
        </div>
    )
}

function Practice() {
    const { userData } = useSelector((state) => state.user)
    const navigate = useNavigate()
    const [params, setParams] = useSearchParams()
    const tab = params.get("tab") === "sheets" ? "sheets" : "problems"

    const [problems, setProblems] = useState([])
    const [sheets, setSheets] = useState([])
    const [stats, setStats] = useState(null)
    const [search, setSearch] = useState("")
    const [difficulty, setDifficulty] = useState("All")
    const [topic, setTopic] = useState("All")

    useEffect(() => {
        const load = async () => {
            try {
                const [p, s] = await Promise.all([
                    axios.get(ServerUrl + "/api/practice/problems", { withCredentials: true }),
                    axios.get(ServerUrl + "/api/sheets", { withCredentials: true })
                ])
                setProblems(p.data)
                setSheets(s.data)
                if (userData) {
                    const st = await axios.get(ServerUrl + "/api/practice/stats", { withCredentials: true })
                    setStats(st.data)
                } else setStats(null)
            } catch (error) {
                console.log(error)
            }
        }
        load()
    }, [userData])

    const topics = useMemo(() => ["All", ...new Set(problems.flatMap(p => p.topics))].sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b))), [problems])

    const visible = problems.filter(p =>
        (difficulty === "All" || p.difficulty === difficulty) &&
        (topic === "All" || p.topics.includes(topic)) &&
        p.title.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 py-10'>
            <div className='w-[92vw] lg:w-[75vw] mx-auto'>
                <div className='mb-8 flex items-start gap-4'>
                    <button onClick={() => navigate("/")} className='mt-1 p-3 rounded-full bg-white shadow hover:shadow-md transition'>
                        <FaArrowLeft className='text-gray-600' />
                    </button>
                    <div>
                        <h1 className='text-3xl font-bold text-gray-800'>DSA Practice</h1>
                        <p className='text-gray-500 mt-2'>Solve problems in the built-in editor and work through the popular interview sheets</p>
                    </div>
                </div>

                {stats && <StatsPanel stats={stats} />}

                <div className='flex gap-1 mb-6 bg-white rounded-full p-1 w-fit shadow-sm border border-gray-100'>
                    {[["problems", "Problems"], ["sheets", "DSA Sheets"]].map(([key, label]) => (
                        <button key={key} onClick={() => setParams(key === "sheets" ? { tab: "sheets" } : {})}
                            className={`px-5 py-2 rounded-full text-sm ${tab === key ? "bg-black text-white" : "text-gray-600"}`}>{label}</button>
                    ))}
                </div>

                {tab === "problems" && <>
                    <div className='flex flex-wrap gap-3 mb-4'>
                        <div className='flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 flex-1 min-w-[200px]'>
                            <FaSearch className='text-gray-400' size={13} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search problems' className='outline-none text-sm flex-1' />
                        </div>
                        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className='bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none'>
                            {["All", "Easy", "Medium", "Hard"].map(d => <option key={d} value={d}>{d === "All" ? "All difficulties" : d}</option>)}
                        </select>
                        <select value={topic} onChange={e => setTopic(e.target.value)} className='bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none'>
                            {topics.map(t => <option key={t} value={t}>{t === "All" ? "All topics" : t}</option>)}
                        </select>
                    </div>

                    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
                        {visible.length === 0 && <p className='p-10 text-center text-gray-500'>No problems match these filters.</p>}
                        {visible.map((p, i) => (
                            <div key={p.slug} onClick={() => navigate(`/practice/${p.slug}`)}
                                className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 ${i ? "border-t border-gray-100" : ""}`}>
                                <span className='w-5 shrink-0' title={p.status || "Not attempted"}>
                                    {p.status === "solved" ? <FaCheckCircle className='text-emerald-500' /> : p.status === "attempted" ? <MdOutlineTimelapse className='text-amber-500' size={18} /> : <FaRegCircle className='text-gray-200' />}
                                </span>
                                <div className='flex-1 min-w-0'>
                                    <p className='font-medium text-gray-800 truncate'>{p.title}</p>
                                    <p className='text-xs text-gray-400 truncate'>{p.topics.join(" • ")}</p>
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full shrink-0 ${DIFFICULTY_STYLES[p.difficulty]}`}>{p.difficulty}</span>
                            </div>
                        ))}
                    </div>

                    {stats?.recent?.length > 0 &&
                        <div className='mt-8'>
                            <h2 className='font-semibold text-gray-800 mb-3'>Recent submissions</h2>
                            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100'>
                                {stats.recent.map(s => (
                                    <div key={s._id} onClick={() => navigate(`/practice/${s.problemSlug}`)} className='flex items-center justify-between gap-4 px-5 py-3 text-sm cursor-pointer hover:bg-gray-50'>
                                        <span className='text-gray-800 truncate'>{s.title}</span>
                                        <span className='flex items-center gap-4 shrink-0'>
                                            <span className={VERDICT_STYLES[s.verdict]}>{s.verdict}</span>
                                            <span className='text-gray-400 hidden sm:inline'>{new Date(s.createdAt).toLocaleDateString()}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>}
                </>}

                {tab === "sheets" &&
                    <div className='grid md:grid-cols-3 gap-5'>
                        {sheets.map(s => {
                            const pct = s.total ? Math.round((s.solved / s.total) * 100) : 0
                            return (
                                <div key={s.id} onClick={() => navigate(`/sheets/${s.id}`)}
                                    className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-lg transition flex flex-col'>
                                    <h3 className='text-lg font-semibold text-gray-800'>{s.name}</h3>
                                    <p className='text-xs text-gray-400 mb-3'>by {s.author}</p>
                                    <p className='text-sm text-gray-600 flex-1'>{s.description}</p>
                                    <div className='mt-5'>
                                        <div className='flex justify-between text-xs text-gray-500 mb-1.5'>
                                            <span>{s.solved}/{s.total} done • {s.sections} topics</span>
                                            <span>{pct}%</span>
                                        </div>
                                        <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
                                            <div className='h-full bg-emerald-500' style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>}
            </div>
        </div>
    )
}

export default Practice
