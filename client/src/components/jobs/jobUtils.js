export const JOB_TYPES = ["Full-time", "Internship", "Part-time", "Contract"]

export const STAGES = [
    { key: "applied", label: "Applied", style: "bg-gray-100 text-gray-700", bar: "bg-gray-400" },
    { key: "screening", label: "Screening", style: "bg-blue-100 text-blue-700", bar: "bg-blue-500" },
    { key: "interview", label: "Interview", style: "bg-purple-100 text-purple-700", bar: "bg-purple-500" },
    { key: "offer", label: "Offer", style: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
    { key: "hired", label: "Hired", style: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
    { key: "rejected", label: "Rejected", style: "bg-red-100 text-red-600", bar: "bg-red-400" }
]

export const stageOf = (key) => STAGES.find(s => s.key === key) || STAGES[0]

export const timeAgo = (date) => {
    const mins = Math.round((Date.now() - new Date(date)) / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins} min ago`
    if (mins < 1440) return `${Math.round(mins / 60)} h ago`
    const days = Math.round(mins / 1440)
    return days < 30 ? `${days} d ago` : new Date(date).toLocaleDateString()
}

// "Full-time • Bengaluru • Remote • 0-2 years"
export const jobMeta = (j) => [j.type, j.location, j.remote && "Remote", j.experience, j.salary].filter(Boolean).join(" • ")

// Moving to an earlier stage (Offer -> Interview), or bringing someone back from Rejected
export const isBackward = (from, to) => {
    if (to === "rejected" || from === to) return false
    if (from === "rejected") return true
    const order = STAGES.map(s => s.key)
    return order.indexOf(to) < order.indexOf(from)
}

// Asks first, so a slipped drag doesn't quietly undo progress. Returns true to go ahead.
export const confirmMove = (name, from, to) =>
    !isBackward(from, to) || window.confirm(`Move ${name} back from ${stageOf(from).label} to ${stageOf(to).label}?`)
