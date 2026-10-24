import mongoose from "mongoose";

// One row per user per problem. `key` is the LeetCode slug, so progress is shared across sheets.
const sheetProgressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    key: { type: String, required: true },
    solved: { type: Boolean, default: false },
    revisit: { type: Boolean, default: false },
    solvedAt: { type: Date }
}, { timestamps: true })

sheetProgressSchema.index({ user: 1, key: 1 }, { unique: true })

const SheetProgress = mongoose.model("SheetProgress", sheetProgressSchema)

export default SheetProgress
