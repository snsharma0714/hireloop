import User from "../models/user.model.js"
import { createOrganization } from "../services/org.service.js"


export const getCurrentUser = async (req,res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId).populate("org", "name slug")
        if(!user) {
            return res.status(404).json({message:"user does not found"})
        }
        return res.status(200).json(user)
    } catch (error) {
         return res.status(500).json({message:`failed to get currentUser ${error}`})
    }
}

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max)

// One-time choice after the first login
export const chooseRole = async (req, res) => {
    try {
        const { role, companyName, companyWebsite } = req.body
        if (!["student", "company"].includes(role)) {
            return res.status(400).json({ message: "Choose student or company" })
        }
        if (role === "company" && !clean(companyName)) {
            return res.status(400).json({ message: "Company name is required" })
        }

        const user = await User.findById(req.userId)
        if (!user) return res.status(404).json({ message: "user does not found" })
        if (user.role) {
            return res.status(400).json({ message: "Account type is already set and can't be changed" })
        }

        user.role = role
        if (role === "company") {
            // the person who signs up as a company becomes the admin of a new workspace
            const org = await createOrganization({ name: clean(companyName, 100), website: clean(companyWebsite), createdBy: user._id })
            user.org = org._id
            user.orgRole = "admin"
        }
        await user.save()
        // same shape as /current-user, so the client has the workspace name right away
        await user.populate("org", "name slug")
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ message: `failed to set role ${error}` })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        if (!user) return res.status(404).json({ message: "user does not found" })

        const b = req.body
        if (b.name !== undefined && clean(b.name)) user.name = clean(b.name, 80)
        if (user.role === "student") {
            if (b.headline !== undefined) user.headline = clean(b.headline, 120)
            if (b.college !== undefined) user.college = clean(b.college, 120)
            if (b.graduationYear !== undefined) user.graduationYear = Number(b.graduationYear) || undefined
            if (Array.isArray(b.skills)) user.skills = b.skills.map(s => clean(s, 40)).filter(Boolean).slice(0, 20)
            if (b.resumeUrl !== undefined) {
                const url = clean(b.resumeUrl, 500)
                if (url && !/^https?:\/\//i.test(url)) return res.status(400).json({ message: "Resume link must start with http:// or https://" })
                user.resumeUrl = url
            }
        }
        // company details live on the workspace (PATCH /api/org)
        await user.save()
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ message: `failed to update profile ${error}` })
    }
}
