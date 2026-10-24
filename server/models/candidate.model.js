import mongoose from "mongoose";

export const SOURCES = ["applied", "manual", "import", "referral", "sourced", "careers"]

// A person in a workspace's talent pool. Created automatically when a student applies,
// or added by a recruiter (by hand or from a CSV), even if they never use HireLoop.
const candidateSchema = new mongoose.Schema({
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    headline: { type: String, default: "" },
    location: { type: String, default: "" },
    currentCompany: { type: String, default: "" },
    skills: { type: [String], default: [] },
    tags: { type: [String], default: [], index: true },
    source: { type: String, enum: SOURCES, default: "manual" },
    resumeUrl: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    summary: { type: String, default: "" },
    // set when the candidate is a HireLoop student (applied through the jobs board)
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true })

// one person per email per workspace (candidates without an email are allowed)
candidateSchema.index({ org: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $gt: "" } } })

const Candidate = mongoose.model("Candidate", candidateSchema)

export default Candidate
