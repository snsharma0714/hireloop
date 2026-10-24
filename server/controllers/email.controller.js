import mongoose from "mongoose"
import Organization from "../models/organization.model.js"
import EmailLog from "../models/emailLog.model.js"
import Candidate from "../models/candidate.model.js"
import User from "../models/user.model.js"
import { clean } from "../services/candidate.service.js"
import { APP_URL, STAGE_LABELS, TEMPLATES, TEMPLATE_VARS, mailConfigured, senderAddress, sendMail, sendTemplate, settingsOf, templateOf } from "../services/mail.service.js"

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const validTimezone = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true } catch { return false } }

const emailState = (org) => ({
    configured: mailConfigured(),
    sender: mailConfigured() ? senderAddress() : null,
    timezone: org.timezone || "Asia/Kolkata",
    settings: settingsOf(org),
    vars: TEMPLATE_VARS,
    stages: Object.entries(STAGE_LABELS).filter(([k]) => !["applied", "rejected"].includes(k)).map(([key, label]) => ({ key, label })),
    templates: Object.entries(TEMPLATES).map(([key, t]) => ({
        key, label: t.label, when: t.when,
        ...templateOf(org, key),
        defaultSubject: t.subject, defaultBody: t.body,
        custom: Boolean(org.emailTemplates?.get?.(key))
    }))
})

export const getEmailSettings = async (req, res) => {
    try {
        const org = await Organization.findById(req.orgId)
        return res.status(200).json(emailState(org))
    } catch (error) {
        return res.status(500).json({ message: `failed to load email settings ${error}` })
    }
}

export const updateEmailSettings = async (req, res) => {
    try {
        const org = await Organization.findById(req.orgId)
        const { settings, templates, timezone } = req.body
        if (settings) {
            const current = settingsOf(org)
            for (const key of ["enabled", "onApply", "onReject", "onInterview"]) {
                if (settings[key] !== undefined) current[key] = Boolean(settings[key])
            }
            if (Array.isArray(settings.onStages)) current.onStages = settings.onStages.filter(s => ["screening", "interview", "offer", "hired"].includes(s))
            if (settings.replyTo !== undefined) {
                const replyTo = clean(settings.replyTo, 120)
                if (replyTo && !EMAIL_RX.test(replyTo)) return res.status(400).json({ message: "Reply-to must be an email address" })
                current.replyTo = replyTo
            }
            org.emailSettings = current
        }
        if (timezone !== undefined) {
            if (!validTimezone(timezone)) return res.status(400).json({ message: "Unknown timezone" })
            org.timezone = timezone
        }
        if (templates && typeof templates === "object") {
            for (const [key, t] of Object.entries(templates)) {
                if (!TEMPLATES[key]) continue
                const subject = clean(t?.subject, 200), body = clean(t?.body, 5000)
                // saving the default wording (or blanks) just goes back to the default
                if (!subject || !body || (subject === TEMPLATES[key].subject && body === TEMPLATES[key].body)) org.emailTemplates.delete(key)
                else org.emailTemplates.set(key, { subject, body })
            }
        }
        await org.save()
        return res.status(200).json(emailState(org))
    } catch (error) {
        return res.status(500).json({ message: `failed to save email settings ${error}` })
    }
}

// Sends a template, filled with sample data, to the admin's own inbox
export const sendTestEmail = async (req, res) => {
    try {
        if (!TEMPLATES[req.body.key]) return res.status(400).json({ message: "Unknown template" })
        const me = await User.findById(req.userId).select("name email")
        const log = await sendTemplate({
            orgId: req.orgId, key: req.body.key, to: me.email, force: true, by: req.userId,
            vars: { candidate: me.name, job: "Software Engineer", stageKey: "interview", at: new Date(Date.now() + 2 * 24 * 3600 * 1000), duration: 60, link: `${APP_URL()}/room/sample-link` }
        })
        return res.status(200).json({ status: log.status, error: log.error, to: me.email })
    } catch (error) {
        return res.status(500).json({ message: `failed to send test email ${error}` })
    }
}

export const getEmailLog = async (req, res) => {
    try {
        const filter = { org: req.orgId }
        if (["sent", "failed", "skipped"].includes(req.query.status)) filter.status = req.query.status
        const emails = await EmailLog.find(filter).sort({ createdAt: -1 }).limit(100)
            .populate("candidate", "name").populate("by", "name").select("-body")
        return res.status(200).json(emails)
    } catch (error) {
        return res.status(500).json({ message: `failed to load emails ${error}` })
    }
}

// A recruiter writes to a candidate from their profile
export const emailCandidate = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Candidate not found" })
        const candidate = await Candidate.findOne({ _id: req.params.id, org: req.orgId })
        if (!candidate) return res.status(404).json({ message: "Candidate not found" })
        if (!candidate.email) return res.status(400).json({ message: `${candidate.name} has no email address` })
        const subject = clean(req.body.subject, 200), body = clean(req.body.body, 5000)
        if (!subject || !body) return res.status(400).json({ message: "Write a subject and a message" })

        const [org, me] = await Promise.all([Organization.findById(req.orgId), User.findById(req.userId).select("name email")])
        const log = await sendMail({
            org: org._id, fromName: `${me.name} at ${org.name}`, to: candidate.email, subject, text: body,
            // replies go to the recruiter who wrote it
            replyTo: me.email || settingsOf(org).replyTo, candidate: candidate._id, by: req.userId
        })
        return res.status(log.status === "sent" ? 200 : 202).json({ status: log.status, error: log.error })
    } catch (error) {
        return res.status(500).json({ message: `failed to send email ${error}` })
    }
}
