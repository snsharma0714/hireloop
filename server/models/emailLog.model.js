import mongoose from "mongoose";

// Every email the workspace sends (or would have sent), so the team can see what went out
const emailLogSchema = new mongoose.Schema({
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    to: { type: String, default: "" },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
    // template key, "manual" (written by a recruiter) or "invite"
    template: { type: String, default: "manual" },
    // sent | failed | skipped (no address, or email not set up on the server)
    status: { type: String, enum: ["queued", "sent", "failed", "skipped"], default: "queued" },
    error: { type: String, default: "" },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true })

emailLogSchema.index({ org: 1, createdAt: -1 })

const EmailLog = mongoose.model("EmailLog", emailLogSchema)

export default EmailLog
