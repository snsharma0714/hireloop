import nodemailer from "nodemailer"
import EmailLog from "../models/emailLog.model.js"
import Organization from "../models/organization.model.js"
import { logActivity } from "./candidate.service.js"

// Free sending through any SMTP account, e.g. Gmail with an app password:
//   SMTP_USER=you@gmail.com  SMTP_PASS=<16-letter app password>  (SMTP_HOST / SMTP_PORT default to Gmail)
// Without them nothing is sent, but every email is still recorded as "skipped" so the team can see it.

export const APP_URL = () => (process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")
export const mailConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)

// {{placeholders}} each template can use
export const TEMPLATE_VARS = {
    candidate: "Candidate's name",
    job: "Job title",
    company: "Your company name",
    stage: "New pipeline stage",
    time: "Interview date and time",
    duration: "Interview length in minutes",
    link: "Interview room link",
    careers: "Your careers page link"
}

export const TEMPLATES = {
    application_received: {
        label: "Application received",
        when: "Someone applies to a job",
        subject: "We got your application for {{job}}",
        body: "Hi {{candidate}},\n\nThanks for applying for {{job}} at {{company}}. Our team will review your application and get back to you.\n\nSee our other open roles: {{careers}}\n\nBest,\n{{company}} hiring team"
    },
    stage_changed: {
        label: "Moved forward",
        when: "A candidate moves to one of the stages you pick",
        subject: "Update on your application for {{job}}",
        body: "Hi {{candidate}},\n\nGood news: your application for {{job}} at {{company}} has moved to the {{stage}} stage. We'll be in touch with next steps.\n\nBest,\n{{company}} hiring team"
    },
    application_rejected: {
        label: "Not moving forward",
        when: "A candidate is moved to Rejected",
        subject: "Your application for {{job}}",
        body: "Hi {{candidate}},\n\nThank you for your interest in {{job}} at {{company}}. After careful review we've decided not to move forward with your application this time.\n\nWe'd be glad to see you apply again: {{careers}}\n\nBest,\n{{company}} hiring team"
    },
    interview_scheduled: {
        label: "Interview invite",
        when: "An interview is scheduled",
        subject: "Interview for {{job}} at {{company}}: {{time}}",
        body: "Hi {{candidate}},\n\nYou're invited to an interview for {{job}} at {{company}}.\n\nWhen: {{time}} ({{duration}} minutes)\nJoin here: {{link}}\n\nThe link opens a live video room with a shared code editor. Please join a few minutes early from a laptop with a camera and microphone.\n\nBest,\n{{company}} hiring team"
    },
    interview_updated: {
        label: "Interview moved",
        when: "An interview's time changes",
        subject: "New time for your {{job}} interview: {{time}}",
        body: "Hi {{candidate}},\n\nYour interview for {{job}} at {{company}} has moved.\n\nNew time: {{time}} ({{duration}} minutes)\nJoin here: {{link}}\n\nBest,\n{{company}} hiring team"
    }
}

export const STAGE_LABELS = { applied: "Applied", screening: "Screening", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Rejected" }

export const settingsOf = (org) => ({
    enabled: org.emailSettings?.enabled !== false,
    onApply: org.emailSettings?.onApply !== false,
    onStages: org.emailSettings?.onStages ?? ["interview", "offer", "hired"],
    onReject: Boolean(org.emailSettings?.onReject),
    onInterview: org.emailSettings?.onInterview !== false,
    replyTo: org.emailSettings?.replyTo || ""
})

export const templateOf = (org, key) => {
    const custom = org.emailTemplates?.get?.(key)
    return { subject: custom?.subject || TEMPLATES[key].subject, body: custom?.body || TEMPLATES[key].body }
}

export const fill = (text, vars) => String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "")

export const formatWhen = (date, timeZone = "Asia/Kolkata") => {
    try {
        return `${new Date(date).toLocaleString("en-IN", { timeZone, dateStyle: "full", timeStyle: "short" })} (${timeZone})`
    } catch {
        return new Date(date).toUTCString()
    }
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
const toHtml = (text) => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px">${escapeHtml(text)
    .split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join("")}</div>`

let transporter = null
const transport = () => {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT) || 465
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port,
            secure: port === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        })
    }
    return transporter
}

// Sends one email and records it. Never throws: the result is in the returned log's status.
export const sendMail = async ({ org = null, fromName = "HireLoop", to, subject, text, replyTo, candidate = null, template = "manual", by = null }) => {
    const log = await EmailLog.create({ org, to: to || "", subject, body: text, template, candidate, by })
    if (!to) {
        log.status = "skipped"
        log.error = "No email address"
    } else if (!mailConfigured()) {
        log.status = "skipped"
        log.error = "Email isn't set up on the server yet (SMTP_USER / SMTP_PASS)"
    } else {
        try {
            await transport().sendMail({
                from: { name: fromName, address: process.env.MAIL_FROM || process.env.SMTP_USER },
                to, subject, text, html: toHtml(text),
                ...(replyTo ? { replyTo } : {})
            })
            log.status = "sent"
        } catch (error) {
            log.status = "failed"
            log.error = String(error.message || error).slice(0, 300)
        }
    }
    await log.save()
    if (candidate && org && log.status === "sent") {
        await logActivity({ org, candidate, type: "email_sent", text: `Email sent: ${subject}`, by })
    }
    return log
}

const wanted = (settings, key, vars) => {
    if (!settings.enabled) return false
    if (key === "application_received") return settings.onApply
    if (key === "stage_changed") return settings.onStages.includes(vars.stageKey)
    if (key === "application_rejected") return settings.onReject
    if (key.startsWith("interview_")) return settings.onInterview
    return true
}

// Fills a workspace template and sends it, if the workspace has that email switched on
export const sendTemplate = async ({ orgId, key, to, vars = {}, candidate = null, by = null, force = false }) => {
    const org = await Organization.findById(orgId)
    if (!org || !TEMPLATES[key]) return null
    const settings = settingsOf(org)
    if (!force && !wanted(settings, key, vars)) return null
    const all = {
        company: org.name,
        careers: `${APP_URL()}/careers/${org.slug}`,
        ...vars,
        ...(vars.at ? { time: formatWhen(vars.at, org.timezone || "Asia/Kolkata") } : {}),
        ...(vars.stageKey ? { stage: STAGE_LABELS[vars.stageKey] || vars.stageKey } : {})
    }
    const tpl = templateOf(org, key)
    return sendMail({ org: org._id, fromName: org.name, to, subject: fill(tpl.subject, all), text: fill(tpl.body, all), replyTo: settings.replyTo, candidate, template: key, by })
}

// Controllers call this so a slow mail server never holds up the response
export const inBackground = (promise) => { promise.catch(error => console.error("email error:", error.message)) }
