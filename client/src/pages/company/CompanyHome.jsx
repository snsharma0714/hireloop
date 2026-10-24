import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { FaBriefcase, FaUsers, FaUserPlus, FaVideo, FaUserCheck } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { stageOf, timeAgo } from '../../components/jobs/jobUtils'
import { can } from '../../components/company/access'
import { kindOf, whenLabel } from '../../components/company/calendarUtils'

function CompanyHome() {
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)
    const [data, setData] = useState(null)

    useEffect(() => {
        axios.get(ServerUrl + "/api/org/overview", { withCredentials: true }).then(r => setData(r.data)).catch(() => setData(null))
    }, [])

    const cards = data ? [
        { icon: <FaBriefcase />, label: "Open jobs", value: data.openJobs, tint: "bg-gray-100 text-gray-700" },
        { icon: <FaUsers />, label: "Applicants", value: data.applicants, tint: "bg-blue-100 text-blue-600" },
        { icon: <FaUserPlus />, label: "New this week", value: data.newThisWeek, tint: "bg-sky-100 text-sky-600" },
        { icon: <FaVideo />, label: "In interview", value: data.inInterview, tint: "bg-purple-100 text-purple-600" },
        { icon: <FaUserCheck />, label: "Hired", value: data.hired, tint: "bg-emerald-100 text-emerald-700" }
    ] : []

    // live-room interviews and team events, soonest first
    const comingUp = data ? [
        ...data.upcoming.map(iv => ({ ...iv, kind: "interview", start: iv.scheduledAt, title: `Interview: ${iv.candidateName}`, sub: `${iv.title} • with ${iv.interviewer?.name}` })),
        ...(data.events || []).map(ev => ({ ...ev, sub: [kindOf(ev).label, ev.candidate?.name].filter(Boolean).join(" • ") }))
    ].sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 6) : []

    return (
        <div className='p-6 lg:p-10 max-w-6xl'>
            <div className='flex items-start justify-between gap-4 flex-wrap mb-8'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-800'>Good to see you, {userData?.name?.split(" ")[0]}</h1>
                    <p className='text-gray-500 mt-1'>Here's what's happening at {userData?.org?.name}.</p>
                </div>
                {can(userData, "recruiter") &&
                    <button onClick={() => navigate("/company/jobs?new=1")} className='bg-black text-white px-5 py-3 rounded-full hover:opacity-90'>Post a job</button>}
            </div>

            <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-10'>
                {cards.map(c => (
                    <div key={c.label} className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
                        <div className={`w-9 h-9 rounded-lg grid place-items-center mb-3 ${c.tint}`}>{c.icon}</div>
                        <p className='text-2xl font-bold'>{c.value}</p>
                        <p className='text-xs text-gray-500'>{c.label}</p>
                    </div>
                ))}
            </div>

            <div className='grid lg:grid-cols-2 gap-6'>
                <section>
                    <div className='flex items-center justify-between mb-3'>
                        <h2 className='font-semibold text-gray-800'>Coming up</h2>
                        <button onClick={() => navigate("/company/calendar")} className='text-xs text-gray-500 hover:text-black'>Open calendar →</button>
                    </div>
                    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100'>
                        {data && comingUp.length === 0 && <p className='p-8 text-center text-sm text-gray-500'>Nothing scheduled.</p>}
                        {comingUp.map(item => (
                            <div key={item._id} className='flex items-center justify-between gap-3 px-5 py-4'>
                                <div className='min-w-0 flex items-start gap-3'>
                                    <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${kindOf(item).dot}`} />
                                    <div className='min-w-0'>
                                        <p className='font-medium text-gray-800 truncate'>{item.title}</p>
                                        <p className='text-xs text-gray-500 truncate'>{whenLabel(item)} • {item.sub}</p>
                                    </div>
                                </div>
                                {item.token && can(userData, "recruiter") &&
                                    <button onClick={() => navigate(`/room/${item.token}`)} className='text-xs px-3 py-1.5 rounded-full bg-emerald-600 text-white shrink-0'>Join</button>}
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className='font-semibold text-gray-800 mb-3'>Latest applicants</h2>
                    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100'>
                        {data?.recent.length === 0 && <p className='p-8 text-center text-sm text-gray-500'>No applications yet.</p>}
                        {data?.recent.map(a => {
                            const st = stageOf(a.status)
                            return (
                                <div key={a._id} onClick={() => a.job && navigate(`/company/jobs/${a.job._id}`)} className='flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50'>
                                    <div className='min-w-0'>
                                        <p className='font-medium text-gray-800 truncate'>{a.candidate?.name}</p>
                                        <p className='text-xs text-gray-500 truncate'>{a.job?.title} • {timeAgo(a.createdAt)}</p>
                                    </div>
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 ${st.style}`}>{st.label}</span>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>
        </div>
    )
}

export default CompanyHome
