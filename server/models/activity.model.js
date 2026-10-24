import mongoose from "mongoose";

// logged by recruiters
export const MANUAL_TYPES = ["note", "call", "email", "meeting"]
// logged by the system
export const SYSTEM_TYPES = ["applied", "added", "imported", "stage_change", "interview_scheduled", "added_to_job", "merged", "event_scheduled", "email_sent"]

const activitySchema = new mongoose.Schema({
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    type: { type: String, enum: [...MANUAL_TYPES, ...SYSTEM_TYPES], required: true },
    text: { type: String, default: "" },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: Date.now }
}, { timestamps: true })

activitySchema.index({ candidate: 1, at: -1 })

const Activity = mongoose.model("Activity", activitySchema)

export default Activity
