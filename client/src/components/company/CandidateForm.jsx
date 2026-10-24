import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaTimes } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { SOURCE_LABELS, splitList } from './candidateUtils'

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-black text-sm'

// Add a candidate to the talent pool, or edit one (pass `initial`)
function CandidateForm({ initial, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: initial?.name || "", email: initial?.email || "", phone: initial?.phone || "",
        headline: initial?.headline || "", location: initial?.location || "", currentCompany: initial?.currentCompany || "",
        skills: (initial?.skills || []).join(", "), tags: (initial?.tags || []).join(", "),
        resumeUrl: initial?.resumeUrl || "", linkedinUrl: initial?.linkedinUrl || "",
        summary: initial?.summary || "", source: initial?.source || "manual"
    })
    const [saving, setSaving] = useState(false)
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...form, skills: splitList(form.skills), tags: splitList(form.tags) }
            const res = initial
                ? await axios.patch(ServerUrl + `/api/candidates/${initial._id}`, payload, { withCredentials: true })
                : await axios.post(ServerUrl + "/api/candidates", payload, { withCredentials: true })
            toast.success(initial ? "Saved" : `${res.data.name} added to the talent pool`)
            onSaved(res.data)
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save")
            setSaving(false)
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4'>
            <form onSubmit={save} className='relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 max-h-[92vh] overflow-y-auto'>
                <button type='button' onClick={onClose} className='absolute top-6 right-6 text-gray-500 hover:text-black'><FaTimes /></button>
                <h2 className='text-2xl font-semibold mb-6'>{initial ? "Edit candidate" : "Add candidate"}</h2>
                <div className='grid md:grid-cols-2 gap-3'>
                    <input required placeholder='Full name *' value={form.name} onChange={set("name")} className={inputClass} />
                    <input type='email' placeholder='Email' value={form.email} onChange={set("email")} className={inputClass} />
                    <input placeholder='Phone' value={form.phone} onChange={set("phone")} className={inputClass} />
                    <input placeholder='Location' value={form.location} onChange={set("location")} className={inputClass} />
                    <input placeholder='Headline (e.g. SDE-2 at Flipkart)' value={form.headline} onChange={set("headline")} className={inputClass} />
                    <input placeholder='Current company' value={form.currentCompany} onChange={set("currentCompany")} className={inputClass} />
                    <input placeholder='Skills, comma separated' value={form.skills} onChange={set("skills")} className={`${inputClass} md:col-span-2`} />
                    <input placeholder='Tags, comma separated (e.g. backend, referral, 2027-grad)' value={form.tags} onChange={set("tags")} className={`${inputClass} md:col-span-2`} />
                    <input placeholder='Resume link (https://...)' value={form.resumeUrl} onChange={set("resumeUrl")} className={inputClass} />
                    <input placeholder='LinkedIn (https://...)' value={form.linkedinUrl} onChange={set("linkedinUrl")} className={inputClass} />
                    <select value={form.source} onChange={set("source")} className={inputClass}>
                        {Object.entries(SOURCE_LABELS).filter(([k]) => k !== "applied" || initial?.source === "applied").map(([k, v]) => <option key={k} value={k}>Source: {v}</option>)}
                    </select>
                    <textarea rows={3} placeholder='Summary / how you found them' value={form.summary} onChange={set("summary")} className={`${inputClass} md:col-span-2 resize-none`} />
                </div>
                <button disabled={saving} className='w-full mt-6 bg-black text-white py-3 rounded-full disabled:opacity-50'>{saving ? "Saving..." : initial ? "Save" : "Add candidate"}</button>
            </form>
        </div>
    )
}

export default CandidateForm
