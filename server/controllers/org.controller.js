import crypto from "crypto"
import Organization from "../models/organization.model.js"
import Invite, { ORG_ROLES } from "../models/invite.model.js"
import User from "../models/user.model.js"
import { uniqueSlug } from "../services/org.service.js"
import Job from "../models/job.model.js"
import Application from "../models/application.model.js"
import ScheduledInterview from "../models/scheduledInterview.model.js"
import Event from "../models/event.model.js"
import { APP_URL, sendMail } from "../services/mail.service.js"

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max)
const INVITE_DAYS = 14

export const getMyOrg = async (req, res) => {
    try {
        const org = await Organization.findById(req.orgId)
        return res.status(200).json({ ...org.toObject(), myRole: req.orgRole })
    } catch (error) {
        return res.status(500).json({ message: `failed to get workspace ${error}` })
    }
}

export const updateOrg = async (req, res) => {
    try {
        const org = await Organization.findById(req.orgId)
        const { name, website, about, slug, tagline, careersEnabled } = req.body
        if (name !== undefined && clean(name)) org.name = clean(name, 100)
        if (website !== undefined) org.website = clean(website)
        if (about !== undefined) org.about = clean(about, 2000)
        if (tagline !== undefined) org.tagline = clean(tagline, 160)
        if (careersEnabled !== undefined) org.careersEnabled = Boolean(careersEnabled)
        if (slug !== undefined && clean(slug)) {
            const wanted = await uniqueSlug(clean(slug, 40), org._id)
            org.slug = wanted
        }
        await org.save()
        return res.status(200).json(org)
    } catch (error) {
        return res.status(500).json({ message: `failed to update workspace ${error}` })
    }
}

// ---------- team ----------

export const getTeam = async (req, res) => {
    try {
        const [members, invites] = await Promise.all([
            User.find({ org: req.orgId, role: "company" }).select("name email orgRole createdAt").sort({ createdAt: 1 }),
            req.orgRole === "admin"
                ? Invite.find({ org: req.orgId, acceptedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 })
                : []
        ])
        return res.status(200).json({ members, invites })
    } catch (error) {
        return res.status(500).json({ message: `failed to get team ${error}` })
    }
}

export const createInvite = async (req, res) => {
    try {
        const email = clean(req.body.email, 120).toLowerCase()
        const orgRole = ORG_ROLES.includes(req.body.orgRole) ? req.body.orgRole : "recruiter"
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email" })

        const existing = await User.findOne({ email })
        if (existing?.role) {
            const why = String(existing.org) === String(req.orgId) ? "is already in your team" : `already has a ${existing.role} account`
            return res.status(409).json({ message: `${email} ${why}` })
        }

        await Invite.deleteMany({ org: req.orgId, email, acceptedAt: null })
        const invite = await Invite.create({
            org: req.orgId,
            email,
            orgRole,
            token: crypto.randomBytes(16).toString("hex"),
            invitedBy: req.userId,
            expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000)
        })
        const [org, inviter] = await Promise.all([Organization.findById(req.orgId).select("name"), User.findById(req.userId).select("name")])
        const mail = await sendMail({
            org: req.orgId, fromName: org.name, to: email, template: "invite", by: req.userId,
            subject: `${inviter?.name || "Your team"} invited you to ${org.name} on HireLoop`,
            text: `Hi,\n\n${inviter?.name || "Someone"} invited you to join the ${org.name} hiring workspace on HireLoop as ${orgRole}.\n\nAccept the invite (sign in with ${email}): ${APP_URL()}/invite/${invite.token}\n\nThis link expires in ${INVITE_DAYS} days.`
        })
        return res.status(201).json({ ...invite.toObject(), emailStatus: mail.status })
    } catch (error) {
        return res.status(500).json({ message: `failed to invite ${error}` })
    }
}

export const revokeInvite = async (req, res) => {
    try {
        await Invite.deleteOne({ _id: req.params.id, org: req.orgId, acceptedAt: null })
        return res.status(200).json({ message: "Invite revoked" })
    } catch (error) {
        return res.status(500).json({ message: `failed to revoke invite ${error}` })
    }
}

const adminCount = (orgId) => User.countDocuments({ org: orgId, role: "company", orgRole: "admin" })

