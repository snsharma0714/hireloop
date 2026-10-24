import mongoose from "mongoose";

export const QUESTION_KINDS = ["text", "yesno", "choice"]

const jobSchema = new mongoose.Schema({
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    location: { type: String, default: "" },
    type: { type: String, enum: ["Full-time", "Internship", "Part-time", "Contract"], default: "Full-time" },
    remote: { type: Boolean, default: false },
    experience: { type: String, default: "" },
    salary: { type: String, default: "" },
    description: { type: String, required: true },
    skills: { type: [String], default: [] },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    // asked on the application form; `expected` (yes/no and choice only) flags answers that don't fit
    questions: [{
        text: { type: String, required: true },
        kind: { type: String, enum: QUESTION_KINDS, default: "text" },
        options: { type: [String], default: [] },
        required: { type: Boolean, default: true },
        expected: { type: String, default: "" }
    }]
}, { timestamps: true })

const Job = mongoose.model("Job", jobSchema)

export default Job
