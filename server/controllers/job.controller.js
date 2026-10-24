import crypto from "crypto"
import mongoose from "mongoose"
import Job from "../models/job.model.js"
import Application, { PIPELINE } from "../models/application.model.js"
import User from "../models/user.model.js"
import ScheduledInterview from "../models/scheduledInterview.model.js"
import { candidateSummary } from "../services/practiceStats.service.js"
import Organization from "../models/organization.model.js"
import { orgCard } from "../services/org.service.js"
import Activity from "../models/activity.model.js"
import { candidateForStudent, logActivity } from "../services/candidate.service.js"
import { cleanQuestions, gradeAnswers, publicQuestions } from "../services/screening.service.js"
import { APP_URL, inBackground, sendTemplate } from "../services/mail.service.js"
import { firstQuestionFields } from "../services/interviewQuestion.service.js"

// pipeline order, without "rejected" (which can happen from any stage)
const FUNNEL = PIPELINE.filter(s => s !== "rejected")

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max)
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const jobFields = (body) => {
    const out = {}
    if (body.title !== undefined) out.title = clean(body.title, 120)
    if (body.location !== undefined) out.location = clean(body.location, 120)
    if (body.type !== undefined) out.type = body.type
    if (body.remote !== undefined) out.remote = Boolean(body.remote)
    if (body.experience !== undefined) out.experience = clean(body.experience, 60)
    if (body.salary !== undefined) out.salary = clean(body.salary, 60)
    if (body.description !== undefined) out.description = clean(body.description, 8000)
    if (Array.isArray(body.skills)) out.skills = body.skills.map(s => clean(s, 40)).filter(Boolean).slice(0, 15)
    if (body.status !== undefined) out.status = body.status
    if (body.questions !== undefined) out.questions = cleanQuestions(body.questions)
    return out
}


// ---------- public job board ----------

export const listJobs = async (req, res) => {
    try {
        const { q, type, remote } = req.query
        const filter = { status: "open" }
        if (type) filter.type = type
        if (remote === "true") filter.remote = true
        if (q?.trim()) {
            const rx = new RegExp(escapeRegex(q.trim().slice(0, 60)), "i")
            const orgs = await Organization.find({ name: rx }).select("_id")
            filter.$or = [{ title: rx }, { skills: rx }, { location: rx }, { org: { $in: orgs.map(o => o._id) } }]
        }
        const jobs = await Job.find(filter).populate("org", "name website about slug").sort({ createdAt: -1 }).limit(100)

        let applied = new Set()
        if (req.userId) {
            const apps = await Application.find({ student: req.userId, job: { $in: jobs.map(j => j._id) } }).select("job")
            applied = new Set(apps.map(a => String(a.job)))
        }
        return res.status(200).json(jobs.map(j => ({
            ...j.toObject(),
            description: j.description.slice(0, 220),
            questions: undefined,
            company: orgCard(j.org),
            org: undefined,
            applied: applied.has(String(j._id))
        })))
    } catch (error) {
        return res.status(500).json({ message: `failed to get jobs ${error}` })
    }
}

export const getJob = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Job not found" })
        const job = await Job.findById(req.params.id).populate("org", "name website about slug")
        if (!job) return res.status(404).json({ message: "Job not found" })
        const application = req.userId
            ? await Application.findOne({ job: job._id, student: req.userId }).select("status createdAt")
            : null
        return res.status(200).json({ ...job.toObject(), questions: publicQuestions(job.questions), org: undefined, company: orgCard(job.org), application })
    } catch (error) {
        return res.status(500).json({ message: `failed to get job ${error}` })
    }
}

// ---------- company: manage jobs ----------

export const createJob = async (req, res) => {
    try {
        const fields = jobFields(req.body)
        if (!fields.title || !fields.description) {
            return res.status(400).json({ message: "Title and description are required" })
        }
        const job = await Job.create({ ...fields, status: "open", org: req.orgId, createdBy: req.userId })
        return res.status(201).json(job)
    } catch (error) {
        return res.status(500).json({ message: `failed to create job ${error}` })
    }
}

export const updateJob = async (req, res) => {
    try {
        const job = await Job.findOneAndUpdate({ _id: req.params.id, org: req.orgId }, jobFields(req.body), { new: true, runValidators: true })
        if (!job) return res.status(404).json({ message: "Job not found" })
        return res.status(200).json(job)
    } catch (error) {
        return res.status(500).json({ message: `failed to update job ${error}` })
    }
}

