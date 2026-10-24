import mongoose from "mongoose"
import Candidate, { SOURCES } from "../models/candidate.model.js"
import Activity, { MANUAL_TYPES } from "../models/activity.model.js"
import Application, { PIPELINE } from "../models/application.model.js"
import Job from "../models/job.model.js"
import SavedList from "../models/savedList.model.js"
import ScheduledInterview from "../models/scheduledInterview.model.js"
import { clean, cleanList, logActivity, mapCsvRows, parseCsv, possibleDuplicates } from "../services/candidate.service.js"
import { candidateSummary } from "../services/practiceStats.service.js"
import Event from "../models/event.model.js"

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const isUrl = (url) => !url || /^https?:\/\//i.test(url)
const MAX_IMPORT = 2000

const candidateFields = (body) => {
    const out = {}
    for (const key of ["name", "phone", "headline", "location", "currentCompany", "resumeUrl", "linkedinUrl"]) {
        if (body[key] !== undefined) out[key] = clean(body[key], key.endsWith("Url") ? 500 : 150)
    }
    if (body.email !== undefined) out.email = clean(body.email, 150).toLowerCase()
    if (body.summary !== undefined) out.summary = clean(body.summary, 3000)
    if (body.skills !== undefined) out.skills = cleanList(body.skills)
    if (body.tags !== undefined) out.tags = cleanList(body.tags).map(t => t.toLowerCase())
    if (body.source !== undefined && SOURCES.includes(body.source)) out.source = body.source
    return out
}

const validate = (fields) => {
    if (fields.name !== undefined && !fields.name) return "Name is required"
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return "Enter a valid email"
    if (!isUrl(fields.resumeUrl) || !isUrl(fields.linkedinUrl)) return "Links must start with http:// or https://"
    return null
}

const dupError = (res, existing) =>
    res.status(409).json({ message: `${existing.name} already has that email in your talent pool`, existingId: existing._id })

// ---------- talent pool ----------

export const listCandidates = async (req, res) => {
    try {
        const { q, tag, source, list, page = 1 } = req.query
        const filter = { org: req.orgId }
        if (tag) filter.tags = String(tag).toLowerCase()
        if (source && SOURCES.includes(source)) filter.source = source
        if (list && mongoose.isValidObjectId(list)) {
            const saved = await SavedList.findOne({ _id: list, org: req.orgId })
            filter._id = { $in: saved?.candidates || [] }
        }
        if (q?.trim()) {
            const rx = new RegExp(escapeRegex(q.trim().slice(0, 60)), "i")
            filter.$or = [{ name: rx }, { email: rx }, { headline: rx }, { currentCompany: rx }, { skills: rx }, { tags: rx }, { location: rx }]
        }
        const limit = 50
        const skip = (Math.max(1, Number(page)) - 1) * limit
        const [total, candidates] = await Promise.all([
            Candidate.countDocuments(filter),
            Candidate.find(filter).sort({ lastActivityAt: -1 }).skip(skip).limit(limit)
                .select("name email headline location currentCompany tags source lastActivityAt student")
        ])
        const counts = await Application.aggregate([
            { $match: { candidate: { $in: candidates.map(c => c._id) } } },
            { $group: { _id: "$candidate", n: { $sum: 1 } } }
        ])
        const byId = Object.fromEntries(counts.map(c => [String(c._id), c.n]))
        return res.status(200).json({
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            candidates: candidates.map(c => ({ ...c.toObject(), applications: byId[String(c._id)] || 0 }))
        })
    } catch (error) {
        return res.status(500).json({ message: `failed to get candidates ${error}` })
    }
}

export const getTags = async (req, res) => {
    try {
        const rows = await Candidate.aggregate([
            { $match: { org: new mongoose.Types.ObjectId(req.orgId) } },
            { $unwind: "$tags" },
            { $group: { _id: "$tags", n: { $sum: 1 } } },
            { $sort: { n: -1, _id: 1 } },
            { $limit: 100 }
        ])
        return res.status(200).json(rows.map(r => ({ tag: r._id, count: r.n })))
    } catch (error) {
        return res.status(500).json({ message: `failed to get tags ${error}` })
    }
}

