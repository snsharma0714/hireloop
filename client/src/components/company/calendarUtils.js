export const EVENT_KINDS = {
    interview: { label: "Interview", chip: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
    meeting: { label: "Meeting", chip: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
    call: { label: "Call", chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
    reminder: { label: "Reminder", chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
    other: { label: "Other", chip: "bg-gray-100 text-gray-700", dot: "bg-gray-400" }
}
export const kindOf = (item) => EVENT_KINDS[item.kind] || EVENT_KINDS.other

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()
export const endOf = (item) => new Date(new Date(item.start).getTime() + (item.allDay ? 1440 : item.durationMin) * 60000)

// the 6-week grid shown for a month, starting on Monday
export const monthGrid = (month) => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = addDays(first, -((first.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

const pad = (n) => String(n).padStart(2, "0")
// values for <input type=date> / <input type=time> in the viewer's own timezone
export const dateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const timeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export const timeLabel = (item) => item.allDay
    ? "All day"
    : new Date(item.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

export const whenLabel = (item) => {
    const start = new Date(item.start)
    const day = start.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    if (item.allDay) return `${day} • all day`
    return `${day} • ${timeLabel(item)} – ${endOf(item).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
}

// true when two entries overlap in time
export const overlaps = (a, b) => new Date(a.start) < endOf(b) && new Date(b.start) < endOf(a)

const utcStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
const dayStamp = (d) => dateInput(d).replace(/-/g, "")

const describe = (item) => [
    item.candidate?.name && `Candidate: ${item.candidate.name}`,
    item.job?.title && `Job: ${item.job.title}`,
    item.token && `Room: ${window.location.origin}/room/${item.token}`,
    item.notes
].filter(Boolean).join("\n")

// "Add to Google Calendar" link (no API key or login needed)
export const googleCalendarUrl = (item) => {
    const dates = item.allDay
        ? `${dayStamp(new Date(item.start))}/${dayStamp(addDays(item.start, 1))}`
        : `${utcStamp(new Date(item.start))}/${utcStamp(endOf(item))}`
    const params = new URLSearchParams({ action: "TEMPLATE", text: item.title, dates, details: describe(item), location: item.token ? `${window.location.origin}/room/${item.token}` : item.location || "" })
    return `https://calendar.google.com/calendar/render?${params}`
}

const icsText = (text) => String(text || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, m => `\\${m}`)

// .ics file that Outlook, Apple Calendar and Google Calendar can all import
export const downloadIcs = (items, filename = "hireloop.ics") => {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HireLoop//Calendar//EN", "CALSCALE:GREGORIAN"]
    for (const item of items) {
        lines.push(
            "BEGIN:VEVENT",
            `UID:${item._id}@hireloop`,
            `DTSTAMP:${utcStamp(new Date())}`,
            ...(item.allDay
                ? [`DTSTART;VALUE=DATE:${dayStamp(new Date(item.start))}`, `DTEND;VALUE=DATE:${dayStamp(addDays(item.start, 1))}`]
                : [`DTSTART:${utcStamp(new Date(item.start))}`, `DTEND:${utcStamp(endOf(item))}`]),
            `SUMMARY:${icsText(item.title)}`,
            `DESCRIPTION:${icsText(describe(item))}`,
            `LOCATION:${icsText(item.token ? `${window.location.origin}/room/${item.token}` : item.location)}`,
            "END:VEVENT"
        )
    }
    lines.push("END:VCALENDAR")
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }))
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
