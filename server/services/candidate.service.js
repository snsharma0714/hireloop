import Candidate from "../models/candidate.model.js"
import Activity from "../models/activity.model.js"

export const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max)
export const cleanList = (list, max = 30) =>
    [...new Set((Array.isArray(list) ? list : String(list || "").split(/[,;|]/)).map(s => clean(s, 40)).filter(Boolean))].slice(0, max)
const normalizeName = (name) => clean(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
const digits = (phone) => String(phone || "").replace(/\D/g, "").slice(-10)

export const logActivity = async ({ org, candidate, type, text = "", job = null, by = null }) => {
    const activity = await Activity.create({ org, candidate, type, text: clean(text, 3000), job, by })
    await Candidate.updateOne({ _id: candidate }, { lastActivityAt: activity.at })
    return activity
}

// The talent-pool entry for a HireLoop student applying to this workspace (created on first application)
export const candidateForStudent = async (orgId, student, resumeUrl) => {
    const email = student.email.toLowerCase()
    let candidate = await Candidate.findOne({ org: orgId, email })
    if (!candidate) {
        candidate = await Candidate.create({
            org: orgId,
            name: student.name,
            email,
            headline: student.headline || "",
            skills: student.skills || [],
            resumeUrl: resumeUrl || student.resumeUrl || "",
            source: "applied",
            student: student._id
        })
    } else if (!candidate.student) {
        // a recruiter added them earlier; now we know their HireLoop account
        candidate.student = student._id
        if (!candidate.resumeUrl && resumeUrl) candidate.resumeUrl = resumeUrl
        await candidate.save()
    }
    return candidate
}

// Same person entered twice with different emails: same name or same phone number
export const possibleDuplicates = async (candidate) => {
    const or = []
    const name = normalizeName(candidate.name)
    if (name) or.push({ name: new RegExp(`^${name.split(" ").map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^a-z0-9]+")}$`, "i") })
    // compare the last 10 digits, ignoring spaces, dashes and country codes ("+91 98765 43210" = "9876543210")
    const phone = digits(candidate.phone)
    if (phone.length >= 7) or.push({ phone: new RegExp(`${phone.split("").join("\\D*")}\\D*$`) })
    if (!or.length) return []
    return Candidate.find({ org: candidate.org, _id: { $ne: candidate._id }, $or: or }).select("name email phone source").limit(5)
}

// ---------- CSV ----------

// RFC-4180-ish parser: quoted fields, escaped quotes, commas and newlines inside quotes
export const parseCsv = (text) => {
    const rows = []
    let row = [], field = "", quoted = false
    const src = String(text).replace(/^﻿/, "")
    for (let i = 0; i < src.length; i++) {
        const c = src[i]
        if (quoted) {
            if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
            else if (c === '"') quoted = false
            else field += c
        } else if (c === '"') quoted = true
        else if (c === ",") { row.push(field); field = "" }
        else if (c === "\n" || c === "\r") {
            if (c === "\r" && src[i + 1] === "\n") i++
            row.push(field); rows.push(row); row = []; field = ""
        } else field += c
    }
    if (field || row.length) { row.push(field); rows.push(row) }
    return rows.filter(r => r.some(cell => cell.trim()))
}

// Header names people commonly use, mapped to candidate fields
const HEADER_ALIASES = {
    name: ["name", "full name", "fullname", "candidate", "candidate name"],
    firstName: ["first name", "firstname", "first"],
    lastName: ["last name", "lastname", "last", "surname"],
    email: ["email", "e-mail", "email address", "mail"],
    phone: ["phone", "mobile", "phone number", "contact", "cell"],
    headline: ["headline", "title", "role", "position", "current title"],
    location: ["location", "city"],
    currentCompany: ["company", "current company", "employer", "organization"],
    skills: ["skills", "skill", "tech", "technologies"],
    tags: ["tags", "tag", "labels"],
    linkedinUrl: ["linkedin", "linkedin url", "linkedin profile"],
    resumeUrl: ["resume", "resume url", "cv", "cv url"],
    source: ["source"]
}

export const mapCsvRows = (rows) => {
    if (rows.length < 2) return { columns: {}, records: [] }
    const header = rows[0].map(h => h.trim().toLowerCase())
    const columns = {}
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        const idx = header.findIndex(h => aliases.includes(h))
        if (idx !== -1) columns[field] = idx
    }
    const get = (r, field) => (columns[field] !== undefined ? clean(r[columns[field]], 500) : "")
    const records = rows.slice(1).map((r, i) => {
        const name = get(r, "name") || [get(r, "firstName"), get(r, "lastName")].filter(Boolean).join(" ")
        const email = get(r, "email").toLowerCase()
        const record = {
            line: i + 2,
            name,
            email,
            phone: get(r, "phone"),
            headline: get(r, "headline"),
            location: get(r, "location"),
            currentCompany: get(r, "currentCompany"),
            skills: cleanList(get(r, "skills")),
            tags: cleanList(get(r, "tags")),
            linkedinUrl: get(r, "linkedinUrl"),
            resumeUrl: get(r, "resumeUrl")
        }
        if (!name) record.error = "missing name"
        else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) record.error = "invalid email"
        return record
    })
    return { columns: Object.keys(columns), records }
}
