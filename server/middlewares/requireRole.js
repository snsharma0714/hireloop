import User from "../models/user.model.js"

// Use after isAuth. Lets the request through only for users with the given role.
const requireRole = (role) => async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select("role")
        if (!user) return res.status(404).json({ message: "user does not found" })
        if (user.role !== role) {
            return res.status(403).json({ message: `Only ${role} accounts can do this` })
        }
        next()
    } catch (error) {
        return res.status(500).json({ message: `role check error ${error}` })
    }
}

export default requireRole
