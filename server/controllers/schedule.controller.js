import crypto from "crypto"
import ScheduledInterview from "../models/scheduledInterview.model.js"
import { askAi } from "../services/openRouter.service.js"
import { getProblem } from "../practice/problems.js"
import User from "../models/user.model.js"
import { canManageInterviews } from "../middlewares/requireOrg.js"
import Application from "../models/application.model.js"
import { APP_URL, inBackground, sendTemplate } from "../services/mail.service.js"
import { codeProblem, handleJudgeError, runAllTests, runSamples } from "../services/judge.service.js"
import { firstQuestionFields } from "../services/interviewQuestion.service.js"

const inviteVars = (iv) => ({ candidate: iv.candidateName, job: iv.title, at: iv.scheduledAt, duration: iv.durationMin, link: `${APP_URL()}/room/${iv.token}` })

// Fields a candidate is allowed to see about their interview
const publicView = (interview) => ({
    _id: interview._id,
    title: interview.title,
    companyName: interview.companyName,
    candidateName: interview.candidateName,
    scheduledAt: interview.scheduledAt,
    durationMin: interview.durationMin,
    description: interview.description,
    status: interview.status,
    code: interview.code,
    language: interview.language,
    interviewerName: interview.interviewer?.name,
    type: interview.type,
    problemSlug: interview.problemSlug
})

const problemInfo = (slug) => {
    const p = slug && getProblem(slug)
    return p ? { slug: p.slug, title: p.title, difficulty: p.difficulty } : null
}

export const createSchedule = async (req, res) => {
    try {
        const { title, companyName, candidateName, candidateEmail, scheduledAt, durationMin, description, problemSlug } = req.body

        if (!title || !candidateName || !candidateEmail || !scheduledAt) {
            return res.status(400).json({ message: "Title, candidate name, email and time are required" })
        }
        if (isNaN(new Date(scheduledAt).getTime())) {
            return res.status(400).json({ message: "Invalid interview time" })
        }

        const interview = await ScheduledInterview.create({
            interviewer: req.userId,
            org: req.orgId,
            title,
            companyName,
            candidateName,
            candidateEmail: candidateEmail.trim().toLowerCase(),
            scheduledAt,
            durationMin: Number(durationMin) || 60,
            description,
            token: crypto.randomBytes(16).toString("hex"),
            ...firstQuestionFields(problemSlug)
        })
        inBackground(sendTemplate({ orgId: req.orgId, key: "interview_scheduled", to: interview.candidateEmail, vars: inviteVars(interview), by: req.userId }))

        return res.status(201).json(interview)
    } catch (error) {
        return res.status(500).json({ message: `failed to schedule interview ${error}` })
    }
}

export const getMySchedules = async (req, res) => {
    try {
        const interviews = await ScheduledInterview.find({ org: req.orgId, type: { $ne: "peer" } }).populate("interviewer", "name")
            .sort({ scheduledAt: -1 })
            .select("-code -proctorEvents")
        return res.status(200).json(interviews)
    } catch (error) {
        return res.status(500).json({ message: `failed to get interviews ${error}` })
    }
}

export const getScheduleById = async (req, res) => {
    try {
        const interview = await ScheduledInterview.findOne({ _id: req.params.id, org: req.orgId })
        if (!interview) {
            return res.status(404).json({ message: "Interview not found" })
        }
        return res.status(200).json(interview)
    } catch (error) {
        return res.status(500).json({ message: `failed to get interview ${error}` })
    }
}

export const updateSchedule = async (req, res) => {
    try {
        const allowed = ["title", "companyName", "candidateName", "candidateEmail", "scheduledAt", "durationMin", "description", "status", "scorecard"]
        const update = {}
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key]
        }
        if (update.status === "completed") update.endedAt = new Date()

        const before = await ScheduledInterview.findOne({ _id: req.params.id, org: req.orgId }).select("scheduledAt")
        const interview = await ScheduledInterview.findOneAndUpdate(
            { _id: req.params.id, org: req.orgId },
            update,
            { new: true, runValidators: true }
        )
        if (!interview) {
            return res.status(404).json({ message: "Interview not found" })
        }
        // tell the candidate when the time moves
        if (update.scheduledAt && interview.status === "scheduled" && before && before.scheduledAt.getTime() !== interview.scheduledAt.getTime()) {
            const app = interview.application && await Application.findById(interview.application).select("candidate")
            inBackground(sendTemplate({ orgId: req.orgId, key: "interview_updated", to: interview.candidateEmail, vars: inviteVars(interview), candidate: app?.candidate || null, by: req.userId }))
        }
        return res.status(200).json(interview)
    } catch (error) {
        return res.status(500).json({ message: `failed to update interview ${error}` })
    }
}