export const getMyJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ org: req.orgId }).populate("createdBy", "name").sort({ createdAt: -1 })
        const counts = await Application.aggregate([
            { $match: { org: new mongoose.Types.ObjectId(req.orgId) } },
            { $group: { _id: { job: "$job", status: "$status" }, n: { $sum: 1 } } }
        ])
        const byJob = {}
        for (const c of counts) {
            const key = String(c._id.job)
            byJob[key] = byJob[key] || Object.fromEntries(PIPELINE.map(s => [s, 0]))
            byJob[key][c._id.status] = c.n
        }
        return res.status(200).json(jobs.map(j => ({
            ...j.toObject(),
            counts: byJob[String(j._id)] || Object.fromEntries(PIPELINE.map(s => [s, 0]))
        })))
    } catch (error) {
        return res.status(500).json({ message: `failed to get jobs ${error}` })
    }
}

// ---------- student: apply + track ----------

export const applyToJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
        if (!job || job.status !== "open") return res.status(400).json({ message: "This job isn't accepting applications" })

        const student = await User.findById(req.userId)
        const resumeUrl = clean(req.body.resumeUrl || student.resumeUrl, 500)
        if (resumeUrl && !/^https?:\/\//i.test(resumeUrl)) {
            return res.status(400).json({ message: "Resume link must start with http:// or https://" })
        }

        const graded = gradeAnswers(job.questions, req.body.answers)
        if (graded.error) return res.status(400).json({ message: graded.error })

        const exists = await Application.findOne({ job: job._id, student: req.userId })
        if (exists) return res.status(409).json({ message: "You've already applied to this job" })

        const candidate = await candidateForStudent(job.org, student, resumeUrl)
        // a recruiter may have already added this person to the job by hand
        if (await Application.exists({ job: job._id, candidate: candidate._id })) {
            return res.status(409).json({ message: "This company already has you in this job's pipeline" })
        }

        const application = await Application.create({
            job: job._id,
            candidate: candidate._id,
            student: req.userId,
            org: job.org,
            coverNote: clean(req.body.coverNote, 3000),
            resumeUrl,
            shareStats: req.body.shareStats === true,
            answers: graded.answers,
            screeningPassed: graded.screeningPassed,
            history: [{ status: "applied" }]
        })
        await logActivity({ org: job.org, candidate: candidate._id, type: "applied", text: `Applied to ${job.title}`, job: job._id })
        inBackground(sendTemplate({ orgId: job.org, key: "application_received", to: student.email, vars: { candidate: student.name, job: job.title }, candidate: candidate._id }))
        return res.status(201).json(application)
    } catch (error) {
        return res.status(500).json({ message: `failed to apply ${error}` })
    }
}

export const getMyApplications = async (req, res) => {
    try {
        const apps = await Application.find({ student: req.userId })
            .populate({ path: "job", select: "title location type remote status org", populate: { path: "org", select: "name website about slug" } })
            .populate("interview", "token scheduledAt durationMin status")
            .sort({ updatedAt: -1 })
        // notes are the company's private comments
        return res.status(200).json(apps.map(a => {
            const o = a.toObject()
            delete o.notes
            if (o.job) {
                o.job.company = orgCard(a.job.org)
                delete o.job.org
            }
            return o
        }))
    } catch (error) {
        return res.status(500).json({ message: `failed to get applications ${error}` })
    }
}

// ---------- company: pipeline ----------

export const getJobApplications = async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, org: req.orgId })
        if (!job) return res.status(404).json({ message: "Job not found" })

        const apps = await Application.find({ job: job._id })
            .populate("candidate", "name email phone headline location currentCompany skills tags source resumeUrl linkedinUrl")
            .populate("student", "name email headline college graduationYear skills")
            .populate("interview", "token scheduledAt durationMin status scorecard aiSummary")
            .populate("notes.by", "name")
            .sort({ createdAt: -1 })

        const activities = await Activity.find({ candidate: { $in: apps.map(a => a.candidate?._id) } })
            .sort({ at: -1 }).populate("by", "name").populate("job", "title")
        const withStats = await Promise.all(apps.map(async (a) => ({
            ...a.toObject(),
            // practice record only when the student opted in
            stats: a.shareStats && a.student ? await candidateSummary(a.student._id) : null,
            activities: activities.filter(x => String(x.candidate) === String(a.candidate?._id)).slice(0, 30)
        })))
        return res.status(200).json({ job, applications: withStats })
    } catch (error) {
        return res.status(500).json({ message: `failed to get applications ${error}` })
    }
}

