import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    problemSlug: { type: String, required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    verdict: {
        type: String,
        enum: ["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", "Compilation Error"],
        required: true
    },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    time: { type: Number },
    memory: { type: Number }
}, { timestamps: true })

submissionSchema.index({ user: 1, problemSlug: 1, createdAt: -1 })

const Submission = mongoose.model("Submission", submissionSchema)

export default Submission
