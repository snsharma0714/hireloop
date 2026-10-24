import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaRegCopy, FaTimes } from 'react-icons/fa'
import { MdOutlineEmail } from 'react-icons/md'
import { ServerUrl } from '../../App'
import { ROLE_INFO, can } from '../../components/company/access'
import { timeAgo } from '../../components/jobs/jobUtils'

const inviteLink = (token) => `${window.location.origin}/invite/${token}`

function Team() {
    const { userData } = useSelector((state) => state.user)
    const isAdmin = can(userData, "admin")
    const [team, setTeam] = useState(null)
    const [email, setEmail] = useState("")
    const [orgRole, setOrgRole] = useState("recruiter")
    const [busy, setBusy] = useState(false)

    const load = () => axios.get(ServerUrl + "/api/org/team", { withCredentials: true }).then(r => setTeam(r.data)).catch(() => {})
    useEffect(() => { load() }, [])

    const act = async (fn, okMessage) => {
        setBusy(true)
        try {
            await fn()
            if (okMessage) toast.success(okMessage)
            await load()
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong")
        } finally {
            setBusy(false)
        }
    }

    const invite = (e) => {
        e.preventDefault()
        act(async () => {
            const res = await axios.post(ServerUrl + "/api/org/invites", { email, orgRole }, { withCredentials: true })
            await navigator.clipboard.writeText(inviteLink(res.data.token)).catch(() => {})
            setEmail("")
            // the server emails the link when email is set up; otherwise it's on the clipboard
            toast.success(res.data.emailStatus === "sent"
                ? `Invite emailed to ${res.data.email} (link also copied)`
                : "Invite created and link copied. Send it to your teammate.")
        })
    }

    const emailInvite = (inv) => {
        const subject = `Join ${userData?.org?.name} on HireLoop`
        const body = `Hi,\n\n${userData?.name} invited you to join ${userData?.org?.name} on HireLoop as ${ROLE_INFO[inv.orgRole].label}.\n\nAccept here (log in with ${inv.email}):\n${inviteLink(inv.token)}\n\nThe link expires on ${new Date(inv.expiresAt).toLocaleDateString()}.`
        window.location.href = `mailto:${inv.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    }

    return (
        <div className='p-6 lg:p-10 max-w-4xl'>
            <h1 className='text-3xl font-bold text-gray-800'>Team</h1>
            <p className='text-gray-500 mt-1 mb-8'>Everyone here shares {userData?.org?.name}'s jobs, candidates and interviews.</p>

            <div className='grid md:grid-cols-3 gap-3 mb-8'>
                {Object.entries(ROLE_INFO).map(([key, r]) => (
                    <div key={key} className='bg-white rounded-2xl border border-gray-100 p-4'>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.style}`}>{r.label}</span>
                        <p className='text-xs text-gray-500 mt-2'>{r.text}</p>
                    </div>
                ))}
            </div>

            {isAdmin &&
                <form onSubmit={invite} className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 flex flex-wrap gap-3'>
                    <input required type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder="Teammate's Google email"
                        className='flex-1 min-w-[220px] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-black' />
                    <select value={orgRole} onChange={e => setOrgRole(e.target.value)} className='border border-gray-200 rounded-xl px-3 text-sm'>
                        {Object.entries(ROLE_INFO).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
                    </select>
                    <button disabled={busy} className='bg-black text-white px-5 rounded-xl text-sm disabled:opacity-50'>Invite</button>
                </form>}

            <h2 className='font-semibold text-gray-800 mb-3'>Members</h2>
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 mb-8'>
                {team?.members.map(m => {
                    const me = m._id === userData?._id
                    return (
                        <div key={m._id} className='flex items-center justify-between gap-3 px-5 py-4 flex-wrap'>
                            <div className='min-w-0'>
                                <p className='font-medium text-gray-800'>{m.name} {me && <span className='text-xs text-gray-400'>(you)</span>}</p>
                                <p className='text-xs text-gray-500'>{m.email}</p>
                            </div>
                            <div className='flex items-center gap-2'>
                                {isAdmin && !me
                                    ? <>
                                        <select value={m.orgRole} disabled={busy} onChange={e => act(() => axios.patch(ServerUrl + `/api/org/members/${m._id}`, { orgRole: e.target.value }, { withCredentials: true }), `${m.name} is now ${ROLE_INFO[e.target.value].label}`)}
                                            className='border border-gray-200 rounded-lg px-2 py-1 text-sm'>
                                            {Object.entries(ROLE_INFO).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
                                        </select>
                                        <button disabled={busy} title='Remove from workspace'
                                            onClick={() => window.confirm(`Remove ${m.name} from ${userData?.org?.name}?`) && act(() => axios.delete(ServerUrl + `/api/org/members/${m._id}`, { withCredentials: true }), `${m.name} removed`)}
                                            className='p-2 text-gray-400 hover:text-red-500'><FaTimes /></button>
                                    </>
                                    : <span className={`text-xs px-2.5 py-0.5 rounded-full ${ROLE_INFO[m.orgRole]?.style}`}>{ROLE_INFO[m.orgRole]?.label}</span>}
                            </div>
                        </div>
                    )
                })}
            </div>

            {isAdmin && team?.invites.length > 0 && <>
                <h2 className='font-semibold text-gray-800 mb-3'>Pending invites</h2>
                <div className='bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100'>
                    {team.invites.map(inv => (
                        <div key={inv._id} className='flex items-center justify-between gap-3 px-5 py-4 flex-wrap'>
                            <div>
                                <p className='text-sm text-gray-800'>{inv.email} <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${ROLE_INFO[inv.orgRole].style}`}>{ROLE_INFO[inv.orgRole].label}</span></p>
                                <p className='text-xs text-gray-400'>sent {timeAgo(inv.createdAt)} • expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                            </div>
                            <div className='flex gap-2'>
                                <button onClick={() => navigator.clipboard.writeText(inviteLink(inv.token)).then(() => toast.success("Link copied"))} className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-100'><FaRegCopy /> Link</button>
                                <button onClick={() => emailInvite(inv)} className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-100'><MdOutlineEmail /> Email</button>
                                <button onClick={() => act(() => axios.delete(ServerUrl + `/api/org/invites/${inv._id}`, { withCredentials: true }), "Invite revoked")} className='text-xs px-3 py-1.5 rounded-full text-red-500 hover:bg-red-50'>Revoke</button>
                            </div>
                        </div>
                    ))}
                </div>
            </>}
        </div>
    )
}

export default Team
