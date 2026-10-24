import mongoose from "mongoose"
import Organization from "../models/organization.model.js"
import Job from "../models/job.model.js"
import Application from "../models/application.model.js"
import Candidate from "../models/candidate.model.js"
import { clean, logActivity } from "../services/candidate.service.js"
import { gradeAnswers, publicQuestions } from "../services/screening.service.js"
import { tooManyRequests } from "../services/rateLimit.service.js"
import { inBackground, sendTemplate } from "../services/mail.service.js"

// Public careers page: /careers/<slug>. No login needed to look or to apply.

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isLink = (url) => !url || /^https?:\/\//i.test(url)

const findOrg = (slug) =>
    Organization.findOne({ slug: String(slug || "").toLowerCase(), careersEnabled: { $ne: false } })

const orgInfo = (org) => ({ name: org.name, slug: org.slug, tagline: org.tagline, about: org.about, website: org.website })

export const getCareersPage = async (req, res) => {
    try {
        const org = await findOrg(req.params.slug)
        if (!org) return res.status(404).json({ message: "This careers page doesn't exist" })
        const jobs = await Job.find({ org: org._id, status: "open" })
            .select("title location type remote experience salary skills description createdAt")
            .sort({ createdAt: -1 })
        return res.status(200).json({
            org: orgInfo(org),
            jobs: jobs.map(j => ({ ...j.toObject(), description: j.description.slice(0, 200) }))
        })
    } catch (error) {
        return res.status(500).json({ message: `failed to load careers page ${error}` })
    }
}

export const getCareersJob = async (req, res) => {
    try {
        const org = await findOrg(req.params.slug)
        if (!org || !mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ message: "Job not found" })
        const job = await Job.findOne({ _id: req.params.jobId, org: org._id })
        if (!job) return res.status(404).json({ message: "Job not found" })
        // a signed-in student who already applied through HireLoop sees their status instead of the form
        const application = req.userId
            ? await Application.findOne({ job: job._id, student: req.userId }).select("status createdAt")
            : null
        return res.status(200).json({
            org: orgInfo(org),
            job: { ...job.toObject(), questions: publicQuestions(job.questions), org: undefined, createdBy: undefined },
            application
        })
    } catch (error) {
        return res.status(500).json({ message: `failed to load job ${error}` })
    }
}

export const applyViaCareers = async (req, res) => {
    try {
        // bots fill every field, people never see this one
        if (clean(req.body.company_website)) return res.status(201).json({ ok: true })
        if (tooManyRequests(`careers:${req.ip}`, 5, 10 * 60 * 1000)) {
            return res.status(429).json({ message: "Too many applications from this network. Try again in a few minutes." })
        }

        const org = await findOrg(req.params.slug)
        if (!org || !mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ message: "Job not found" })
        const job = await Job.findOne({ _id: req.params.jobId, org: org._id })
        if (!job || job.status !== "open") return res.status(400).json({ message: "This job isn't accepting applications" })

        const name = clean(req.body.name, 120)
        const email = clean(req.body.email, 120).toLowerCase()
        const phone = clean(req.body.phone, 40)
        const resumeUrl = clean(req.body.resumeUrl, 500)
        const linkedinUrl = clean(req.body.linkedinUrl, 300)
        const location = clean(req.body.location, 120)
        if (!name) return res.status(400).json({ message: "Enter your name" })
        if (!EMAIL_RX.test(email)) return res.status(400).json({ message: "Enter a valid email" })
        if (!isLink(resumeUrl) || !isLink(linkedinUrl)) return res.status(400).json({ message: "Links must start with http:// or https://" })

        const graded = gradeAnswers(job.questions, req.body.answers)
        if (graded.error) return res.status(400).json({ message: graded.error })

        let candidate = await Candidate.findOne({ org: org._id, email })
        if (candidate) {
            // already in the talent pool: only fill gaps, never overwrite what the team has
            if (!candidate.phone && phone) candidate.phone = phone
            if (!candidate.resumeUrl && resumeUrl) candidate.resumeUrl = resumeUrl
            if (!candidate.linkedinUrl && linkedinUrl) candidate.linkedinUrl = linkedinUrl
            if (!candidate.location && location) candidate.location = location
            await candidate.save()
            if (await Application.exists({ job: job._id, candidate: candidate._id })) {
                return res.status(409).json({ message: "You've already applied to this job" })
            }
        } else {
            candidate = await Candidate.create({ org: org._id, name, email, phone, resumeUrl, linkedinUrl, location, source: "careers" })
        }

        await Application.create({
            job: job._id,
            candidate: candidate._id,
            org: org._id,
            coverNote: clean(req.body.coverNote, 3000),
            resumeUrl,
            answers: graded.answers,
            screeningPassed: graded.screeningPassed,
            history: [{ status: "applied" }]
        })
        await logActivity({ org: org._id, candidate: candidate._id, type: "applied", text: `Applied to ${job.title} via the careers page`, job: job._id })
        inBackground(sendTemplate({ orgId: org._id, key: "application_received", to: email, vars: { candidate: name, job: job.title }, candidate: candidate._id }))
        return res.status(201).json({ ok: true })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "You've already applied to this job" })
        return res.status(500).json({ message: `failed to apply ${error}` })
    }
}
