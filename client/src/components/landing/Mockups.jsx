import React from 'react'
import { FaMicrophone, FaVideo, FaDesktop, FaPhoneSlash, FaPlay } from 'react-icons/fa'

// Small, static previews of real HireLoop screens for the landing pages (names are made up)

const Window = ({ title, dark, children, className = "" }) => (
    <div className={`rounded-2xl overflow-hidden shadow-2xl border ${dark ? "bg-[#1e1e1e] border-gray-800" : "bg-white border-gray-200"} ${className}`}>
        <div className={`flex items-center gap-2 px-4 py-2.5 ${dark ? "bg-[#252526]" : "bg-gray-50 border-b border-gray-100"}`}>
            <span className='w-2.5 h-2.5 rounded-full bg-red-400' /><span className='w-2.5 h-2.5 rounded-full bg-amber-400' /><span className='w-2.5 h-2.5 rounded-full bg-emerald-400' />
            <span className={`ml-2 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{title}</span>
        </div>
        {children}
    </div>
)

const Avatar = ({ name, className = "" }) => (
    <span className={`grid place-items-center rounded-full text-white font-semibold ${className}`}>{name.split(" ").map(w => w[0]).join("")}</span>
)

export function CodeMock() {
    const k = "text-[#c586c0]", f = "text-[#dcdcaa]", v = "text-[#9cdcfe]", n = "text-[#b5cea8]", c = "text-[#6a9955]"
    const lines = [
        <><span className={c}>// Two Sum: one pass with a hash map</span></>,
        <><span className={k}>function</span> <span className={f}>twoSum</span>(<span className={v}>nums</span>, <span className={v}>target</span>) {"{"}</>,
        <>{"  "}<span className={k}>const</span> <span className={v}>seen</span> = <span className={k}>new</span> <span className={f}>Map</span>()</>,
        <>{"  "}<span className={k}>for</span> (<span className={k}>let</span> <span className={v}>i</span> = <span className={n}>0</span>; <span className={v}>i</span> {"<"} <span className={v}>nums</span>.length; <span className={v}>i</span>++) {"{"}</>,
        <>{"    "}<span className={k}>const</span> <span className={v}>need</span> = <span className={v}>target</span> - <span className={v}>nums</span>[<span className={v}>i</span>]</>,
        <>{"    "}<span className={k}>if</span> (<span className={v}>seen</span>.<span className={f}>has</span>(<span className={v}>need</span>)) <span className={k}>return</span> [<span className={v}>seen</span>.<span className={f}>get</span>(<span className={v}>need</span>), <span className={v}>i</span>]</>,
        <>{"    "}<span className={v}>seen</span>.<span className={f}>set</span>(<span className={v}>nums</span>[<span className={v}>i</span>], <span className={v}>i</span>)</>,
        <>{"  }"}</>,
        <>{"}"}</>
    ]
    return (
        <Window title='two-sum.js' dark>
            <div className='flex items-center justify-between px-4 py-2 border-b border-white/5'>
                <span className='text-xs text-gray-300 bg-white/5 px-2.5 py-1 rounded-md'>JavaScript ▾</span>
                <span className='flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1 rounded-md'><FaPlay size={8} /> Submit</span>
            </div>
            <pre className='px-4 py-3 text-[12px] sm:text-[13px] leading-6 font-mono text-gray-200 overflow-hidden'>
                {lines.map((l, i) => <div key={i} className='whitespace-pre'><span className='inline-block w-6 text-gray-600 select-none'>{i + 1}</span>{l}</div>)}
            </pre>
            <div className='border-t border-white/5 px-4 py-3 font-mono text-[12px]'>
                <p className='text-emerald-400'>Accepted • 52/52 tests • 48 ms</p>
                <p className='text-gray-500 mt-1'>Beats your last attempt by 31 ms</p>
            </div>
        </Window>
    )
}

export function SheetsMock() {
    const sheets = [
        { name: "Striver's SDE Sheet", total: 183, done: 74, bar: "bg-emerald-500" },
        { name: "NeetCode 150", total: 150, done: 61, bar: "bg-sky-500" },
        { name: "Blind 75", total: 75, done: 48, bar: "bg-violet-500" }
    ]
    return (
        <Window title='DSA sheets'>
            <div className='p-5 space-y-4'>
                {sheets.map(s => (
                    <div key={s.name}>
                        <div className='flex justify-between text-sm'><span className='font-medium'>{s.name}</span><span className='text-gray-500'>{s.done}/{s.total}</span></div>
                        <div className='h-2.5 bg-gray-100 rounded-full mt-2 overflow-hidden'><div className={`h-full rounded-full ${s.bar}`} style={{ width: `${(s.done / s.total) * 100}%` }} /></div>
                    </div>
                ))}
                <div className='border-t border-gray-100 pt-4 space-y-2 text-sm'>
                    {[["Arrays", "Container With Most Water", "Medium", true], ["Graphs", "Number of Islands", "Medium", false], ["DP", "Coin Change", "Medium", false]].map(([topic, title, d, done]) => (
                        <div key={title} className='flex items-center gap-3'>
                            <span className={`w-4 h-4 rounded border grid place-items-center text-[10px] ${done ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"}`}>{done && "✓"}</span>
                            <span className='flex-1 truncate'>{title}</span>
                            <span className='text-xs text-gray-400 hidden sm:inline'>{topic}</span>
                            <span className='text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700'>{d}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Window>
    )
}

export function AiMock() {
    return (
        <Window title='AI mock interview • Frontend Developer'>
            <div className='p-5 space-y-4'>
                <div className='flex gap-3'>
                    <Avatar name='A I' className='w-9 h-9 shrink-0 bg-linear-to-br from-emerald-500 to-teal-600 text-xs' />
                    <p className='text-sm bg-gray-50 rounded-2xl rounded-tl-sm p-3'>In your resume you built a chat app with React. How did you keep the message list fast once it had thousands of messages?</p>
                </div>
                <div className='flex items-center gap-3 bg-emerald-50 rounded-2xl p-3'>
                    <span className='w-8 h-8 rounded-full bg-emerald-600 text-white grid place-items-center'><FaMicrophone size={12} /></span>
                    <span className='flex items-end gap-0.5 h-6'>{[3, 5, 8, 4, 9, 6, 3, 7, 5, 8, 4, 6, 9, 5, 3].map((h, i) => <span key={i} className='w-1 bg-emerald-500 rounded-full' style={{ height: `${h * 2.5}px` }} />)}</span>
                    <span className='text-xs text-emerald-700 ml-auto'>Listening • 0:42</span>
                </div>
                <div className='grid grid-cols-3 gap-2 text-center'>
                    {[["Confidence", 7.5], ["Communication", 8], ["Correctness", 6.5]].map(([l, s]) => (
                        <div key={l} className='bg-gray-50 rounded-xl p-3'><p className='text-lg font-bold'>{s}<span className='text-xs text-gray-400'>/10</span></p><p className='text-[11px] text-gray-500'>{l}</p></div>
                    ))}
                </div>
            </div>
        </Window>
    )
}

export function RecordMock({ company = "Acme Labs" }) {
    return (
        <Window title={`Apply to ${company}`}>
            <div className='p-5'>
                <p className='font-semibold'>Backend Engineer Intern</p>
                <p className='text-xs text-gray-500'>{company} • Bengaluru • Internship</p>
                <div className='mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100'>
                    <p className='text-sm font-medium flex items-center gap-2'><span className='w-4 h-4 rounded bg-emerald-600 text-white text-[10px] grid place-items-center'>✓</span> Share my practice record</p>
                    <div className='grid grid-cols-4 gap-2 mt-3 text-center'>
                        {[["86", "solved"], ["🔥 12", "day streak"], ["74", "sheet"], ["5", "mocks"]].map(([v, l]) => (
                            <div key={l} className='bg-white rounded-xl py-2'><p className='font-bold text-sm'>{v}</p><p className='text-[10px] text-gray-500'>{l}</p></div>
                        ))}
                    </div>
                    <p className='text-[11px] text-gray-500 mt-3'>Only if you tick the box. Your code is never shared.</p>
                </div>
                <div className='mt-4 bg-black text-white text-sm text-center py-2.5 rounded-full'>Submit application</div>
            </div>
        </Window>
    )
}

export function PipelineMock() {
    const cols = [
        { name: "Applied", style: "bg-gray-100 text-gray-700", cards: [["Riya Sharma", "86 solved", "✓ screening"], ["Dev Patel", "Careers page", null]] },
        { name: "Screening", style: "bg-blue-100 text-blue-700", cards: [["Arjun Mehta", "🔥 21 streak", "✓ screening"]] },
        { name: "Interview", style: "bg-purple-100 text-purple-700", cards: [["Sana Khan", "interview today", null], ["Kabir Rao", "Referral", null]] },
        { name: "Offer", style: "bg-amber-100 text-amber-700", cards: [["Neha Iyer", "strong hire", null]] }
    ]
    return (
        <Window title='Pipeline • Backend Engineer'>
            <div className='p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/60'>
                {cols.map(c => (
                    <div key={c.name} className='min-w-0'>
                        <div className='flex items-center justify-between mb-2'>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.style}`}>{c.name}</span>
                            <span className='text-[11px] text-gray-400'>{c.cards.length}</span>
                        </div>
                        <div className='space-y-2'>
                            {c.cards.map(([name, chip, badge]) => (
                                <div key={name} className='bg-white rounded-xl border border-gray-100 shadow-sm p-2.5'>
                                    <p className='text-xs font-medium truncate'>{name}</p>
                                    <div className='flex flex-wrap gap-1 mt-1.5'>
                                        <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 truncate max-w-full'>{chip}</span>
                                        {badge && <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600'>{badge}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Window>
    )
}

export function RoomMock() {
    return (
        <Window title='Live interview • SDE Intern' dark>
            <div className='grid grid-cols-5 gap-3 p-3'>
                <div className='col-span-3 bg-black/30 rounded-xl p-3 font-mono text-[11px] leading-5 text-gray-300'>
                    <p><span className='text-[#c586c0]'>def</span> <span className='text-[#dcdcaa]'>max_profit</span>(prices):</p>
                    <p>{"    "}low, best = prices[0], 0</p>
                    <p>{"    "}<span className='text-[#c586c0]'>for</span> p <span className='text-[#c586c0]'>in</span> prices:</p>
                    <p>{"        "}low = min(low, p)</p>
                    <p>{"        "}best = max(best, p - low)</p>
                    <p>{"    "}<span className='text-[#c586c0]'>return</span> best<span className='inline-block w-1.5 h-3.5 bg-emerald-400 align-middle ml-0.5 animate-pulse' /></p>
                    <p className='text-emerald-400 mt-3'>Accepted • 40/40 tests</p>
                </div>
                <div className='col-span-2 space-y-2'>
                    <div className='relative aspect-video rounded-xl bg-linear-to-br from-slate-700 to-slate-900 grid place-items-center'>
                        <Avatar name='Riya Sharma' className='w-10 h-10 bg-linear-to-br from-pink-500 to-orange-400 text-sm' />
                        <span className='absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 rounded'>Riya (candidate)</span>
                    </div>
                    <div className='relative aspect-video rounded-xl bg-linear-to-br from-slate-700 to-slate-900 grid place-items-center'>
                        <Avatar name='You' className='w-10 h-10 bg-linear-to-br from-violet-500 to-indigo-500 text-sm' />
                        <span className='absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 rounded'>You</span>
                    </div>
                    <div className='flex justify-center gap-1.5 pt-1'>
                        {[FaMicrophone, FaVideo, FaDesktop].map((I, i) => <span key={i} className='w-7 h-7 rounded-full bg-white/10 text-gray-200 grid place-items-center'><I size={10} /></span>)}
                        <span className='w-7 h-7 rounded-full bg-red-500 text-white grid place-items-center'><FaPhoneSlash size={10} /></span>
                    </div>
                </div>
            </div>
            <div className='mx-3 mb-3 text-[11px] text-amber-300 bg-amber-500/10 rounded-lg px-3 py-1.5'>⚠ Candidate switched tabs at 12:41</div>
        </Window>
    )
}

export function FunnelMock() {
    const rows = [["Applied", 120, "bg-gray-400"], ["Screening", 64, "bg-blue-500"], ["Interview", 28, "bg-purple-500"], ["Offer", 9, "bg-amber-500"], ["Hired", 7, "bg-emerald-500"]]
    return (
        <Window title='Reports • last 90 days'>
            <div className='p-5'>
                <div className='grid grid-cols-3 gap-2 mb-5 text-center'>
                    {[["120", "applications"], ["18 days", "avg. time to hire"], ["Referral", "best source"]].map(([v, l]) => (
                        <div key={l} className='bg-gray-50 rounded-xl p-2.5'><p className='font-bold text-sm'>{v}</p><p className='text-[10px] text-gray-500'>{l}</p></div>
                    ))}
                </div>
                <div className='space-y-2.5'>
                    {rows.map(([l, n, bar]) => (
                        <div key={l}>
                            <div className='flex justify-between text-xs mb-1'><span>{l}</span><span className='text-gray-500'>{n}</span></div>
                            <div className='h-2.5 bg-gray-100 rounded-full overflow-hidden'><div className={`h-full rounded-full ${bar}`} style={{ width: `${(n / 120) * 100}%` }} /></div>
                        </div>
                    ))}
                </div>
            </div>
        </Window>
    )
}

export function CareersMock() {
    return (
        <Window title='yourcompany • careers'>
            <div className='p-5'>
                <p className='text-xs text-emerald-700 font-medium'>Careers</p>
                <p className='text-xl font-bold mt-0.5'>Build the future with us</p>
                <div className='mt-4 space-y-2'>
                    {[["Backend Engineer", "Full-time • Bengaluru"], ["Frontend Intern", "Internship • Remote"]].map(([t, m]) => (
                        <div key={t} className='flex items-center justify-between border border-gray-100 rounded-xl p-3'>
                            <div><p className='text-sm font-medium'>{t}</p><p className='text-[11px] text-gray-500'>{m}</p></div>
                            <span className='text-[11px] px-3 py-1 rounded-full bg-black text-white'>Apply</span>
                        </div>
                    ))}
                </div>
                <div className='mt-4 bg-gray-50 rounded-xl p-3'>
                    <p className='text-xs text-gray-600'>Can you join within 30 days? *</p>
                    <div className='flex gap-2 mt-2'><span className='text-xs px-3 py-1 rounded-full bg-black text-white'>Yes</span><span className='text-xs px-3 py-1 rounded-full border border-gray-200'>No</span></div>
                </div>
            </div>
        </Window>
    )
}

export function CalendarMock() {
    const items = [["10:00", "Interview: Riya Sharma", "bg-purple-100 text-purple-800"], ["12:30", "Phone screen: Dev Patel", "bg-emerald-100 text-emerald-800"], ["16:00", "Hiring debrief", "bg-blue-100 text-blue-800"]]
    return (
        <Window title='Calendar • Today'>
            <div className='p-5 space-y-2'>
                {items.map(([t, l, s]) => (
                    <div key={l} className='flex items-center gap-3'>
                        <span className='text-xs text-gray-500 w-12'>{t}</span>
                        <span className={`flex-1 text-xs rounded-lg px-3 py-2 ${s}`}>{l}</span>
                    </div>
                ))}
                <p className='text-[11px] text-gray-400 pt-2'>📧 Invite with room link sent to riya@example.com</p>
            </div>
        </Window>
    )
}
