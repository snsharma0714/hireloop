import mongoose from "mongoose"
import Event, { EVENT_KINDS } from "../models/event.model.js"
import ScheduledInterview from "../models/scheduledInterview.model.js"
import Candidate from "../models/candidate.model.js"
import Job from "../models/job.model.js"
import User from "../models/user.model.js"
import { clean, logActivity } from "../services/candidate.service.js"

const DAY = 24 * 3600 * 1000
const validDate = (value) => value && !isNaN(new Date(value).getTime())

// One shape for both kinds of entry so the calendar doesn't care where they come from
const fromInterview = (iv, showLink) => ({
    _id: iv._id,
    source: "interview",
    kind: "interview",
    title: `Interview: ${iv.candidateName}`,
    start: iv.scheduledAt,
    durationMin: iv.durationMin,
    allDay: false,
    location: "HireLoop live room",
    notes: iv.description,
    status: iv.status,
    candidate: iv.application?.candidate ? { _id: iv.application.candidate, name: iv.candidateName } : null,
    job: iv.application?.job ? { _id: iv.application.job._id, title: iv.application.job.title } : { _id: null, title: iv.title },
    attendees: iv.interviewer ? [iv.interviewer] : [],
    createdBy: iv.interviewer,
    // the room link is only useful (and only shown) to people who can run interviews
    token: showLink ? iv.token : undefined
})

const fromEvent = (ev) => ({
    ...ev.toObject(),
    source: "event"
})

const populateEvent = (query) => query
    .populate("candidate", "name")
    .populate("job", "title")
    .populate("attendees", "name")
    .populate("createdBy", "name")

export const listCalendar = async (req, res) => {
    try {
        const from = validDate(req.query.from) ? new Date(req.query.from) : new Date(Date.now() - 7 * DAY)
        let to = validDate(req.query.to) ? new Date(req.query.to) : new Date(from.getTime() + 42 * DAY)
        if (to - from > 120 * DAY) to = new Date(from.getTime() + 120 * DAY)
        const mine = req.query.mine === "1"
        const me = new mongoose.Types.ObjectId(req.userId)

        const [interviews, events] = await Promise.all([
            ScheduledInterview.find({
                org: req.orgId, type: { $ne: "peer" }, status: { $ne: "cancelled" },
                scheduledAt: { $gte: from, $lt: to },
                ...(mine ? { interviewer: me } : {})
            }).select("candidateName title scheduledAt durationMin description status token interviewer application")
                .populate("interviewer", "name")
                .populate({ path: "application", select: "candidate job", populate: { path: "job", select: "title" } }),
            populateEvent(Event.find({
                org: req.orgId,
                start: { $gte: from, $lt: to },
                ...(mine ? { $or: [{ attendees: me }, { createdBy: me }] } : {})
            }))
        ])
        const showLink = req.orgRole !== "viewer"
        const items = [...interviews.map(iv => fromInterview(iv, showLink)), ...events.map(fromEvent)]
            .sort((a, b) => new Date(a.start) - new Date(b.start))
        return res.status(200).json({ from, to, items })
    } catch (error) {
        return res.status(500).json({ message: `failed to load calendar ${error}` })
    }
}

// Validates the body against this workspace; returns { error } or { fields }
const eventFields = async (body, orgId, partial) => {
    const out = {}
    if (body.title !== undefined || !partial) {
        out.title = clean(body.title, 150)
        if (!out.title) return { error: "Give the event a title" }
    }
    if (body.start !== undefined || !partial) {
        if (!validDate(body.start)) return { error: "Pick a valid date and time" }
        out.start = new Date(body.start)
    }
    if (body.kind !== undefined) out.kind = EVENT_KINDS.includes(body.kind) ? body.kind : "meeting"
    if (body.durationMin !== undefined) out.durationMin = Math.min(1440, Math.max(5, Number(body.durationMin) || 30))
    if (body.allDay !== undefined) out.allDay = Boolean(body.allDay)
    if (body.location !== undefined) out.location = clean(body.location, 300)
    if (body.notes !== undefined) out.notes = clean(body.notes, 3000)
    if (body.candidate !== undefined) {
        if (!body.candidate) out.candidate = null
        else if (!mongoose.isValidObjectId(body.candidate) || !(await Candidate.exists({ _id: body.candidate, org: orgId }))) {
            return { error: "Candidate not found" }
        } else out.candidate = body.candidate
    }
    if (body.job !== undefined) {
        if (!body.job) out.job = null
        else if (!mongoose.isValidObjectId(body.job) || !(await Job.exists({ _id: body.job, org: orgId }))) {
            return { error: "Job not found" }
        } else out.job = body.job
    }
    if (body.attendees !== undefined) {
        const ids = (Array.isArray(body.attendees) ? body.attendees : []).filter(id => mongoose.isValidObjectId(id)).slice(0, 30)
        // only people in this workspace
        const members = await User.find({ _id: { $in: ids }, org: orgId, role: "company" }).select("_id")
        out.attendees = members.map(m => m._id)
    }
    return { fields: out }
}

export const createEvent = async (req, res) => {
    try {
        const { error, fields } = await eventFields(req.body, req.orgId, false)
        if (error) return res.status(400).json({ message: error })
        if (!fields.attendees?.length) fields.attendees = [req.userId]
        const event = await Event.create({ ...fields, org: req.orgId, createdBy: req.userId })
        if (event.candidate) {
            const when = event.allDay ? event.start.toDateString() : event.start.toUTCString()
            await logActivity({ org: req.orgId, candidate: event.candidate, type: "event_scheduled", text: `${event.kind}: ${event.title} (${when})`, job: event.job, by: req.userId })
        }
        return res.status(201).json(fromEvent(await populateEvent(Event.findById(event._id))))
    } catch (error) {
        return res.status(500).json({ message: `failed to create event ${error}` })
    }
}

export const updateEvent = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Event not found" })
        const { error, fields } = await eventFields(req.body, req.orgId, true)
        if (error) return res.status(400).json({ message: error })
        const event = await populateEvent(Event.findOneAndUpdate({ _id: req.params.id, org: req.orgId }, fields, { new: true, runValidators: true }))
        if (!event) return res.status(404).json({ message: "Event not found" })
        return res.status(200).json(fromEvent(event))
    } catch (error) {
        return res.status(500).json({ message: `failed to update event ${error}` })
    }
}

export const deleteEvent = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Event not found" })
        const event = await Event.findOneAndDelete({ _id: req.params.id, org: req.orgId })
        if (!event) return res.status(404).json({ message: "Event not found" })
        return res.status(200).json({ ok: true })
    } catch (error) {
        return res.status(500).json({ message: `failed to delete event ${error}` })
    }
}