export const deleteSchedule = async (req, res) => {
    try {
        const interview = await ScheduledInterview.findOneAndDelete({ _id: req.params.id, org: req.orgId })
        if (!interview) {
            return res.status(404).json({ message: "Interview not found" })
        }
        return res.status(200).json({ message: "Interview deleted" })
    } catch (error) {
        return res.status(500).json({ message: `failed to delete interview ${error}` })
    }
}

// Opened from the unique link. The owner joins as interviewer; anyone else holding the link is the candidate.
export const getRoomByToken = async (req, res) => {
    try {
        const interview = await ScheduledInterview.findOne({ token: req.params.token }).populate("interviewer", "name")
        if (!interview) {
            return res.status(404).json({ message: "This interview link is invalid" })
        }

        const viewer = req.userId ? await User.findById(req.userId).select("role org orgRole") : null
        const isInterviewer = (req.userId && String(interview.interviewer._id) === String(req.userId)) || canManageInterviews(viewer, interview)
        if (viewer?.role === "company" && interview.org && String(viewer.org) === String(interview.org) && !isInterviewer) {
            return res.status(403).json({ message: "Viewers can't join interviews. Ask an admin for recruiter access." })
        }
        if (isInterviewer) {
            return res.status(200).json({ role: "interviewer", interview, problem: problemInfo(interview.problemSlug) })
        }

        // Peer practice sessions: logged-in users only, and at most one person besides the host
        if (interview.type === "peer") {
            if (!req.userId) {
                return res.status(401).json({ message: "Log in to join this practice session", needsLogin: true })
            }
            if (["completed", "cancelled"].includes(interview.status)) {
                return res.status(410).json({ message: "This session has ended" })
            }
            if (interview.participant && String(interview.participant) !== String(req.userId)) {
                return res.status(409).json({ message: "This session is full" })
            }
            return res.status(200).json({ role: "candidate", interview: publicView(interview), problem: problemInfo(interview.problemSlug) })
        }

        if (interview.status === "cancelled") {
            return res.status(410).json({ message: "This interview was cancelled" })
        }
        if (interview.status === "completed") {
            return res.status(410).json({ message: "This interview has already ended" })
        }
        return res.status(200).json({ role: "candidate", interview: publicView(interview) })
    } catch (error) {
        return res.status(500).json({ message: `failed to open interview room ${error}` })
    }
}

// Run / Submit against the interview's current question. Works for candidates without an account
// (the room link is the key), and nothing is saved to anyone's practice record.
export const judgeInRoom = async (req, res) => {
    try {
        const interview = await ScheduledInterview.findOne({ token: req.params.token }).select("type status questions currentQuestion")
        if (!interview || interview.type === "peer") return res.status(404).json({ message: "Interview not found" })
        if (["completed", "cancelled"].includes(interview.status)) return res.status(410).json({ message: "This interview has ended" })
        const index = interview.currentQuestion
        const q = interview.questions[index]
        if (!q || q.kind !== "builtin") return res.status(400).json({ message: "This question has no tests. Use Run with your own input instead." })
        const problem = getProblem(q.slug)
        if (!problem) return res.status(404).json({ message: "Problem not found" })
        const invalid = codeProblem(req.body)
        if (invalid) return res.status(400).json({ message: invalid })

        const { language, code } = req.body
        if (req.body.mode !== "submit") return res.status(200).json(await runSamples(problem, language, code))

        const result = await runAllTests(problem, language, code)
        // keep the best Submit for the scorecard
        const better = !q.best?.verdict || result.passed > (q.best.passed ?? -1)
        await ScheduledInterview.updateOne({ _id: interview._id }, {
            $inc: { [`questions.${index}.submissions`]: 1 },
            ...(better ? { $set: { [`questions.${index}.best`]: { verdict: result.verdict, passed: result.passed, total: result.total, language, at: new Date() } } } : {})
        })
        return res.status(200).json(result)
    } catch (error) {
        return handleJudgeError(res, error, "could not run the tests")
    }
}

