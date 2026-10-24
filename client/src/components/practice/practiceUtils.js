export const DIFFICULTY_STYLES = {
    Easy: "text-emerald-600 bg-emerald-50",
    Medium: "text-amber-600 bg-amber-50",
    Hard: "text-red-600 bg-red-50"
}

export const VERDICT_STYLES = {
    "Accepted": "text-emerald-600",
    "Wrong Answer": "text-red-500",
    "Time Limit Exceeded": "text-amber-600",
    "Runtime Error": "text-red-500",
    "Compilation Error": "text-red-500"
}

// "YYYY-MM-DD" in the viewer's own timezone
export const dayKey = (date) => {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export const countByDay = (timestamps) => {
    const counts = {}
    for (const t of timestamps || []) {
        const k = dayKey(t)
        counts[k] = (counts[k] || 0) + 1
    }
    return counts
}

// Consecutive active days ending today (or yesterday, so the streak survives until you practise today)
export const currentStreak = (counts) => {
    const day = new Date()
    if (!counts[dayKey(day)]) day.setDate(day.getDate() - 1)
    let streak = 0
    while (counts[dayKey(day)]) {
        streak++
        day.setDate(day.getDate() - 1)
    }
    return streak
}

// localStorage can throw in private windows, so every access is guarded
export const storage = {
    get: (key) => {
        try { return localStorage.getItem(key) } catch { return null }
    },
    set: (key, value) => {
        try { localStorage.setItem(key, value) } catch { /* ignore */ }
    },
    remove: (key) => {
        try { localStorage.removeItem(key) } catch { /* ignore */ }
    }
}
