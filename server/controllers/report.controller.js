import mongoose from "mongoose"
import Application from "../models/application.model.js"
import Job from "../models/job.model.js"
import Candidate from "../models/candidate.model.js"
import Activity from "../models/activity.model.js"
import ScheduledInterview from "../models/scheduledInterview.model.js"
import User from "../models/user.model.js"

const DAY = 24 * 3600 * 1000
const FUNNEL = ["applied", "screening", "interview", "offer", "hired"]
const validDate = (v) => v && !isNaN(new Date(v).getTime())

// from/to/job from the query string; defaults to the last 90 days
const rangeOf = (query) => {
    const to = validDate(query.to) ? new Date(query.to) : new Date()
    const from = validDate(query.from) ? new Date(query.from) : new Date(to.getTime() - 90 * DAY)
    const job = mongoose.isValidObjectId(query.job) ? new mongoose.Types.ObjectId(query.job) : null
    return { from, to, job }
}

const applicationsIn = (orgId, { from, to, job }) =>
    Application.find({ org: orgId, createdAt: { $gte: from, $lte: to }, ...(job ? { job } : {}) })
        .populate("candidate", "name email phone source")
        .populate("job", "title")
        .populate("interview", "scorecard.verdict status")
        .lean()

// furthest funnel stage an application ever reached (rejected people keep the stage they got to)
const reachedIndex = (app) => Math.max(...[app.status, ...(app.history || []).map(h => h.status)].map(s => FUNNEL.indexOf(s)))
const firstAt = (app, minIndex) => (app.history || []).find(h => FUNNEL.indexOf(h.status) >= minIndex)?.at
const daysBetween = (a, b) => (new Date(b) - new Date(a)) / DAY

const summarize = (list) => {
    if (!list.length) return { count: 0, avg: null, median: null, fastest: null }
    const sorted = [...list].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const round = (n) => Math.round(n * 10) / 10
    return {
        count: list.length,
        avg: round(list.reduce((a, b) => a + b, 0) / list.length),
        median: round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2),
        fastest: round(sorted[0])
    }
}

