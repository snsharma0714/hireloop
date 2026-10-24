import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Auth from '../pages/Auth'

// Where each account type lands after logging in
// eslint-disable-next-line react-refresh/only-export-components
export const homeFor = (role) => (role === "company" ? "/company" : "/dashboard")

// Shows the page only to the given role. Logged-out visitors see the login card (or the page itself
// when `publicOk`), and a user who hasn't picked a role yet is sent to the role picker.
function RequireRole({ role, publicOk = false, children }) {
    const { userData } = useSelector((state) => state.user)
    if (!userData) return publicOk ? children : <Auth />
    if (!userData.role) return <Navigate to='/onboarding' replace />
    if (userData.role !== role) return <Navigate to={homeFor(userData.role)} replace />
    return children
}

export default RequireRole