export const updateMember = async (req, res) => {
    try {
        const member = await User.findOne({ _id: req.params.userId, org: req.orgId, role: "company" })
        if (!member) return res.status(404).json({ message: "Member not found" })
        const { orgRole } = req.body
        if (!ORG_ROLES.includes(orgRole)) return res.status(400).json({ message: "Unknown access level" })
        if (member.orgRole === "admin" && orgRole !== "admin" && await adminCount(req.orgId) <= 1) {
            return res.status(400).json({ message: "A workspace needs at least one admin" })
        }
        member.orgRole = orgRole
        await member.save()
        return res.status(200).json({ _id: member._id, orgRole: member.orgRole })
    } catch (error) {
        return res.status(500).json({ message: `failed to update member ${error}` })
    }
}

// Removing someone frees their account: they pick student/company again on next login
export const removeMember = async (req, res) => {
    try {
        const member = await User.findOne({ _id: req.params.userId, org: req.orgId, role: "company" })
        if (!member) return res.status(404).json({ message: "Member not found" })
        if (member.orgRole === "admin" && await adminCount(req.orgId) <= 1) {
            return res.status(400).json({ message: "A workspace needs at least one admin" })
        }
        member.org = null
        member.orgRole = null
        member.role = null
        await member.save()
        return res.status(200).json({ message: "Member removed" })
    } catch (error) {
        return res.status(500).json({ message: `failed to remove member ${error}` })
    }
}

// ---------- accepting an invite (any logged-in user who hasn't picked a role) ----------

export const getInvite = async (req, res) => {
    try {
        const invite = await Invite.findOne({ token: req.params.token }).populate("org", "name").populate("invitedBy", "name")
        if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
            return res.status(404).json({ message: "This invite link is invalid or has expired" })
        }
        return res.status(200).json({ email: invite.email, orgRole: invite.orgRole, orgName: invite.org?.name, invitedBy: invite.invitedBy?.name })
    } catch (error) {
        return res.status(500).json({ message: `failed to read invite ${error}` })
    }
}

export const acceptInvite = async (req, res) => {
    try {
        const invite = await Invite.findOne({ token: req.params.token })
        if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
            return res.status(404).json({ message: "This invite link is invalid or has expired" })
        }
        const user = await User.findById(req.userId)
        if (user.email.toLowerCase() !== invite.email) {
            return res.status(403).json({ message: `This invite is for ${invite.email}. Log in with that Google account.` })
        }
        if (user.role) {
            return res.status(409).json({ message: `Your account is already a ${user.role} account, so it can't join a workspace` })
        }
        user.role = "company"
        user.org = invite.org
        user.orgRole = invite.orgRole
        await user.save()
        invite.acceptedAt = new Date()
        await invite.save()
        await user.populate("org", "name slug")
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ message: `failed to accept invite ${error}` })
    }
}

// Shown on the role picker: invites waiting for this user's email
export const myPendingInvites = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("email")
        const invites = await Invite.find({ email: user.email.toLowerCase(), acceptedAt: null, expiresAt: { $gt: new Date() } }).populate("org", "name")
        return res.status(200).json(invites.map(i => ({ token: i.token, orgName: i.org?.name, orgRole: i.orgRole })))
    } catch (error) {
        return res.status(500).json({ message: `failed to get invites ${error}` })
    }
}

// ---------- workspace home ----------

export const getOverview = async (req, res) => {
    try {
        const org = req.orgId
        const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
        const [openJobs, applicants, newThisWeek, inInterview, hired, upcoming, recent, events] = await Promise.all([
            Job.countDocuments({ org, status: "open" }),
            Application.countDocuments({ org }),
            Application.countDocuments({ org, createdAt: { $gte: weekAgo } }),
            Application.countDocuments({ org, status: "interview" }),
            Application.countDocuments({ org, status: "hired" }),
            ScheduledInterview.find({ org, status: { $in: ["scheduled", "live"] }, scheduledAt: { $gte: new Date(Date.now() - 3 * 3600 * 1000) } })
                .sort({ scheduledAt: 1 }).limit(6).select("title candidateName scheduledAt durationMin status token").populate("interviewer", "name"),
            Application.find({ org }).sort({ createdAt: -1 }).limit(8)
                .populate("candidate", "name headline").populate("job", "title").select("status createdAt shareStats screeningPassed"),
            Event.find({ org, start: { $gte: new Date(Date.now() - 3600 * 1000) } }).sort({ start: 1 }).limit(6)
                .select("title kind start durationMin allDay candidate").populate("candidate", "name")
        ])
        return res.status(200).json({ openJobs, applicants, newThisWeek, inInterview, hired, upcoming, recent, events })
    } catch (error) {
        return res.status(500).json({ message: `failed to get overview ${error}` })
    }
}