export const getCandidate = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Candidate not found" })
        const candidate = await Candidate.findOne({ _id: req.params.id, org: req.orgId }).populate("createdBy", "name")
        if (!candidate) return res.status(404).json({ message: "Candidate not found" })

        const [applications, activities, lists, duplicates, events] = await Promise.all([
            Application.find({ candidate: candidate._id })
                .populate("job", "title status")
                .populate("interview", "token scheduledAt status")
                .select("job status createdAt shareStats interview resumeUrl coverNote answers screeningPassed"),
            Activity.find({ candidate: candidate._id }).sort({ at: -1 }).limit(200).populate("by", "name").populate("job", "title"),
            SavedList.find({ org: req.orgId, candidates: candidate._id }).select("name"),
            possibleDuplicates(candidate),
            Event.find({ candidate: candidate._id }).sort({ start: -1 }).limit(20).populate("attendees", "name").populate("job", "title")
        ])
        // practice record only if they shared it on at least one application here
        const shared = candidate.student && applications.some(a => a.shareStats)
        return res.status(200).json({
            candidate,
            applications,
            activities,
            lists,
            duplicates,
            events,
            stats: shared ? await candidateSummary(candidate.student) : null
        })
    } catch (error) {
        return res.status(500).json({ message: `failed to get candidate ${error}` })
    }
}

export const createCandidate = async (req, res) => {
    try {
        const fields = candidateFields(req.body)
        const problem = validate({ name: fields.name ?? "", ...fields })
        if (problem) return res.status(400).json({ message: problem })
        if (fields.email) {
            const existing = await Candidate.findOne({ org: req.orgId, email: fields.email })
            if (existing) return dupError(res, existing)
        }
        const candidate = await Candidate.create({ source: "manual", ...fields, org: req.orgId, createdBy: req.userId })
        await logActivity({ org: req.orgId, candidate: candidate._id, type: "added", text: `Added to talent pool (${candidate.source})`, by: req.userId })
        return res.status(201).json(candidate)
    } catch (error) {
        return res.status(500).json({ message: `failed to add candidate ${error}` })
    }
}

export const updateCandidate = async (req, res) => {
    try {
        const fields = candidateFields(req.body)
        const problem = validate(fields)
        if (problem) return res.status(400).json({ message: problem })
        if (fields.email) {
            const existing = await Candidate.findOne({ org: req.orgId, email: fields.email, _id: { $ne: req.params.id } })
            if (existing) return dupError(res, existing)
        }
        const candidate = await Candidate.findOneAndUpdate({ _id: req.params.id, org: req.orgId }, fields, { new: true })
        if (!candidate) return res.status(404).json({ message: "Candidate not found" })
        return res.status(200).json(candidate)
    } catch (error) {
        return res.status(500).json({ message: `failed to update candidate ${error}` })
    }
}

export const deleteCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ _id: req.params.id, org: req.orgId })
        if (!candidate) return res.status(404).json({ message: "Candidate not found" })
        // a student's own application is their record too, so it can't be deleted from here
        if (await Application.exists({ candidate: candidate._id, student: { $ne: null } })) {
            return res.status(400).json({ message: "This candidate applied through HireLoop. Reject them on the job instead of deleting." })
        }
        await Promise.all([
            Application.deleteMany({ candidate: candidate._id }),
            Activity.deleteMany({ candidate: candidate._id }),
            // the team's calendar keeps the event, just without the person
            Event.updateMany({ candidate: candidate._id }, { candidate: null }),
            SavedList.updateMany({ org: req.orgId }, { $pull: { candidates: candidate._id } }),
            candidate.deleteOne()
        ])
        return res.status(200).json({ message: "Candidate deleted" })
    } catch (error) {
        return res.status(500).json({ message: `failed to delete candidate ${error}` })
    }
}

// ---------- activity timeline ----------

export const addActivity = async (req, res) => {
    try {
        const { type, text, jobId } = req.body
        if (!MANUAL_TYPES.includes(type)) return res.status(400).json({ message: "Pick note, call, email or meeting" })
        if (!clean(text)) return res.status(400).json({ message: "Write what happened" })
        const candidate = await Candidate.findOne({ _id: req.params.id, org: req.orgId }).select("_id")
        if (!candidate) return res.status(404).json({ message: "Candidate not found" })
        const job = jobId && mongoose.isValidObjectId(jobId) ? await Job.findOne({ _id: jobId, org: req.orgId }).select("_id") : null
        const activity = await logActivity({ org: req.orgId, candidate: candidate._id, type, text, job: job?._id || null, by: req.userId })
        await activity.populate([{ path: "by", select: "name" }, { path: "job", select: "title" }])
        return res.status(201).json(activity)
    } catch (error) {
        return res.status(500).json({ message: `failed to log activity ${error}` })
    }
}

// ---------- pipeline: put someone from the pool into a job ----------

