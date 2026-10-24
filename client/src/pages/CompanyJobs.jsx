import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaPlus, FaTimes, FaBriefcase, FaUsers, FaVideo, FaUserCheck, FaExternalLinkAlt } from 'react-icons/fa'
import { ServerUrl } from '../App'
import { can } from '../components/company/access'
import { JOB_TYPES, STAGES, timeAgo } from '../components/jobs/jobUtils'
import QuestionsEditor from '../components/jobs/QuestionsEditor'
import { questionsPayload } from '../components/jobs/screeningUtils'

const emptyJob = { title: "", location: "", type: "Full-time", remote: false, experience: "", salary: "", description: "", skills: "", questions: [] }
const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black'

function JobForm({ initial, onClose, onSaved }) {
    const [form, setForm] = useState(initial ? { ...initial, skills: (initial.skills || []).join(", "), questions: initial.questions || [] } : emptyJob)
    const [saving, setSaving] = useState(false)
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value })

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...form, skills: form.skills.split(",").map(s => s.trim()).filter(Boolean), questions: questionsPayload(form.questions) }
            const res = initial
                ? await axios.patch(ServerUrl + `/api/jobs/${initial._id}`, payload, { withCredentials: true })
                : await axios.post(ServerUrl + "/api/jobs", payload, { withCredentials: true })
            toast.success(initial ? "Job updated" : "Job posted")
            onSaved(res.data)
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save job")
            setSaving(false)
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4'>
            <form onSubmit={save} className='relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 max-h-[92vh] overflow-y-auto'>
                <button type='button' onClick={onClose} className='absolute top-6 right-6 text-gray-500 hover:text-black'><FaTimes /></button>
                <h2 className='text-2xl font-semibold mb-6'>{initial ? "Edit job" : "Post a job"}</h2>
                <div className='grid md:grid-cols-2 gap-4'>
                    <input required placeholder='Job title (e.g. Frontend Engineer)' value={form.title} onChange={set("title")} className={`${inputClass} md:col-span-2`} />
                    <select value={form.type} onChange={set("type")} className={inputClass}>
                        {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input placeholder='Location (e.g. Bengaluru)' value={form.location} onChange={set("location")} className={inputClass} />
                    <input placeholder='Experience (e.g. 0-2 years)' value={form.experience} onChange={set("experience")} className={inputClass} />
                    <input placeholder='Salary / stipend (e.g. ₹8-12 LPA)' value={form.salary} onChange={set("salary")} className={inputClass} />
                    <input placeholder='Skills, comma separated' value={form.skills} onChange={set("skills")} className={`${inputClass} md:col-span-2`} />
                    <label className='flex items-center gap-2 text-sm md:col-span-2'>
                        <input type='checkbox' checked={form.remote} onChange={set("remote")} className='w-4 h-4 accent-emerald-600' /> Remote friendly
                    </label>
                    <textarea required rows={8} placeholder='Responsibilities, requirements, interview process...' value={form.description} onChange={set("description")} className={`${inputClass} md:col-span-2 resize-none`} />
                    <div className='md:col-span-2'>
                        <QuestionsEditor value={form.questions} onChange={questions => setForm({ ...form, questions })} />
                    </div>
                </div>
                <button disabled={saving} className='w-full mt-6 bg-black text-white py-3 rounded-full hover:opacity-90 disabled:opacity-50'>
                    {saving ? "Saving..." : initial ? "Save changes" : "Post job"}
                </button>
            </form>
        </div>
    )
}

