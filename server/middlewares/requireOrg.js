import User from "../models/user.model.js"

const LEVEL = { viewer: 1, recruiter: 2, admin: 3 }

// Use after isAuth. Requires a company account inside a workspace with at least `minRole`
// (viewer < recruiter < admin) and sets req.orgId / req.orgRole for the controllers.
const requireOrg = (minRole = "viewer") => async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select("role org orgRole")
        if (!user) return res.status(404).json({ message: "user does not found" })
        if (user.role !== "company" || !user.org) {
            return res.status(403).json({ message: "Only company accounts can do this" })
        }
        if ((LEVEL[user.orgRole] || 0) < LEVEL[minRole]) {
            return res.status(403).json({ message: `This needs ${minRole} access in your workspace` })
        }
        req.orgId = user.org
        req.orgRole = user.orgRole
        next()
    } catch (error) {
        return res.status(500).json({ message: `workspace check error ${error}` })
    }
}

// for routes that only need to know the level (e.g. the interview room)
export const canManageInterviews = (user, interview) =>
    Boolean(user && interview.org && user.role === "company" && String(user.org) === String(interview.org) && LEVEL[user.orgRole] >= LEVEL.recruiter)

export default requireOrg
