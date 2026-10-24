import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { BsRobot } from 'react-icons/bs'
import { ServerUrl } from '../App'
import AuthModel from '../components/AuthModel'
import { setUserData } from '../redux/userSlice'
import { ROLE_INFO } from '../components/company/access'

// Landing page for a teammate invite link: /invite/:token
function AcceptInvite() {
    const { token } = useParams()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { userData } = useSelector((state) => state.user)
    const [invite, setInvite] = useState(null)
    const [error, setError] = useState("")
    const [showAuth, setShowAuth] = useState(false)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        axios.get(ServerUrl + `/api/org/invites/${token}`).then(r => setInvite(r.data)).catch(e => setError(e.response?.data?.message || "Invalid invite"))
    }, [token])

    const accept = async () => {
        setBusy(true)
        try {
            await axios.post(ServerUrl + `/api/org/invites/${token}/accept`, {}, { withCredentials: true })
            const me = await axios.get(ServerUrl + "/api/user/current-user", { withCredentials: true })
            dispatch(setUserData(me.data))
            toast.success(`Welcome to ${invite.orgName}!`)
            navigate("/company", { replace: true })
        } catch (e) {
            toast.error(e.response?.data?.message || "Could not accept invite")
            setBusy(false)
        }
    }

    const wrongAccount = userData && invite && userData.email?.toLowerCase() !== invite.email
    const alreadyHasRole = userData?.role

    return (
        <div className='min-h-screen bg-[#f3f3f3] flex items-center justify-center px-4'>
            <div className='w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200 p-10 text-center'>
                <div className='flex items-center justify-center gap-3 mb-6'>
                    <div className='bg-black text-white p-2 rounded-lg'><BsRobot size={18} /></div>
                    <h2 className='font-semibold text-lg'>HireLoop.AI</h2>
                </div>
                {error && <p className='text-gray-500'>{error}</p>}
                {invite && <>
                    <h1 className='text-2xl font-semibold mb-2'>Join {invite.orgName}</h1>
                    <p className='text-gray-500 mb-6'>{invite.invitedBy} invited <b>{invite.email}</b> as <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_INFO[invite.orgRole].style}`}>{ROLE_INFO[invite.orgRole].label}</span></p>
                    {!userData && <button onClick={() => setShowAuth(true)} className='w-full bg-black text-white py-3 rounded-full'>Log in with Google to accept</button>}
                    {wrongAccount && <p className='text-sm text-red-500'>You're logged in as {userData.email}. Log out and sign in with {invite.email}.</p>}
                    {userData && !wrongAccount && alreadyHasRole && <p className='text-sm text-red-500'>This account is already a {userData.role} account, so it can't join a workspace.</p>}
                    {userData && !wrongAccount && !alreadyHasRole &&
                        <button onClick={accept} disabled={busy} className='w-full bg-black text-white py-3 rounded-full disabled:opacity-50'>{busy ? "Joining..." : `Join ${invite.orgName}`}</button>}
                </>}
            </div>
            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </div>
    )
}

export default AcceptInvite