export const updateApplication = async (req, res) => {
    try {
        const app = await Application.findOne({ _id: req.params.id, org: req.orgId }).populate("job", "title").populate("candidate", "name email")
        if (!app) return res.status(404).json({ message: "Application not found" })
        const candidateId = app.candidate._id

        const { status, note } = req.body
        if (status !== undefined) {
            if (!PIPELINE.includes(status)) return res.status(400).json({ message: "Unknown status" })
            if (status !== app.status) {
                // only the first time someone moves forward into a stage counts as news for them;
                // moving back (Offer -> Interview) or returning to a stage they've been in sends nothing
                const reached = [app.status, ...app.history.map(h => h.status)]
                const furthest = Math.max(...reached.map(s => FUNNEL.indexOf(s)))
                const isNews = status === "rejected" ? !reached.includes("rejected") : FUNNEL.indexOf(status) > furthest
                const backwards = status !== "rejected" && app.status !== "rejected" && FUNNEL.indexOf(status) < FUNNEL.indexOf(app.status)

                await logActivity({ org: req.orgId, candidate: candidateId, type: "stage_change", text: `${app.job.title}: ${app.status} → ${status}${backwards ? " (moved back)" : ""}`, job: app.job._id, by: req.userId })
                app.status = status
                app.history.push({ status })
                res.locals.notified = isNews
                // the workspace's email settings decide which stages actually send
                if (isNews) inBackground(sendTemplate({
                    orgId: req.orgId,
                    key: status === "rejected" ? "application_rejected" : "stage_changed",
                    to: app.candidate.email,
                    vars: { candidate: app.candidate.name, job: app.job.title, stageKey: status },
                    candidate: candidateId,
                    by: req.userId
                }))
            }
        }
        if (clean(note)) await logActivity({ org: req.orgId, candidate: candidateId, type: "note", text: clean(note, 2000), job: app.job._id, by: req.userId })
        await app.save()
        // `notified` tells the UI whether this move could email the candidate
        return res.status(200).json({ ...app.toObject(), notified: Boolean(res.locals.notified) })
    } catch (error) {
        return res.status(500).json({ message: `failed to update application ${error}` })
    }
}

// Creates a live interview room for the applicant and moves them to the Interview stage
export const scheduleInterview = async (req, res) => {
    try {
        const app = await Application.findOne({ _id: req.params.id, org: req.orgId })
            .populate("candidate", "name email")
            .populate("job", "title")
        if (!app) return res.status(404).json({ message: "Application not found" })

        const { scheduledAt, durationMin, description, problemSlug } = req.body
        if (!scheduledAt || isNaN(new Date(scheduledAt).getTime())) {
            return res.status(400).json({ message: "Pick a valid interview time" })
        }
        const org = await Organization.findById(req.orgId).select("name")

        const interview = await ScheduledInterview.create({
            type: "hiring",
            interviewer: req.userId,
            org: req.orgId,
            title: app.job.title,
            companyName: org.name,
            candidateName: app.candidate.name,
            candidateEmail: app.candidate.email || "",
            candidateUser: app.student || null,
            application: app._id,
            scheduledAt,
            durationMin: Number(durationMin) || 60,
            description: clean(description, 2000),
            token: crypto.randomBytes(16).toString("hex"),
            ...firstQuestionFields(problemSlug)
        })

        app.interview = interview._id
        inBackground(sendTemplate({
            orgId: req.orgId, key: "interview_scheduled", to: interview.candidateEmail,
            vars: { candidate: interview.candidateName, job: app.job.title, at: interview.scheduledAt, duration: interview.durationMin, link: `${APP_URL()}/room/${interview.token}` },
            candidate: app.candidate._id, by: req.userId
        }))
        await logActivity({ org: req.orgId, candidate: app.candidate._id, type: "interview_scheduled", text: `${app.job.title}: interview on ${new Date(scheduledAt).toUTCString()}`, job: app.job._id, by: req.userId })
        if (["applied", "screening"].includes(app.status)) {
            app.status = "interview"
            app.history.push({ status: "interview" })
        }
        await app.save()
        return res.status(201).json({ application: app, interview })
    } catch (error) {
        return res.status(500).json({ message: `failed to schedule interview ${error}` })
    }
}
