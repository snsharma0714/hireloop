import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { FaArrowLeft, FaChevronDown, FaExternalLinkAlt, FaSearch, FaStar, FaRegStar, FaCode } from 'react-icons/fa'
import { ServerUrl } from '../App'
import AuthModel from '../components/AuthModel'
import { DIFFICULTY_STYLES, storage } from '../components/practice/practiceUtils'

function SheetPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)
    const [sheet, setSheet] = useState(null)
    const [progress, setProgress] = useState({})
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [difficulty, setDifficulty] = useState("All")
    const [status, setStatus] = useState("all")
    const [collapsed, setCollapsed] = useState(() => {
        try { return JSON.parse(storage.get(`iq:sheet:${id}:collapsed`) || "{}") } catch { return {} }
    })
    const [showAuth, setShowAuth] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get(ServerUrl + `/api/sheets/${id}`, { withCredentials: true })
                setSheet(res.data)
                setProgress(res.data.progress)
            } catch (error) {
                setError(error.response?.data?.message || "Could not load sheet")
            }
        }
        load()
    }, [id, userData])

    const toggleSection = (title) => {
        const next = { ...collapsed, [title]: !collapsed[title] }
        setCollapsed(next)
        storage.set(`iq:sheet:${id}:collapsed`, JSON.stringify(next))
    }

    // Optimistic update, rolled back if the save fails
    const update = async (key, patch) => {
        if (!userData) return setShowAuth(true)
        const before = progress[key]
        setProgress(p => ({ ...p, [key]: { ...p[key], ...patch } }))
        try {
            await axios.put(ServerUrl + `/api/sheets/progress/${key}`, patch, { withCredentials: true })
        } catch (error) {
            console.log(error)
            setProgress(p => ({ ...p, [key]: before }))
        }
    }

    if (error) return <div className='min-h-screen flex items-center justify-center text-gray-500'>{error}</div>
    if (!sheet) return <div className='min-h-screen flex items-center justify-center text-gray-500'>Loading...</div>

    const builtIn = new Set(sheet.builtIn)
    const solvedCount = sheet.sections.reduce((n, s) => n + s.problems.filter(p => progress[p.key]?.solved).length, 0)
    const pct = Math.round((solvedCount / sheet.total) * 100)
    const byDifficulty = ["Easy", "Medium", "Hard"].map(d => {
        const all = sheet.sections.flatMap(s => s.problems).filter(p => p.difficulty === d)
        return { d, total: all.length, solved: all.filter(p => progress[p.key]?.solved).length }
    })

    const matches = (p) =>
        (difficulty === "All" || p.difficulty === difficulty) &&
        (status === "all" ||
            (status === "solved" && progress[p.key]?.solved) ||
            (status === "unsolved" && !progress[p.key]?.solved) ||
            (status === "revisit" && progress[p.key]?.revisit)) &&
        p.title.toLowerCase().includes(search.toLowerCase())

    const filtering = search || difficulty !== "All" || status !== "all"

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 py-10'>
            <div className='w-[92vw] lg:w-[70vw] mx-auto'>
                <div className='mb-6 flex items-start gap-4'>
                    <button onClick={() => navigate("/practice?tab=sheets")} className='mt-1 p-3 rounded-full bg-white shadow hover:shadow-md transition'>
                        <FaArrowLeft className='text-gray-600' />
                    </button>
                    <div className='flex-1'>
                        <h1 className='text-3xl font-bold text-gray-800'>{sheet.name}</h1>
                        <p className='text-gray-500 mt-2'>{sheet.description}</p>
                        <p className='text-xs text-gray-400 mt-2'>
                            Curated by {sheet.author} •{" "}
                            <a href={sheet.sourceUrl} target='_blank' rel='noreferrer' className='underline inline-flex items-center gap-1'>Original sheet <FaExternalLinkAlt size={9} /></a>
                        </p>
                    </div>
                </div>

                <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6'>
                    <div className='flex items-end justify-between flex-wrap gap-4 mb-3'>
                        <div>
                            <p className='text-3xl font-bold'>{solvedCount}<span className='text-lg text-gray-400 font-normal'> / {sheet.total}</span></p>
                            <p className='text-sm text-gray-500'>problems done</p>
                        </div>
                        <div className='flex gap-5 text-sm'>
                            {byDifficulty.map(x => (
                                <div key={x.d} className='text-right'>
                                    <p className={DIFFICULTY_STYLES[x.d].split(" ")[0]}>{x.d}</p>
                                    <p className='text-gray-600'>{x.solved}/{x.total}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className='h-2.5 bg-gray-100 rounded-full overflow-hidden'>
                        <div className='h-full bg-emerald-500 transition-all' style={{ width: `${pct}%` }} />
                    </div>
                    {!userData && <p className='text-xs text-gray-500 mt-3'>Log in to save your progress.</p>}
                </div>

                <div className='flex flex-wrap gap-3 mb-5'>
                    <div className='flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 flex-1 min-w-[200px]'>
                        <FaSearch className='text-gray-400' size={13} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search this sheet' className='outline-none text-sm flex-1' />
                    </div>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className='bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none'>
                        {["All", "Easy", "Medium", "Hard"].map(d => <option key={d} value={d}>{d === "All" ? "All difficulties" : d}</option>)}
                    </select>
                    <select value={status} onChange={e => setStatus(e.target.value)} className='bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none'>
                        <option value='all'>All problems</option>
                        <option value='unsolved'>Not done</option>
                        <option value='solved'>Done</option>
                        <option value='revisit'>Marked for revision</option>
                    </select>
                </div>

                <div className='space-y-4'>
                    {sheet.sections.map(section => {
                        const rows = section.problems.filter(matches)
                        if (filtering && rows.length === 0) return null
                        const done = section.problems.filter(p => progress[p.key]?.solved).length
                        const open = filtering || !collapsed[section.title]
                        return (
                            <div key={section.title} className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
                                <button onClick={() => toggleSection(section.title)} className='w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50'>
                                    <FaChevronDown className={`text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`} size={12} />
                                    <span className='font-semibold text-gray-800 flex-1'>{section.title}</span>
                                    <span className='text-xs text-gray-500'>{done}/{section.problems.length}</span>
                                    <div className='w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block'>
                                        <div className='h-full bg-emerald-500' style={{ width: `${(done / section.problems.length) * 100}%` }} />
                                    </div>
                                </button>
                                {open && rows.map(p => {
                                    const state = progress[p.key] || {}
                                    return (
                                        <div key={p.key} className='flex items-center gap-3 px-5 py-3 border-t border-gray-100'>
                                            <input type='checkbox' checked={!!state.solved} onChange={e => update(p.key, { solved: e.target.checked })}
                                                className='w-4 h-4 accent-emerald-600 cursor-pointer shrink-0' aria-label={`Mark ${p.title} done`} />
                                            <a href={p.url} target='_blank' rel='noreferrer'
                                                className={`flex-1 min-w-0 text-sm truncate hover:underline ${state.solved ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                                {p.title}
                                            </a>
                                            {builtIn.has(p.key) &&
                                                <button onClick={() => navigate(`/practice/${p.key}`)} title='Solve in the built-in editor'
                                                    className='flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-black text-white shrink-0'>
                                                    <FaCode size={10} /> Solve here
                                                </button>}
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 hidden sm:inline ${DIFFICULTY_STYLES[p.difficulty]}`}>{p.difficulty}</span>
                                            <a href={p.url} target='_blank' rel='noreferrer' title={`Open on ${p.platform}`} className='text-gray-400 hover:text-black shrink-0'>
                                                <FaExternalLinkAlt size={11} />
                                            </a>
                                            <button onClick={() => update(p.key, { revisit: !state.revisit })} title='Mark for revision' className='shrink-0'>
                                                {state.revisit ? <FaStar className='text-yellow-400' /> : <FaRegStar className='text-gray-300 hover:text-gray-500' />}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>

            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </div>
    )
}

export default SheetPage
