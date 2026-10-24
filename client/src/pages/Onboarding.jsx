import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaUserGraduate, FaBuilding, FaCheckCircle } from 'react-icons/fa'
import { BsRobot } from 'react-icons/bs'
import { ServerUrl } from '../App'
import { setUserData } from '../redux/userSlice'
import { homeFor } from '../components/RequireRole'
import Auth from './Auth'

const OPTIONS = [
    {
        role: "student",
        icon: <FaUserGraduate size={22} />,
        title: "I'm a student",
        points: ["Solve DSA problems and sheets", "Practice live with a partner", "AI mock interviews", "Apply to jobs and track applications"]
    },
    {
        role: "company",
        icon: <FaBuilding size={22} />,
        title: "I'm hiring",
        points: ["Post jobs", "Review applicants on a pipeline board", "Run live coding interviews", "Scorecards and AI interview summaries"]
    }
]

function Onboarding() {
    const { userData } = useSelector((state) => state.user)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    // visitors who clicked "Create a free workspace" on the companies page start with Company picked
    const [role, setRole] = useState(() => {
        try {
            const intent = sessionStorage.getItem("iq:intent")
            return ["student", "company"].includes(intent) ? intent : null
        } catch {
            return null
        }
    })
    const [companyName, setCompanyName] = useState("")
    const [companyWebsite, setCompanyWebsite] = useState("")
    const [saving, setSaving] = useState(false)
    const [invites, setInvites] = useState([])

    // someone may already have invited this email to their company workspace
    useEffect(() => {
        if (!userData || userData.role) return
        axios.get(ServerUrl + "/api/org/invites/pending", { withCredentials: true }).then(r => setInvites(r.data)).catch(() => {})
    }, [userData])

    if (!userData) return <Auth />
    if (userData.role) return <Navigate to={homeFor(userData.role)} replace />

    const submit = async () => {
        if (!window.confirm(`Continue as ${role === "student" ? "a student" : "a company"}? This can't be changed later.`)) return
        setSaving(true)
        try {
            const res = await axios.post(ServerUrl + "/api/user/role", { role, companyName, companyWebsite }, { withCredentials: true })
            dispatch(setUserData(res.data))
            toast.success("You're all set!")
            navigate(homeFor(res.data.role), { replace: true })
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save")
            setSaving(false)
        }
    }

    return (
        <div className='min-h-screen bg-[#f3f3f3] flex items-center justify-center px-4 py-12'>
            <div className='w-full max-w-3xl'>
                <div className='flex items-center justify-center gap-3 mb-6'>
                    <div className='bg-black text-white p-2 rounded-lg'><BsRobot size={18} /></div>
                    <h2 className='font-semibold text-lg'>HireLoop.AI</h2>
                </div>
                <h1 className='text-3xl font-semibold text-center'>Welcome{userData?.name ? `, ${userData.name.split(" ")[0]}` : ""}! How will you use HireLoop?</h1>
                <p className='text-gray-500 text-center mt-2 mb-8'>Pick one. Each account is either a student or a company account.</p>

                {invites.length > 0 &&
                    <div className='bg-emerald-50 border border-emerald-100 rounded-3xl p-6 mb-5'>
                        <p className='font-medium mb-3'>You've been invited to a company workspace</p>
                        {invites.map(i => (
                            <div key={i.token} className='flex items-center justify-between gap-3 bg-white rounded-2xl px-4 py-3 mb-2'>
                                <span className='text-sm'>Join <b>{i.orgName}</b> as {i.orgRole}</span>
                                <button onClick={() => navigate(`/invite/${i.token}`)} className='text-sm px-4 py-2 rounded-full bg-black text-white'>Accept</button>
                            </div>
                        ))}
                    </div>}

                <div className='grid md:grid-cols-2 gap-5'>
                    {OPTIONS.map(o => (
                        <button key={o.role} onClick={() => setRole(o.role)}
                            className={`text-left bg-white rounded-3xl p-7 border-2 transition ${role === o.role ? "border-black shadow-xl" : "border-transparent shadow-sm hover:shadow-md"}`}>
                            <div className='flex items-center justify-between mb-4'>
                                <div className='w-12 h-12 rounded-2xl bg-gray-100 grid place-items-center'>{o.icon}</div>
                                {role === o.role && <FaCheckCircle className='text-black' size={20} />}
                            </div>
                            <h3 className='text-xl font-semibold mb-3'>{o.title}</h3>
                            <ul className='space-y-1.5 text-sm text-gray-600'>
                                {o.points.map(p => <li key={p}>• {p}</li>)}
                            </ul>
                        </button>
                    ))}
                </div>

                {role === "company" &&
                    <div className='bg-white rounded-3xl shadow-sm p-7 mt-5 grid md:grid-cols-2 gap-4'>
                        <div>
                            <label className='block text-sm text-gray-600 mb-1'>Company name *</label>
                            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder='Acme Corp'
                                className='w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                        </div>
                        <div>
                            <label className='block text-sm text-gray-600 mb-1'>Website</label>
                            <input value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder='https://acme.com'
                                className='w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                        </div>
                    </div>}

                <button onClick={submit} disabled={!role || saving || (role === "company" && !companyName.trim())}
                    className='w-full mt-6 bg-black text-white py-3.5 rounded-full hover:opacity-90 disabled:opacity-40'>
                    {saving ? "Saving..." : "Continue"}
                </button>
            </div>
        </div>
    )
}

export default Onboarding
