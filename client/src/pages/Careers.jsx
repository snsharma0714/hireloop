import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { FaMapMarkerAlt, FaSearch } from 'react-icons/fa'
import { ServerUrl } from '../App'
import { JOB_TYPES, jobMeta, timeAgo } from '../components/jobs/jobUtils'
import CareersShell from '../components/careers/CareersShell'

function Careers() {
    const { slug } = useParams()
    const [data, setData] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [type, setType] = useState("")

    useEffect(() => {
        axios.get(ServerUrl + `/api/careers/${slug}`)
            .then(r => { setData(r.data); document.title = `Careers at ${r.data.org.name}` })
            .catch(e => setError(e.response?.data?.message || "Could not load this page"))
    }, [slug])

    if (error) return <div className='min-h-screen grid place-items-center text-gray-500 px-4 text-center'>{error}</div>
    if (!data) return <div className='min-h-screen grid place-items-center text-gray-500'>Loading...</div>

    const { org, jobs } = data
    const needle = q.trim().toLowerCase()
    const shown = jobs.filter(j =>
        (!type || j.type === type) &&
        (!needle || [j.title, j.location, ...j.skills].some(t => t?.toLowerCase().includes(needle))))

    return (
        <CareersShell org={org}>
            <section className='bg-white border-b border-gray-200'>
                <div className='max-w-5xl mx-auto px-4 py-12'>
                    <p className='text-sm text-emerald-700 font-medium'>Careers</p>
                    <h1 className='text-3xl md:text-4xl font-bold text-gray-900 mt-1'>{org.tagline || `Work at ${org.name}`}</h1>
                    {org.about && <p className='text-gray-600 mt-4 max-w-3xl whitespace-pre-wrap leading-relaxed'>{org.about}</p>}
                </div>
            </section>

            <section className='max-w-5xl mx-auto px-4 py-8'>
                <div className='flex flex-col sm:flex-row gap-3 mb-5'>
                    <div className='flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4'>
                        <FaSearch className='text-gray-400' size={13} />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder='Search roles, skills or locations' className='flex-1 py-3 outline-none bg-transparent' />
                    </div>
                    <select value={type} onChange={e => setType(e.target.value)} aria-label='Job type' className='bg-white border border-gray-200 rounded-xl px-3 py-3'>
                        <option value=''>All types</option>
                        {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <p className='text-sm text-gray-500 mb-3'>{shown.length} open {shown.length === 1 ? "role" : "roles"}</p>
                {jobs.length === 0 && <div className='bg-white rounded-2xl p-10 text-center text-gray-500'>No open roles right now. Check back soon.</div>}
                <div className='space-y-3'>
                    {shown.map(j => (
                        <Link key={j._id} to={`/careers/${org.slug}/${j._id}`} className='block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='min-w-0'>
                                    <h2 className='font-semibold text-lg text-gray-800'>{j.title}</h2>
                                    <p className='text-sm text-gray-500 mt-0.5 flex items-center gap-1.5'>{j.location && <FaMapMarkerAlt size={11} />}{jobMeta(j)}</p>
                                </div>
                                <span className='text-xs text-gray-400 shrink-0'>{timeAgo(j.createdAt)}</span>
                            </div>
                            {j.skills?.length > 0 &&
                                <div className='flex flex-wrap gap-1.5 mt-3'>
                                    {j.skills.slice(0, 6).map(s => <span key={s} className='text-xs px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-600'>{s}</span>)}
                                </div>}
                        </Link>
                    ))}
                </div>
            </section>
        </CareersShell>
    )
}

export default Careers
