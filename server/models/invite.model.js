import mongoose from "mongoose";

export const ORG_ROLES = ["admin", "recruiter", "viewer"]

// An admin invites a teammate by email; the invite link works only for a Google account with that email
const inviteSchema = new mongoose.Schema({
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    orgRole: { type: String, enum: ORG_ROLES, default: "recruiter" },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acceptedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true }
}, { timestamps: true })

const Invite = mongoose.model("Invite", inviteSchema)

export default Invite
