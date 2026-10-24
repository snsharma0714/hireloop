import mongoose from "mongoose";

const proctorEventSchema = new mongoose.Schema({
    type: { type: String },
    message: { type: String },
    at: { type: Date, default: Date.now }
}, { _id: false })

// A question asked in a hiring interview: one of the built-in problems (with tests) or one the interviewer wrote
const questionSchema = new mongoose.Schema({
    kind: { type: String, enum: ["builtin", "custom"], required: true },
    slug: { type: String, default: "" },
    title: { type: String, required: true },
    difficulty: { type: String, default: "" },
    description: { type: String, default: "" },
    askedAt: { type: Date, default: Date.now },
    // the candidate's code for this question, saved when the interviewer moves on or ends the interview
    code: { type: String, default: "" },
    language: { type: String, default: "" },
    submissions: { type: Number, default: 0 },
    best: {
        verdict: String,
        passed: Number,
        total: Number,
        language: String,
        at: Date
    }
})

const scheduledInterviewSchema = new mongoose.Schema({
    interviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // hiring = company interview with a candidate link; peer = practice session between two users
    type: { type: String, enum: ["hiring", "peer"], default: "hiring" },
    title: { type: String, required: true },
    companyName: { type: String, default: "" },
    candidateName: { type: String, required: function () { return this.type === "hiring" } },
    // people added to the talent pool by hand may not have an email; they get the link another way
    candidateEmail: { type: String, default: "", required: function () { return this.type === "hiring" && !this.application } },
    scheduledAt: { type: Date, default: Date.now },
    // peer sessions: the problem being solved, whether it's listed publicly, and who joined
    problemSlug: { type: String, default: "" },
    isPublic: { type: Boolean, default: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // hiring interviews belong to a company workspace; any recruiter in it can manage them
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    // hiring interviews scheduled from a job application
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null },
    candidateUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    durationMin: { type: Number, default: 60 },
    description: { type: String, default: "" },
    // secret token that makes up the candidate's unique link
    token: { type: String, required: true, unique: true, index: true },
    status: {
        type: String,
        enum: ["scheduled", "live", "completed", "cancelled"],
        default: "scheduled"
    },
    code: { type: String, default: "" },
    language: { type: String, default: "javascript" },
    proctorEvents: [proctorEventSchema],
    // hiring interviews: questions the interviewer has asked, and which one is on screen (-1 = none)
    questions: [questionSchema],
    currentQuestion: { type: Number, default: -1 },
    scorecard: {
        problemSolving: { type: Number, min: 0, max: 5, default: 0 },
        coding: { type: Number, min: 0, max: 5, default: 0 },
        communication: { type: Number, min: 0, max: 5, default: 0 },
        fundamentals: { type: Number, min: 0, max: 5, default: 0 },
        notes: { type: String, default: "" },
        verdict: {
            type: String,
            enum: ["", "strong_hire", "hire", "no_hire", "strong_no_hire"],
            default: ""
        }
    },
    aiSummary: { type: String, default: "" },
    startedAt: { type: Date },
    endedAt: { type: Date }

}, { timestamps: true })

const ScheduledInterview = mongoose.model("ScheduledInterview", scheduledInterviewSchema)

export default ScheduledInterview
