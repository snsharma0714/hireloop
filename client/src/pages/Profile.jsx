import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ServerUrl } from '../App'
import Navbar from '../components/Navbar'
import Auth from './Auth'
import { setUserData } from '../redux/userSlice'

const Field = ({ label, hint, children }) => (
    <div>
        <label className='block text-sm text-gray-600 mb-1'>{label}</label>
        {children}
        {hint && <p className='text-xs text-gray-400 mt-1'>{hint}</p>}
    </div>
)
const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black'

function ProfileForm({ user }) {
    const dispatch = useDispatch()
    const isCompany = user.role === "company"
    const [form, setForm] = useState({
        name: user.name || "",
        headline: user.headline || "",
        college: user.college || "",
        graduationYear: user.graduationYear || "",
        skills: (user.skills || []).join(", "),
        resumeUrl: user.resumeUrl || "",
        companyName: user.companyName || "",
        companyWebsite: user.companyWebsite || "",
        companyAbout: user.companyAbout || ""
    })
    const [saving, setSaving] = useState(false)
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await axios.patch(ServerUrl + "/api/user/profile", { ...form, skills: form.skills.split(",").map(s => s.trim()).filter(Boolean) }, { withCredentials: true })
            dispatch(setUserData(res.data))
            toast.success("Profile saved")
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save")
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={save} className='bg-white rounded-2xl shadow-sm border border-gray-100 p-7 grid md:grid-cols-2 gap-5'>
            <Field label='Your name'><input value={form.name} onChange={set("name")} className={inputClass} /></Field>
            <Field label='Email'><input value={user.email} disabled className={`${inputClass} bg-gray-50 text-gray-500`} /></Field>

            {isCompany ? <>
                <p className='md:col-span-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-4'>
                    Company name, website and description are shared by your whole team. An admin can change them in <b>Workspace → Settings</b>.
                </p>
            </> : <>
                <div className='md:col-span-2'>
                    <Field label='Headline' hint='e.g. "Final-year CSE student, loves backend and DSA"'><input value={form.headline} onChange={set("headline")} className={inputClass} /></Field>
                </div>
                <Field label='College'><input value={form.college} onChange={set("college")} className={inputClass} /></Field>
                <Field label='Graduation year'><input type='number' min='2000' max='2040' value={form.graduationYear} onChange={set("graduationYear")} className={inputClass} /></Field>
                <div className='md:col-span-2'>
                    <Field label='Skills' hint='Comma separated: React, Node.js, Java, SQL'><input value={form.skills} onChange={set("skills")} className={inputClass} /></Field>
                </div>
                <div className='md:col-span-2'>
                    <Field label='Resume link' hint='Used by default when you apply. Google Drive / Dropbox link with view access.'>
                        <input value={form.resumeUrl} onChange={set("resumeUrl")} placeholder='https://drive.google.com/...' className={inputClass} />
                    </Field>
                </div>
            </>}

            <div className='md:col-span-2 flex justify-end'>
                <button disabled={saving} className='bg-black text-white px-8 py-3 rounded-full hover:opacity-90 disabled:opacity-50'>{saving ? "Saving..." : "Save profile"}</button>
            </div>
        </form>
    )
}

function Profile() {
    const { userData } = useSelector((state) => state.user)
    if (!userData) return <Auth />
    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 pb-10'>
            <Navbar />
            <div className='w-[92vw] lg:w-[60vw] mx-auto mt-10'>
                <h1 className='text-3xl font-bold text-gray-800'>Your profile</h1>
                <p className='text-gray-500 mt-2 mb-6'>{userData.role === "company" ? `Your account in ${userData.org?.name || "your workspace"}.` : "Companies see this when you apply."}</p>
                <ProfileForm key={userData._id} user={userData} />
            </div>
        </div>
    )
}

export default Profile
