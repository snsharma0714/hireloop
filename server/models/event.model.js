import mongoose from "mongoose";

export const EVENT_KINDS = ["meeting", "call", "interview", "reminder", "other"]

// Calendar entries a team adds by hand (phone screens, debriefs, reminders...).
// Live-room interviews stay in ScheduledInterview; the calendar shows both.
const eventSchema = new mongoose.Schema({
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    title: { type: String, required: true, trim: true },
    kind: { type: String, enum: EVENT_KINDS, default: "meeting" },
    start: { type: Date, required: true },
    durationMin: { type: Number, default: 30, min: 5, max: 1440 },
    allDay: { type: Boolean, default: false },
    // a room, an address or a meeting link
    location: { type: String, default: "" },
    notes: { type: String, default: "" },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true })

eventSchema.index({ org: 1, start: 1 })

const Event = mongoose.model("Event", eventSchema)

export default Event
