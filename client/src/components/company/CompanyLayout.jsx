import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { BsRobot } from 'react-icons/bs'
import { FaHome, FaBriefcase, FaVideo, FaUsers, FaCog, FaAddressBook, FaCalendarAlt, FaGlobe, FaChartBar } from 'react-icons/fa'
import { HiOutlineLogout } from 'react-icons/hi'
import { ServerUrl } from '../../App'
import { setUserData } from '../../redux/userSlice'
import { ROLE_INFO, can } from './access'

// The company side is its own product: a sidebar workspace, separate from the student app
function CompanyLayout({ children }) {
    const { userData } = useSelector((state) => state.user)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const items = [
        { to: "/company", label: "Home", icon: <FaHome />, end: true },
        { to: "/company/jobs", label: "Jobs", icon: <FaBriefcase /> },
        { to: "/company/candidates", label: "Candidates", icon: <FaAddressBook /> },
        { to: "/company/interviews", label: "Interviews", icon: <FaVideo /> },
        { to: "/company/calendar", label: "Calendar", icon: <FaCalendarAlt /> },
        { to: "/company/reports", label: "Reports", icon: <FaChartBar /> },
        { to: "/company/team", label: "Team", icon: <FaUsers /> },
        ...(can(userData, "admin") ? [{ to: "/company/settings", label: "Settings", icon: <FaCog /> }] : [])
    ]

    const logout = async () => {
        try {
            await axios.get(ServerUrl + "/api/auth/logout", { withCredentials: true })
        } catch (error) {
            console.log(error)
        }
        dispatch(setUserData(null))
        navigate("/")
    }

    const role = ROLE_INFO[userData?.orgRole]
    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`

    return (
        <div className='min-h-screen lg:flex bg-[#f6f7f8]'>
            <aside className='hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-gray-200 p-4 sticky top-0 h-screen'>
                <div className='flex items-center gap-2 px-2 mb-1'>
                    <div className='bg-black text-white p-1.5 rounded-lg'><BsRobot size={15} /></div>
                    <span className='font-semibold'>HireLoop <span className='text-gray-400 font-normal'>Hire</span></span>
                </div>
                <p className='px-2 text-xs text-gray-500 truncate mb-6'>{userData?.org?.name}</p>
                <nav className='space-y-1 flex-1'>
                    {items.map(i => <NavLink key={i.to} to={i.to} end={i.end} className={linkClass}>{i.icon}{i.label}</NavLink>)}
                    {userData?.org?.slug &&
                        <a href={`/careers/${userData.org.slug}`} target='_blank' rel='noreferrer' className='flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100'><FaGlobe />Careers page ↗</a>}
                </nav>
                <div className='border-t border-gray-100 pt-4 px-2'>
                    <p className='text-sm font-medium truncate'>{userData?.name}</p>
                    {role && <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full mt-1 ${role.style}`}>{role.label}</span>}
                    <div className='flex gap-3 mt-3 text-xs'>
                        <button onClick={() => navigate("/profile")} className='text-gray-500 hover:text-black'>Profile</button>
                        <button onClick={logout} className='flex items-center gap-1 text-red-500'><HiOutlineLogout /> Logout</button>
                    </div>
                </div>
            </aside>

            {/* small screens: compact top bar */}
            <header className='lg:hidden bg-white border-b border-gray-200 px-4 py-3'>
                <div className='flex items-center justify-between'>
                    <span className='font-semibold'>{userData?.org?.name}</span>
                    <button onClick={logout} className='text-red-500 text-sm'>Logout</button>
                </div>
                <nav className='flex gap-2 overflow-x-auto mt-3'>
                    {items.map(i => <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `shrink-0 text-xs px-3 py-1.5 rounded-full ${isActive ? "bg-black text-white" : "bg-gray-100 text-gray-600"}`}>{i.label}</NavLink>)}
                </nav>
            </header>

            <main className='flex-1 min-w-0'>{children}</main>
        </div>
    )
}

export default CompanyLayout