export const generateAiSummary = async (req, res) => {
    try {
        const interview = await ScheduledInterview.findOne({ _id: req.params.id, org: req.orgId })
        if (!interview) {
            return res.status(404).json({ message: "Interview not found" })
        }

        const { scorecard } = interview
        const proctorLog = interview.proctorEvents.map(e => `- ${e.type}: ${e.message}`).join("\n") || "None"
        const questionLog = interview.questions.map((q, i) => {
            const result = q.kind === "builtin"
                ? (q.best?.verdict ? `best submit: ${q.best.verdict}, ${q.best.passed}/${q.best.total} tests (${q.best.language})` : "never submitted")
                : "interviewer's own question, no automatic tests"
            const code = q.code?.trim() ? `\nCode (${q.language}):\n${q.code.slice(0, 2500)}` : ""
            return `Q${i + 1}. ${q.title}${q.difficulty ? ` [${q.difficulty}]` : ""}: ${result}${q.description ? `\nQuestion: ${q.description.slice(0, 600)}` : ""}${code}`
        }).join("\n\n")

        const messages = [
            {
                role: "system",
                content: "You are a senior technical hiring manager. Write a concise, fair interview summary in markdown with sections: Overview, Strengths, Concerns, Code Review, Recommendation. Keep it under 250 words."
            },
            {
                role: "user",
                content: `Role: ${interview.title} at ${interview.companyName || "the company"}
Candidate: ${interview.candidateName}
Ratings (0-5): problem solving ${scorecard.problemSolving}, coding ${scorecard.coding}, communication ${scorecard.communication}, CS fundamentals ${scorecard.fundamentals}
Interviewer verdict: ${scorecard.verdict || "not given"}
Interviewer notes:
${scorecard.notes || "None"}

Proctoring events:
${proctorLog}

Questions asked:
${questionLog || "None recorded"}

Final code (${interview.language}):
${interview.code?.slice(0, 6000) || "No code written"}`
            }
        ]

        interview.aiSummary = await askAi(messages)
        await interview.save()
        return res.status(200).json({ aiSummary: interview.aiSummary })
    } catch (error) {
        return res.status(500).json({ message: `failed to generate AI summary ${error}` })
    }
}

// ---------- peer practice sessions ----------

export const createPeerSession = async (req, res) => {
    try {
        const { problemSlug, isPublic = true } = req.body
        const problem = getProblem(problemSlug)
        if (!problem) {
            return res.status(400).json({ message: "Pick a problem for the session" })
        }
        const session = await ScheduledInterview.create({
            type: "peer",
            interviewer: req.userId,
            title: problem.title,
            problemSlug,
            isPublic: Boolean(isPublic),
            durationMin: 60,
            token: crypto.randomBytes(16).toString("hex")
        })
        return res.status(201).json(session)
    } catch (error) {
        return res.status(500).json({ message: `failed to create session ${error}` })
    }
}

const peerCard = (s) => ({
    _id: s._id,
    token: s.token,
    title: s.title,
    status: s.status,
    isPublic: s.isPublic,
    problem: problemInfo(s.problemSlug),
    host: s.interviewer ? { _id: s.interviewer._id, name: s.interviewer.name } : null,
    participant: s.participant ? { _id: s.participant._id, name: s.participant.name } : null,
    createdAt: s.createdAt,
    endedAt: s.endedAt
})

// Public sessions still waiting for someone, newest first (sessions older than 6h are treated as abandoned)
export const getActivePeerSessions = async (req, res) => {
    try {
        const sessions = await ScheduledInterview.find({
            type: "peer",
            isPublic: true,
            status: { $in: ["scheduled", "live"] },
            createdAt: { $gte: new Date(Date.now() - 6 * 3600 * 1000) }
        })
            .populate("interviewer", "name")
            .populate("participant", "name")
            .sort({ createdAt: -1 })
            .limit(20)
        return res.status(200).json(sessions.map(peerCard))
    } catch (error) {
        return res.status(500).json({ message: `failed to get sessions ${error}` })
    }
}

export const getMyPeerSessions = async (req, res) => {
    try {
        const sessions = await ScheduledInterview.find({
            type: "peer",
            $or: [{ interviewer: req.userId }, { participant: req.userId }]
        })
            .populate("interviewer", "name")
            .populate("participant", "name")
            .sort({ createdAt: -1 })
            .limit(20)
        return res.status(200).json(sessions.map(peerCard))
    } catch (error) {
        return res.status(500).json({ message: `failed to get sessions ${error}` })
    }
}
