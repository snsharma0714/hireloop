import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaVideo } from 'react-icons/fa'
import { ServerUrl } from '../App'
import Navbar from '../components/Navbar'
import { STAGES, stageOf, timeAgo } from '../components/jobs/jobUtils'

// Applied -> Screening -> Interview -> Offer -> Hired, shown as a progress strip
const FLOW = ["applied", "screening", "interview", "offer", "hired"]

function MyApplications() {
    const navigate = useNavigate()
    const [apps, setApps] = useState(null)

    useEffect(() => {
        axios.get(ServerUrl + "/api/jobs/applications/mine", { withCredentials: true })
            .then(r => setApps(r.data))
            .catch(() => setApps([]))
    }, [])

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 pb-10'>
            <Navbar />
            <div className='w-[92vw] lg:w-[70vw] mx-auto mt-10'>
                <h1 className='text-3xl font-bold text-gray-800'>My applications</h1>
                <p className='text-gray-500 mt-2 mb-6'>Track where each application stands.</p>

                {apps?.length === 0 &&
                    <div className='bg-white rounded-2xl p-10 text-center shadow-sm'>
                        <p className='text-gray-500 mb-4'>You haven't applied anywhere yet.</p>
                        <button onClick={() => navigate("/jobs")} className='bg-black text-white px-6 py-2.5 rounded-full'>Browse jobs</button>
                    </div>}

                <div className='space-y-4'>
                    {apps?.map(a => {
                        const stage = stageOf(a.status)
                        const step = FLOW.indexOf(a.status)
                        const iv = a.interview
                        return (
                            <div key={a._id} className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
                                <div className='flex items-start justify-between gap-4 flex-wrap'>
                                    <div className='min-w-0 cursor-pointer' onClick={() => a.job && navigate(`/jobs/${a.job._id}`)}>
                                        <h3 className='font-semibold text-gray-800 text-lg hover:underline'>{a.job?.title || "Job removed"}</h3>
                                        <p className='text-sm text-gray-600'>{a.job?.company?.companyName} • applied {timeAgo(a.createdAt)}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${stage.style}`}>{stage.label}</span>
                                </div>

                                {a.status !== "rejected" &&
                                    <div className='flex gap-1.5 mt-5'>
                                        {FLOW.map((s, i) => (
                                            <div key={s} className='flex-1'>
                                                <div className={`h-1.5 rounded-full ${i <= step ? stageOf(s).bar : "bg-gray-100"}`} />
                                                <p className={`text-[11px] mt-1 ${i <= step ? "text-gray-700" : "text-gray-400"}`}>{STAGES.find(x => x.key === s).label}</p>
                                            </div>
                                        ))}
                                    </div>}

                                {iv && ["scheduled", "live"].includes(iv.status) &&
                                    <div className='mt-5 flex items-center justify-between gap-3 flex-wrap bg-purple-50 border border-purple-100 rounded-xl p-4'>
                                        <p className='text-sm text-purple-800'>Interview on <b>{new Date(iv.scheduledAt).toLocaleString()}</b> ({iv.durationMin} min)</p>
                                        <button onClick={() => navigate(`/room/${iv.token}`)} className='flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-purple-600 text-white'><FaVideo /> Join interview</button>
                                    </div>}
                                {a.shareStats && <p className='text-xs text-gray-400 mt-4'>Your practice record is shared with this company.</p>}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default MyApplications
