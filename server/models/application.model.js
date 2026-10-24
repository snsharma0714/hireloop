import mongoose from "mongoose";

export const PIPELINE = ["applied", "screening", "interview", "offer", "hired", "rejected"]

const applicationSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    // the talent-pool person; `student` is only set when they applied through HireLoop
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    status: { type: String, enum: PIPELINE, default: "applied" },
    coverNote: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },
    // the student agreed to let this company see their practice record
    shareStats: { type: Boolean, default: false },
    notes: [{
        text: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now }
    }],
    history: [{
        status: String,
        at: { type: Date, default: Date.now }
    }],
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "ScheduledInterview", default: null },
    // answers to the job's screening questions; `ok` is false when an answer misses the expected one
    answers: [{
        question: String,
        answer: String,
        ok: { type: Boolean, default: null },
        _id: false
    }],
    // null = the job had no expected answers, false = at least one answer didn't fit
    screeningPassed: { type: Boolean, default: null }
}, { timestamps: true })

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true })

const Application = mongoose.model("Application", applicationSchema)

export default Application