export const addToJob = async (req, res) => {
    try {
        const { jobId, status = "applied" } = req.body
        if (!PIPELINE.includes(status)) return res.status(400).json({ message: "Unknown stage" })
        const [candidate, job] = await Promise.all([
            Candidate.findOne({ _id: req.params.id, org: req.orgId }),
            mongoose.isValidObjectId(jobId) ? Job.findOne({ _id: jobId, org: req.orgId }) : null
        ])
        if (!candidate || !job) return res.status(404).json({ message: "Candidate or job not found" })
        if (await Application.exists({ job: job._id, candidate: candidate._id })) {
            return res.status(409).json({ message: `${candidate.name} is already in this job's pipeline` })
        }
        const application = await Application.create({
            job: job._id,
            candidate: candidate._id,
            student: null,
            org: req.orgId,
            status,
            resumeUrl: candidate.resumeUrl,
            history: [{ status }]
        })
        await logActivity({ org: req.orgId, candidate: candidate._id, type: "added_to_job", text: `Added to ${job.title} (${status})`, job: job._id, by: req.userId })
        return res.status(201).json(application)
    } catch (error) {
        return res.status(500).json({ message: `failed to add to job ${error}` })
    }
}

// ---------- duplicates ----------

// Folds `id` into `intoId`: applications, activity and lists move over, empty fields are filled, tags/skills merged
export const mergeCandidates = async (req, res) => {
    try {
        const { intoId } = req.body
        if (String(intoId) === String(req.params.id)) return res.status(400).json({ message: "Pick a different candidate" })
        const [from, into] = await Promise.all([
            Candidate.findOne({ _id: req.params.id, org: req.orgId }),
            mongoose.isValidObjectId(intoId) ? Candidate.findOne({ _id: intoId, org: req.orgId }) : null
        ])
        if (!from || !into) return res.status(404).json({ message: "Candidate not found" })
        if (from.student && into.student && String(from.student) !== String(into.student)) {
            return res.status(400).json({ message: "Both are different HireLoop accounts, so they can't be merged" })
        }

        for (const key of ["phone", "headline", "location", "currentCompany", "resumeUrl", "linkedinUrl", "summary"]) {
            if (!into[key] && from[key]) into[key] = from[key]
        }
        if (!into.student && from.student) into.student = from.student
        into.tags = [...new Set([...into.tags, ...from.tags])]
        into.skills = [...new Set([...into.skills, ...from.skills])]

        // move applications unless `into` is already in that job
        const fromApps = await Application.find({ candidate: from._id })
        for (const app of fromApps) {
            const clash = await Application.findOne({ job: app.job, candidate: into._id })
            if (clash) {
                await ScheduledInterview.updateMany({ application: app._id }, { application: clash._id })
                await app.deleteOne()
            } else {
                app.candidate = into._id
                await app.save()
            }
        }
        await Activity.updateMany({ candidate: from._id }, { candidate: into._id })
        await Event.updateMany({ candidate: from._id }, { candidate: into._id })
        const lists = await SavedList.find({ org: req.orgId, candidates: from._id })
        for (const list of lists) {
            list.candidates = [...new Set([...list.candidates.map(String).filter(c => c !== String(from._id)), String(into._id)])]
            await list.save()
        }
        const fromName = `${from.name}${from.email ? ` <${from.email}>` : ""}`
        await from.deleteOne()
        if (!into.email && from.email) into.email = from.email
        await into.save()
        await logActivity({ org: req.orgId, candidate: into._id, type: "merged", text: `Merged duplicate ${fromName}`, by: req.userId })
        return res.status(200).json(into)
    } catch (error) {
        return res.status(500).json({ message: `failed to merge ${error}` })
    }
}

// ---------- bulk actions from the list view ----------

export const bulkUpdate = async (req, res) => {
    try {
        const ids = (req.body.ids || []).filter(id => mongoose.isValidObjectId(id)).slice(0, 500)
        if (!ids.length) return res.status(400).json({ message: "Select some candidates" })
        const owned = await Candidate.find({ _id: { $in: ids }, org: req.orgId }).select("_id")
        const ownedIds = owned.map(c => c._id)
        const tag = clean(req.body.addTag, 40).toLowerCase()
        if (tag) await Candidate.updateMany({ _id: { $in: ownedIds } }, { $addToSet: { tags: tag } })
        if (req.body.listId) {
            const list = await SavedList.findOneAndUpdate({ _id: req.body.listId, org: req.orgId }, { $addToSet: { candidates: { $each: ownedIds } } }, { new: true })
            if (!list) return res.status(404).json({ message: "List not found" })
        }
        return res.status(200).json({ updated: ownedIds.length })
    } catch (error) {
        return res.status(500).json({ message: `failed to update candidates ${error}` })
    }
}

// ---------- CSV import ----------

