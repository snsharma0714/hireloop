import mongoose from "mongoose";

// A named shortlist of candidates, e.g. "Frontend - strong maybes"
const savedListSchema = new mongoose.Schema({
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Candidate" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true })

const SavedList = mongoose.model("SavedList", savedListSchema)

export default SavedList
