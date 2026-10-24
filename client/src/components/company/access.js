const LEVEL = { viewer: 1, recruiter: 2, admin: 3 }

// can(user, "recruiter") -> true for recruiters and admins
export const can = (user, minRole) => (LEVEL[user?.orgRole] || 0) >= LEVEL[minRole]

export const ROLE_INFO = {
    admin: { label: "Admin", style: "bg-black text-white", text: "Everything, plus team and workspace settings" },
    recruiter: { label: "Recruiter", style: "bg-blue-100 text-blue-700", text: "Post jobs, move candidates, run interviews" },
    viewer: { label: "Viewer", style: "bg-gray-100 text-gray-600", text: "Read-only: see jobs, candidates and interviews" }
}