export const importCandidates = async (req, res) => {
    try {
        const { csv, dryRun = true, onDuplicate = "skip", tag } = req.body
        if (!csv || typeof csv !== "string") return res.status(400).json({ message: "Upload a CSV file" })
        if (csv.length > 2 * 1024 * 1024) return res.status(400).json({ message: "CSV is larger than 2 MB" })

        const { columns, records } = mapCsvRows(parseCsv(csv))
        if (!columns.includes("name") && !columns.includes("firstName")) {
            return res.status(400).json({ message: "Couldn't find a Name column. Add a header row like: name,email,phone,skills,tags" })
        }
        if (records.length > MAX_IMPORT) return res.status(400).json({ message: `Import up to ${MAX_IMPORT} rows at a time` })

        // duplicates inside the file and against the pool
        const seen = new Set()
        const emails = records.map(r => r.email).filter(Boolean)
        const existing = await Candidate.find({ org: req.orgId, email: { $in: emails } }).select("email name")
        const existingByEmail = Object.fromEntries(existing.map(c => [c.email, c]))
        for (const r of records) {
            if (r.error) continue
            if (r.email && seen.has(r.email)) r.error = "duplicate row in file"
            else if (r.email && existingByEmail[r.email]) r.duplicateOf = existingByEmail[r.email].name
            if (r.email) seen.add(r.email)
        }

        const extraTag = clean(tag, 40).toLowerCase()
        const summary = {
            columns,
            total: records.length,
            valid: records.filter(r => !r.error && !r.duplicateOf).length,
            duplicates: records.filter(r => r.duplicateOf).length,
            errors: records.filter(r => r.error).length,
            preview: records.slice(0, 20)
        }
        if (dryRun) return res.status(200).json(summary)

        let created = 0, updated = 0
        for (const r of records) {
            if (r.error) continue
            const { line, error, duplicateOf, ...fields } = r
            void line; void error
            if (extraTag) fields.tags = [...new Set([...fields.tags, extraTag])]
            fields.tags = fields.tags.map(t => t.toLowerCase())
            if (duplicateOf) {
                if (onDuplicate !== "update") continue
                const c = existingByEmail[r.email]
                const set = Object.fromEntries(Object.entries(fields).filter(([k, v]) => v && (!Array.isArray(v) || v.length) && !["tags", "skills"].includes(k)))
                await Candidate.updateOne({ _id: c._id }, { $set: set, $addToSet: { tags: { $each: fields.tags }, skills: { $each: fields.skills } } })
                updated++
                continue
            }
            const candidate = await Candidate.create({ ...fields, org: req.orgId, source: "import", createdBy: req.userId })
            await logActivity({ org: req.orgId, candidate: candidate._id, type: "imported", text: "Imported from CSV", by: req.userId })
            created++
        }
        return res.status(200).json({ ...summary, created, updated })
    } catch (error) {
        return res.status(500).json({ message: `import failed ${error}` })
    }
}

// ---------- saved lists ----------

export const getLists = async (req, res) => {
    try {
        const lists = await SavedList.find({ org: req.orgId }).populate("createdBy", "name").sort({ updatedAt: -1 })
        return res.status(200).json(lists.map(l => ({ _id: l._id, name: l.name, count: l.candidates.length, createdBy: l.createdBy, updatedAt: l.updatedAt })))
    } catch (error) {
        return res.status(500).json({ message: `failed to get lists ${error}` })
    }
}

export const createList = async (req, res) => {
    try {
        const name = clean(req.body.name, 80)
        if (!name) return res.status(400).json({ message: "Name the list" })
        const list = await SavedList.create({ org: req.orgId, name, createdBy: req.userId, candidates: [] })
        return res.status(201).json(list)
    } catch (error) {
        return res.status(500).json({ message: `failed to create list ${error}` })
    }
}

export const updateList = async (req, res) => {
    try {
        const update = {}
        if (clean(req.body.name)) update.$set = { name: clean(req.body.name, 80) }
        if (Array.isArray(req.body.remove)) update.$pull = { candidates: { $in: req.body.remove.filter(id => mongoose.isValidObjectId(id)) } }
        const list = await SavedList.findOneAndUpdate({ _id: req.params.id, org: req.orgId }, update, { new: true })
        if (!list) return res.status(404).json({ message: "List not found" })
        return res.status(200).json(list)
    } catch (error) {
        return res.status(500).json({ message: `failed to update list ${error}` })
    }
}

export const deleteList = async (req, res) => {
    try {
        await SavedList.deleteOne({ _id: req.params.id, org: req.orgId })
        return res.status(200).json({ message: "List deleted" })
    } catch (error) {
        return res.status(500).json({ message: `failed to delete list ${error}` })
    }
}