function CompanyJobs() {
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)
    const [jobs, setJobs] = useState(null)
    const [params] = useSearchParams()
    // "Post a job" on the workspace home links here with ?new=1
    const [editing, setEditing] = useState(params.get("new") ? "new" : null) // null | "new" | job
    const canEdit = can(userData, "recruiter")

    const load = () => axios.get(ServerUrl + "/api/jobs/mine", { withCredentials: true }).then(r => setJobs(r.data)).catch(() => setJobs([]))
    useEffect(() => { load() }, [])

    const toggleStatus = async (job) => {
        try {
            await axios.patch(ServerUrl + `/api/jobs/${job._id}`, { status: job.status === "open" ? "closed" : "open" }, { withCredentials: true })
            toast.success(job.status === "open" ? "Job closed to new applicants" : "Job reopened")
            load()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not update job")
        }
    }

    const total = (key) => (jobs || []).reduce((n, j) => n + (key ? j.counts[key] : Object.values(j.counts).reduce((a, b) => a + b, 0)), 0)

    return (
        <div className='pb-10'>
            <div className='p-6 lg:p-10 max-w-6xl'>
                <div className='flex items-start justify-between gap-4 flex-wrap mb-8'>
                    <div>
                        <h1 className='text-3xl font-bold text-gray-800'>Jobs</h1>
                        <p className='text-gray-500 mt-2'>Post roles, review applicants and move them through your hiring pipeline.</p>
                    </div>
                    <div className='flex gap-2 flex-wrap'>
                        {userData?.org?.slug &&
                            <a href={`/careers/${userData.org.slug}`} target='_blank' rel='noreferrer' className='flex items-center gap-2 bg-white border border-gray-200 px-5 py-3 rounded-full hover:bg-gray-50'>
                                Careers page <FaExternalLinkAlt size={11} />
                            </a>}
                        {canEdit && <button onClick={() => setEditing("new")} className='flex items-center gap-2 bg-black text-white px-5 py-3 rounded-full shadow-md hover:opacity-90'>
                            <FaPlus size={13} /> Post a job
                        </button>}
                    </div>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                    {[
                        { icon: <FaBriefcase />, label: "Open jobs", value: (jobs || []).filter(j => j.status === "open").length, tint: "bg-gray-100 text-gray-700" },
                        { icon: <FaUsers />, label: "Applicants", value: total(), tint: "bg-blue-100 text-blue-600" },
                        { icon: <FaVideo />, label: "In interview", value: total("interview"), tint: "bg-purple-100 text-purple-600" },
                        { icon: <FaUserCheck />, label: "Hired", value: total("hired"), tint: "bg-emerald-100 text-emerald-700" }
                    ].map(c => (
                        <div key={c.label} className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4'>
                            <div className={`w-11 h-11 rounded-xl grid place-items-center ${c.tint}`}>{c.icon}</div>
                            <div><p className='text-2xl font-bold'>{c.value}</p><p className='text-xs text-gray-500'>{c.label}</p></div>
                        </div>
                    ))}
                </div>

                {jobs?.length === 0 &&
                    <div className='bg-white rounded-2xl p-10 text-center text-gray-500 shadow-sm'>No jobs yet. Post your first one to start receiving applications.</div>}

                <div className='space-y-4'>
                    {jobs?.map(j => {
                        const count = Object.values(j.counts).reduce((a, b) => a + b, 0)
                        return (
                            <div key={j._id} className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
                                <div className='flex items-start justify-between gap-4 flex-wrap'>
                                    <div>
                                        <div className='flex items-center gap-3 flex-wrap'>
                                            <h3 className='font-semibold text-lg text-gray-800'>{j.title}</h3>
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full ${j.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>{j.status}</span>
                                        </div>
                                        <p className='text-sm text-gray-500 mt-1'>{j.type}{j.location && ` • ${j.location}`}{j.remote ? " • Remote" : ""} • posted {timeAgo(j.createdAt)}{j.createdBy?.name && ` by ${j.createdBy.name}`}{j.questions?.length > 0 && ` • ${j.questions.length} screening question${j.questions.length > 1 ? "s" : ""}`}</p>
                                    </div>
                                    <div className='flex gap-2 flex-wrap'>
                                        {canEdit && <>
                                            <button onClick={() => setEditing(j)} className='text-sm px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200'>Edit</button>
                                            <button onClick={() => toggleStatus(j)} className='text-sm px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200'>{j.status === "open" ? "Close" : "Reopen"}</button>
                                        </>}
                                        <button onClick={() => navigate(`/company/jobs/${j._id}`)} className='text-sm px-4 py-2 rounded-full bg-black text-white'>Pipeline ({count})</button>
                                    </div>
                                </div>
                                <div className='flex flex-wrap gap-2 mt-4'>
                                    {STAGES.map(s => (
                                        <span key={s.key} className={`text-xs px-2.5 py-1 rounded-full ${s.style}`}>{s.label} {j.counts[s.key]}</span>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {editing && <JobForm initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
        </div>
    )
}

export default CompanyJobs
