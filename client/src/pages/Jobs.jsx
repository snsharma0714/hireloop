import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { FaSearch, FaMapMarkerAlt, FaCheckCircle } from 'react-icons/fa'
import { ServerUrl } from '../App'
import Navbar from '../components/Navbar'
import { JOB_TYPES, timeAgo } from '../components/jobs/jobUtils'

function Jobs() {
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)
    const [jobs, setJobs] = useState([])
    const [q, setQ] = useState("")
    const [type, setType] = useState("")
    const [remote, setRemote] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // small delay so typing in the search box doesn't send a request per keystroke
        const id = setTimeout(async () => {
            try {
                const res = await axios.get(ServerUrl + "/api/jobs", { params: { q, type: type || undefined, remote: remote || undefined }, withCredentials: true })
                setJobs(res.data)
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
            }
        }, 250)
        return () => clearTimeout(id)
    }, [q, type, remote, userData])

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 pb-10'>
            <Navbar />
            <div className='w-[92vw] lg:w-[70vw] mx-auto mt-10'>
                <div className='flex items-end justify-between gap-4 flex-wrap mb-6'>
                    <div>
                        <h1 className='text-3xl font-bold text-gray-800'>Jobs</h1>
                        <p className='text-gray-500 mt-2'>Apply with your resume and, if you choose, your verified practice record.</p>
                    </div>
                    {userData?.role === "student" &&
                        <button onClick={() => navigate("/applications")} className='text-sm px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100 hover:shadow'>My applications</button>}
                </div>

                <div className='flex flex-wrap gap-3 mb-5'>
                    <div className='flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 flex-1 min-w-[220px]'>
                        <FaSearch className='text-gray-400' size={13} />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder='Search role, skill, company or location' className='outline-none text-sm flex-1' />
                    </div>
                    <select value={type} onChange={e => setType(e.target.value)} className='bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none'>
                        <option value=''>All types</option>
                        {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label className='flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm cursor-pointer'>
                        <input type='checkbox' checked={remote} onChange={e => setRemote(e.target.checked)} className='accent-emerald-600' /> Remote only
                    </label>
                </div>

                <div className='space-y-3'>
                    {!loading && jobs.length === 0 &&
                        <div className='bg-white rounded-2xl p-10 text-center text-gray-500 shadow-sm'>No open jobs match your search.</div>}
                    {jobs.map(j => (
                        <div key={j._id} onClick={() => navigate(`/jobs/${j._id}`)}
                            className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-lg transition'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='min-w-0'>
                                    <h3 className='font-semibold text-gray-800 text-lg'>{j.title}</h3>
                                    <p className='text-sm text-gray-600'>{j.company?.companyName}</p>
                                </div>
                                {j.applied
                                    ? <span className='flex items-center gap-1.5 text-xs text-emerald-600 shrink-0'><FaCheckCircle /> Applied</span>
                                    : <span className='text-xs text-gray-400 shrink-0'>{timeAgo(j.createdAt)}</span>}
                            </div>
                            <div className='flex flex-wrap items-center gap-2 mt-3 text-xs'>
                                <span className='px-2.5 py-1 rounded-full bg-gray-100 text-gray-700'>{j.type}</span>
                                {j.remote && <span className='px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700'>Remote</span>}
                                {j.location && <span className='flex items-center gap-1 text-gray-500'><FaMapMarkerAlt size={10} /> {j.location}</span>}
                                {j.salary && <span className='text-gray-500'>• {j.salary}</span>}
                                {j.experience && <span className='text-gray-500'>• {j.experience}</span>}
                            </div>
                            {j.skills?.length > 0 &&
                                <div className='flex flex-wrap gap-1.5 mt-3'>
                                    {j.skills.map(s => <span key={s} className='text-xs px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-600'>{s}</span>)}
                                </div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Jobs
