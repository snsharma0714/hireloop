import mongoose from "mongoose";

// A company workspace. Jobs, applicants and interviews belong to the workspace, not to one recruiter.
const organizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // used for the public careers page URL: /careers/<slug>
    slug: { type: String, required: true, unique: true, index: true },
    website: { type: String, default: "" },
    about: { type: String, default: "" },
    // public careers page
    tagline: { type: String, default: "" },
    careersEnabled: { type: Boolean, default: true },
    // used to write interview times in emails
    timezone: { type: String, default: "Asia/Kolkata" },
    // automatic emails to candidates
    emailSettings: {
        enabled: { type: Boolean, default: true },
        onApply: { type: Boolean, default: true },
        onStages: { type: [String], default: ["interview", "offer", "hired"] },
        onReject: { type: Boolean, default: false },
        onInterview: { type: Boolean, default: true },
        replyTo: { type: String, default: "" }
    },
    // the workspace's own wording; missing keys fall back to the defaults in mail.service.js
    emailTemplates: { type: Map, of: new mongoose.Schema({ subject: String, body: String }, { _id: false }), default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true })

const Organization = mongoose.model("Organization", organizationSchema)

export default Organization
