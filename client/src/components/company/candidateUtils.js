export const SOURCE_LABELS = {
    applied: "Applied on HireLoop",
    manual: "Added manually",
    import: "CSV import",
    referral: "Referral",
    sourced: "Sourced",
    careers: "Careers page"
}

export const ACTIVITY_INFO = {
    note: { label: "Note", icon: "📝" },
    call: { label: "Call", icon: "📞" },
    email: { label: "Email", icon: "✉️" },
    meeting: { label: "Meeting", icon: "🤝" },
    applied: { label: "Applied", icon: "📨" },
    added: { label: "Added", icon: "➕" },
    imported: { label: "Imported", icon: "📥" },
    stage_change: { label: "Stage", icon: "➡️" },
    interview_scheduled: { label: "Interview", icon: "🎥" },
    added_to_job: { label: "Added to job", icon: "💼" },
    merged: { label: "Merged", icon: "🔗" },
    event_scheduled: { label: "Event", icon: "📅" },
    email_sent: { label: "Email sent", icon: "📧" }
}

export const splitList = (text) => String(text || "").split(",").map(s => s.trim()).filter(Boolean)
