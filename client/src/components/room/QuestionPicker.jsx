import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaTimes, FaSearch, FaCheck } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { DIFFICULTY_STYLES } from '../practice/practiceUtils'

const TABS = [["problems", "Problems with tests"], ["custom", "Write your own"], ["asked", "Asked so far"]]

// Interviewer only: choose what's on screen. Changes go to both people at once through the room socket.
function QuestionPicker({ socket, current, onClose }) {
    const [tab, setTab] = useState("problems")
    const [problems, setProblems] = useState([])
    const [asked, setAsked] = useState([])
    const [q, setQ] = useState("")
    const [difficulty, setDifficulty] = useState("")
    const [custom, setCustom] = useState({ title: "", description: "" })
    const [fresh, setFresh] = useState(true)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        axios.get(ServerUrl + "/api/practice/problems", { withCredentials: true }).then(r => setProblems(r.data)).catch(() => {})
        socket.emit("get-questions", (ack) => setAsked(ack?.questions || []))
    }, [socket])

    const send = (payload, message) => {
        setBusy(true)
        socket.emit("set-question", { resetCode: fresh, ...payload }, (ack) => {
            setBusy(false)
            if (ack?.error) return toast.error(ack.error)
            toast.success(message)
            onClose()
        })
    }

    const askedSlugs = new Set(asked.filter(a => a.kind === "builtin").map(a => a.slug))
    const needle = q.trim().toLowerCase()
    const shown = problems.filter(p => (!difficulty || p.difficulty === difficulty) &&
        (!needle || p.title.toLowerCase().includes(needle) || p.topics.some(t => t.toLowerCase().includes(needle))))

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4' onClick={onClose}>
            <div onClick={e => e.stopPropagation()} role='dialog' aria-label='Choose a question'
                className='w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[88vh]'>
                <div className='flex items-start justify-between gap-3 p-6 pb-3'>
                    <div>
                        <h2 className='text-xl font-semibold'>Question for the candidate</h2>
                        <p className='text-sm text-gray-500 mt-0.5'>It appears next to the editor for both of you.</p>
                    </div>
                    <button onClick={onClose} aria-label='Close' className='text-gray-500 hover:text-black p-1'><FaTimes /></button>
                </div>

                <div className='flex gap-1 mx-6 bg-gray-100 rounded-full p-1'>
                    {TABS.map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)} className={`flex-1 text-xs sm:text-sm py-1.5 rounded-full ${tab === key ? "bg-white shadow font-medium" : "text-gray-500"}`}>
                            {label}{key === "asked" && asked.length > 0 && ` (${asked.length})`}
                        </button>
                    ))}
                </div>

                <div className='flex-1 min-h-0 overflow-y-auto px-6 py-4'>
                    {tab === "problems" && <>
                        <div className='flex gap-2 mb-3'>
                            <div className='flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3'>
                                <FaSearch className='text-gray-400' size={12} />
                                <input value={q} onChange={e => setQ(e.target.value)} placeholder='Search title or topic' className='flex-1 py-2 text-sm outline-none' />
                            </div>
                            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} aria-label='Difficulty' className='border border-gray-200 rounded-xl px-2 text-sm'>
                                <option value=''>Any level</option>
                                {["Easy", "Medium", "Hard"].map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className='divide-y divide-gray-100'>
                            {shown.map(p => {
                                const onScreen = current?.kind === "builtin" && current.slug === p.slug
                                return (
                                    <div key={p.slug} className='flex items-center justify-between gap-3 py-2.5'>
                                        <div className='min-w-0'>
                                            <p className='text-sm font-medium truncate'>{p.title} {askedSlugs.has(p.slug) && <span className='text-xs text-gray-400 font-normal'>• asked</span>}</p>
                                            <p className='text-xs text-gray-500 truncate'>{p.topics.join(", ")}</p>
                                        </div>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${DIFFICULTY_STYLES[p.difficulty]}`}>{p.difficulty}</span>
                                        {onScreen
                                            ? <span className='flex items-center gap-1 text-xs text-emerald-700 shrink-0 w-16 justify-end'><FaCheck size={10} /> On screen</span>
                                            : <button disabled={busy} onClick={() => send({ slug: p.slug }, `Asked: ${p.title}`)} className='text-xs px-3 py-1.5 rounded-full bg-black text-white shrink-0 w-16 disabled:opacity-50'>Ask</button>}
                                    </div>
                                )
                            })}
                            {problems.length > 0 && shown.length === 0 && <p className='text-sm text-gray-400 py-6 text-center'>No problems match.</p>}
                        </div>
                        <p className='text-xs text-gray-400 mt-3'>The candidate gets Run (examples) and Submit (all hidden tests). Their best Submit is saved to the scorecard.</p>
                    </>}

                    {tab === "custom" &&
                        <form onSubmit={e => { e.preventDefault(); send({ title: custom.title, description: custom.description }, "Question shared") }} className='space-y-3'>
                            <input required value={custom.title} onChange={e => setCustom({ ...custom, title: e.target.value })} placeholder='Title, e.g. Design a rate limiter'
                                className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black' />
                            <textarea rows={9} value={custom.description} onChange={e => setCustom({ ...custom, description: e.target.value })}
                                placeholder={"Describe the problem, add examples and constraints.\n\nExample:\nInput: [2, 7, 11, 15], target = 9\nOutput: [0, 1]"}
                                className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black resize-y font-mono' />
                            <p className='text-xs text-gray-400'>Your own questions have no automatic tests. The candidate can still Run code with custom input.</p>
                            <button disabled={busy || !custom.title.trim()} className='bg-black text-white text-sm px-6 py-2.5 rounded-full disabled:opacity-50'>Share question</button>
                        </form>}

                    {tab === "asked" && <>
                        {asked.length === 0 && <p className='text-sm text-gray-400 py-6 text-center'>Nothing asked yet in this interview.</p>}
                        <div className='divide-y divide-gray-100'>
                            {asked.map(a => (
                                <div key={a.index} className='flex items-center justify-between gap-3 py-2.5'>
                                    <div className='min-w-0'>
                                        <p className='text-sm font-medium truncate'>Q{a.index + 1}. {a.title}</p>
                                        <p className='text-xs text-gray-500'>
                                            {a.kind === "custom" ? "Your question" : a.best ? `Best submit: ${a.best.verdict} • ${a.best.passed}/${a.best.total} tests` : a.submissions ? `${a.submissions} submits` : "Not submitted yet"}
                                        </p>
                                    </div>
                                    {current?.index === a.index
                                        ? <span className='flex items-center gap-1 text-xs text-emerald-700 shrink-0'><FaCheck size={10} /> On screen</span>
                                        : <button disabled={busy} onClick={() => send({ index: a.index }, `Back to: ${a.title}`)} className='text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 shrink-0'>Show again</button>}
                                </div>
                            ))}
                        </div>
                    </>}
                </div>

                <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4'>
                    <label className='flex items-start gap-2 text-sm text-gray-600 max-w-sm'>
                        <input type='checkbox' checked={fresh} onChange={e => setFresh(e.target.checked)} className='mt-0.5 accent-emerald-600' />
                        <span>Start the editor fresh <span className='block text-xs text-gray-400'>The current code is kept with the previous question. Going back to a question restores its code.</span></span>
                    </label>
                    {current && <button disabled={busy} onClick={() => send({ clear: true, resetCode: false }, "Question hidden")} className='text-sm text-gray-500 hover:text-black'>Hide question</button>}
                </div>
            </div>
        </div>
    )
}

export default QuestionPicker