export const getReport = async (req, res) => {
    try {
        const range = rangeOf(req.query)
        const orgId = new mongoose.Types.ObjectId(req.orgId)
        const [apps, jobs, newCandidates, interviews, activity] = await Promise.all([
            applicationsIn(orgId, range),
            Job.find({ org: orgId }).select("title status createdAt").sort({ createdAt: -1 }).lean(),
            Candidate.countDocuments({ org: orgId, createdAt: { $gte: range.from, $lte: range.to } }),
            ScheduledInterview.find({ org: orgId, type: { $ne: "peer" }, scheduledAt: { $gte: range.from, $lte: range.to } })
                .select("status interviewer scorecard application").lean(),
            Activity.aggregate([
                { $match: { org: orgId, by: { $ne: null }, at: { $gte: range.from, $lte: range.to } } },
                { $group: { _id: { by: "$by", type: "$type" }, n: { $sum: 1 } } }
            ])
        ])
        const jobApps = range.job ? new Set(apps.map(a => String(a._id))) : null
        const ivs = jobApps ? interviews.filter(iv => iv.application && jobApps.has(String(iv.application))) : interviews

        // funnel
        const funnel = FUNNEL.map((stage, i) => ({ stage, count: apps.filter(a => reachedIndex(a) >= i).length }))
        const rejected = apps.filter(a => a.status === "rejected").length

        // speed
        const hired = apps.filter(a => a.status === "hired")
        const timeToHire = summarize(hired.map(a => daysBetween(a.createdAt, firstAt(a, 4) || a.updatedAt)).filter(d => d >= 0))
        const timeToInterview = summarize(apps.map(a => firstAt(a, 2) && daysBetween(a.createdAt, firstAt(a, 2))).filter(d => typeof d === "number" && d >= 0))

        // sources
        const bySource = {}
        for (const a of apps) {
            const s = a.candidate?.source || "manual"
            bySource[s] = bySource[s] || { source: s, applicants: 0, interviewed: 0, hired: 0 }
            bySource[s].applicants++
            if (reachedIndex(a) >= 2) bySource[s].interviewed++
            if (a.status === "hired") bySource[s].hired++
        }

        // per job
        const byJobMap = {}
        for (const a of apps) {
            const key = String(a.job?._id)
            byJobMap[key] = byJobMap[key] || { jobId: a.job?._id, title: a.job?.title || "Deleted job", total: 0, ...Object.fromEntries([...FUNNEL, "rejected"].map(s => [s, 0])) }
            byJobMap[key].total++
            byJobMap[key][a.status]++
        }
        const byJob = Object.values(byJobMap).map(j => ({ ...j, status: jobs.find(x => String(x._id) === String(j.jobId))?.status || "closed" }))
            .sort((a, b) => b.total - a.total)

        // applications and hires per week
        const weeks = []
        const weekCount = Math.min(26, Math.max(1, Math.ceil((range.to - range.from) / (7 * DAY))))
        const firstWeek = new Date(range.to.getTime() - weekCount * 7 * DAY)
        for (let i = 0; i < weekCount; i++) {
            const start = new Date(firstWeek.getTime() + i * 7 * DAY), end = new Date(start.getTime() + 7 * DAY)
            weeks.push({
                week: start.toISOString().slice(0, 10),
                applications: apps.filter(a => new Date(a.createdAt) >= start && new Date(a.createdAt) < end).length,
                hires: hired.filter(a => { const at = new Date(firstAt(a, 4) || a.updatedAt); return at >= start && at < end }).length
            })
        }

        // interviews
        const verdicts = { strong_hire: 0, hire: 0, no_hire: 0, strong_no_hire: 0 }
        const scored = ivs.filter(iv => iv.scorecard?.verdict)
        for (const iv of scored) verdicts[iv.scorecard.verdict]++
        const avgScore = (k) => scored.length ? Math.round(scored.reduce((n, iv) => n + (iv.scorecard[k] || 0), 0) / scored.length * 10) / 10 : null

        // team activity
        const teamIds = [...new Set([...activity.map(a => String(a._id.by)), ...ivs.map(iv => String(iv.interviewer))])]
        const people = await User.find({ _id: { $in: teamIds } }).select("name").lean()
        const team = people.map(p => {
            const mine = activity.filter(a => String(a._id.by) === String(p._id))
            const count = (...types) => mine.filter(a => types.includes(a._id.type)).reduce((n, a) => n + a.n, 0)
            return {
                name: p.name,
                calls: count("call"), emails: count("email", "email_sent"), meetings: count("meeting", "event_scheduled"),
                notes: count("note"), stageMoves: count("stage_change"),
                interviews: ivs.filter(iv => String(iv.interviewer) === String(p._id) && iv.status === "completed").length
            }
        }).sort((a, b) => (b.stageMoves + b.interviews) - (a.stageMoves + a.interviews))

        return res.status(200).json({
            range: { from: range.from, to: range.to, job: range.job },
            jobs: jobs.map(j => ({ _id: j._id, title: j.title, status: j.status })),
            totals: {
                applications: apps.length, newCandidates, hired: hired.length, rejected,
                active: apps.filter(a => !["hired", "rejected"].includes(a.status)).length,
                openJobs: jobs.filter(j => j.status === "open").length
            },
            funnel, timeToHire, timeToInterview,
            sources: Object.values(bySource).sort((a, b) => b.applicants - a.applicants),
            byJob, weeks,
            screening: {
                passed: apps.filter(a => a.screeningPassed === true).length,
                failed: apps.filter(a => a.screeningPassed === false).length,
                failedButHired: apps.filter(a => a.screeningPassed === false && a.status === "hired").length
            },
            interviews: {
                scheduled: ivs.length,
                completed: ivs.filter(iv => iv.status === "completed").length,
                cancelled: ivs.filter(iv => iv.status === "cancelled").length,
                verdicts,
                averages: Object.fromEntries(["problemSolving", "coding", "communication", "fundamentals"].map(k => [k, avgScore(k)]))
            },
            team
        })
    } catch (error) {
        return res.status(500).json({ message: `failed to build report ${error}` })
    }
}

const csvCell = (v) => {
    const s = String(v ?? "")
    // a leading = + - @ would run as a formula in Excel
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

// Every application in the range as a spreadsheet
export const exportApplications = async (req, res) => {
    try {
        const range = rangeOf(req.query)
        const apps = await applicationsIn(new mongoose.Types.ObjectId(req.orgId), range)
        const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "")
        const rows = [["Candidate", "Email", "Phone", "Source", "Job", "Stage", "Applied on", "Last stage change", "Days in pipeline", "Screening", "Interview verdict"]]
        for (const a of apps) {
            const last = (a.history || []).at(-1)?.at
            rows.push([
                a.candidate?.name, a.candidate?.email, a.candidate?.phone, a.candidate?.source, a.job?.title, a.status,
                day(a.createdAt), day(last), Math.round(daysBetween(a.createdAt, ["hired", "rejected"].includes(a.status) ? last || a.updatedAt : new Date())),
                a.screeningPassed === null || a.screeningPassed === undefined ? "" : a.screeningPassed ? "passed" : "flagged",
                a.interview?.scorecard?.verdict || ""
            ])
        }
        res.setHeader("Content-Type", "text/csv; charset=utf-8")
        res.setHeader("Content-Disposition", `attachment; filename="applications-${day(range.from)}-to-${day(range.to)}.csv"`)
        // BOM so Excel reads names in any language correctly
        return res.status(200).send("﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n"))
    } catch (error) {
        return res.status(500).json({ message: `failed to export ${error}` })
    }
}
