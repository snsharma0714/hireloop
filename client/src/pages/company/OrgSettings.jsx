import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ServerUrl } from '../../App'
import { setUserData } from '../../redux/userSlice'
import EmailSettings from '../../components/company/EmailSettings'
import { useSearchParams } from 'react-router-dom'

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black'
const formOf = (org) => ({ name: org.name, website: org.website, about: org.about, slug: org.slug, tagline: org.tagline || "", careersEnabled: org.careersEnabled !== false })

function OrgSettings() {
    const dispatch = useDispatch()
    const { userData } = useSelector((state) => state.user)
    const [form, setForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [params, setParams] = useSearchParams()
    const tab = params.get("tab") === "emails" ? "emails" : "workspace"

    useEffect(() => {
        axios.get(ServerUrl + "/api/org", { withCredentials: true })
            .then(r => setForm(formOf(r.data)))
            .catch(() => {})
    }, [])

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value })

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await axios.patch(ServerUrl + "/api/org", form, { withCredentials: true })
            setForm(formOf(res.data))
            dispatch(setUserData({ ...userData, org: { ...userData.org, name: res.data.name, slug: res.data.slug } }))
            toast.success("Workspace saved")
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save")
        } finally {
            setSaving(false)
        }
    }

    if (!form) return <div className='p-10 text-gray-500'>Loading...</div>

    return (
        <div className={`p-6 lg:p-10 ${tab === "emails" ? "max-w-5xl" : "max-w-3xl"}`}>
            <h1 className='text-3xl font-bold text-gray-800'>Workspace settings</h1>
            <div className='flex gap-2 mt-4 mb-8'>
                {[["workspace", "Workspace"], ["emails", "Emails"]].map(([key, label]) => (
                    <button key={key} onClick={() => setParams(key === "emails" ? { tab: "emails" } : {})}
                        className={`text-sm px-4 py-2 rounded-full ${tab === key ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-600"}`}>{label}</button>
                ))}
            </div>
            {tab === "emails"
                ? <EmailSettings orgName={form.name} careersUrl={`${window.location.origin}/careers/${form.slug}`} />
                : <form onSubmit={save} className='bg-white rounded-2xl border border-gray-100 shadow-sm p-7 space-y-5'>
                <div>
                    <label className='block text-sm text-gray-600 mb-1'>Company name</label>
                    <input required value={form.name} onChange={set("name")} className={inputClass} />
                </div>
                <div>
                    <label className='block text-sm text-gray-600 mb-1'>Website</label>
                    <input value={form.website} onChange={set("website")} placeholder='https://' className={inputClass} />
                </div>
                <div>
                    <label className='block text-sm text-gray-600 mb-1'>About the company</label>
                    <textarea rows={5} value={form.about} onChange={set("about")} className={`${inputClass} resize-none`} />
                </div>
                <div className='border-t border-gray-100 pt-5 space-y-4'>
                    <div className='flex items-center justify-between gap-3 flex-wrap'>
                        <p className='font-semibold'>Careers page</p>
                        <label className='flex items-center gap-2 text-sm'>
                            <input type='checkbox' checked={form.careersEnabled} onChange={set("careersEnabled")} className='w-4 h-4 accent-emerald-600' /> Public
                        </label>
                    </div>
                    <p className='text-sm text-gray-500 -mt-2'>A page listing your open jobs that anyone can apply from, no HireLoop account needed. Put it on your website or LinkedIn.</p>
                    <div>
                        <label className='block text-sm text-gray-600 mb-1'>Address</label>
                        <div className='flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-black'>
                            <span className='px-3 text-sm text-gray-400 bg-gray-50 self-stretch flex items-center'>{window.location.host}/careers/</span>
                            <input value={form.slug} onChange={set("slug")} aria-label='Careers page address' className='flex-1 min-w-0 px-3 py-3 outline-none' />
                        </div>
                    </div>
                    <div>
                        <label className='block text-sm text-gray-600 mb-1'>Headline</label>
                        <input value={form.tagline} onChange={set("tagline")} maxLength={160} placeholder={`Work at ${form.name}`} className={inputClass} />
                    </div>
                    {form.careersEnabled && userData?.org?.slug &&
                        <div className='flex gap-2 flex-wrap'>
                            <a href={`/careers/${userData.org.slug}`} target='_blank' rel='noreferrer' className='text-sm px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200'>Open careers page ↗</a>
                            <button type='button' onClick={() => navigator.clipboard.writeText(`${window.location.origin}/careers/${userData.org.slug}`).then(() => toast.success("Link copied"))}
                                className='text-sm px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200'>Copy link</button>
                        </div>}
                </div>
                <div className='flex justify-end'>
                    <button disabled={saving} className='bg-black text-white px-8 py-3 rounded-full disabled:opacity-50'>{saving ? "Saving..." : "Save"}</button>
                </div>
            </form>}
        </div>
    )
}

export default OrgSettings
