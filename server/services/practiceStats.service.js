import mongoose from "mongoose"
import Submission from "../models/submission.model.js"
import SheetProgress from "../models/sheetProgress.model.js"
import ScheduledInterview from "../models/scheduledInterview.model.js"
import { listProblems } from "../practice/problems.js"

// slug -> "solved" | "attempted"
export const statusMap = async (userId) => {
    if (!userId) return {}
    const rows = await Submission.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: "$problemSlug", accepted: { $max: { $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0] } } } }
    ])
    return Object.fromEntries(rows.map(r => [r._id, r.accepted ? "solved" : "attempted"]))
}

// Everything the student's own practice page shows
export const computeStats = async (userId) => {
    const status = await statusMap(userId)
    const problems = listProblems()
    const byDifficulty = { Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } }
    for (const p of problems) {
        byDifficulty[p.difficulty].total++
        if (status[p.slug] === "solved") byDifficulty[p.difficulty].solved++
    }

    const since = new Date(Date.now() - 366 * 24 * 3600 * 1000)
    const [accepted, sheetSolved, sheetSolvedCount, recent] = await Promise.all([
        Submission.find({ user: userId, verdict: "Accepted", createdAt: { $gte: since } }).select("createdAt -_id").limit(5000),
        SheetProgress.find({ user: userId, solved: true, solvedAt: { $gte: since } }).select("solvedAt -_id").limit(5000),
        SheetProgress.countDocuments({ user: userId, solved: true }),
        Submission.find({ user: userId }).sort({ createdAt: -1 }).limit(8).select("problemSlug verdict language createdAt")
    ])

    const titles = Object.fromEntries(problems.map(p => [p.slug, p.title]))
    return {
        byDifficulty,
        sheetSolved: sheetSolvedCount,
        // timestamps; the client groups them by its own local day
        activity: [...accepted.map(s => s.createdAt), ...sheetSolved.map(s => s.solvedAt)],
        recent: recent.map(s => ({ ...s.toObject(), title: titles[s.problemSlug] || s.problemSlug }))
    }
}

const utcDay = (d) => new Date(d).toISOString().slice(0, 10)

// What a company sees about an applicant who agreed to share their practice record
export const candidateSummary = async (userId) => {
    const stats = await computeStats(userId)
    const days = new Set(stats.activity.map(utcDay))

    let streak = 0
    const day = new Date()
    if (!days.has(utcDay(day))) day.setUTCDate(day.getUTCDate() - 1)
    while (days.has(utcDay(day))) {
        streak++
        day.setUTCDate(day.getUTCDate() - 1)
    }
    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000

    const [sessionsCompleted, acceptedSubs] = await Promise.all([
        ScheduledInterview.countDocuments({ type: "peer", status: "completed", $or: [{ interviewer: userId }, { participant: userId }] }),
        Submission.find({ user: userId, verdict: "Accepted" }).sort({ createdAt: -1 }).select("problemSlug language createdAt")
    ])

    const titles = Object.fromEntries(listProblems().map(p => [p.slug, { title: p.title, difficulty: p.difficulty }]))
    const solvedList = []
    const seen = new Set()
    for (const s of acceptedSubs) {
        if (seen.has(s.problemSlug)) continue
        seen.add(s.problemSlug)
        solvedList.push({ ...titles[s.problemSlug], language: s.language, at: s.createdAt })
    }

    return {
        byDifficulty: stats.byDifficulty,
        solved: Object.values(stats.byDifficulty).reduce((n, d) => n + d.solved, 0),
        sheetSolved: stats.sheetSolved,
        streak,
        activeDaysLast30: [...days].filter(d => new Date(d).getTime() >= monthAgo).length,
        sessionsCompleted,
        languages: [...new Set(acceptedSubs.map(s => s.language))],
        recentSolved: solvedList.slice(0, 8)
    }
}
