import jwt from "jsonwebtoken"

// Like isAuth, but lets the request through without a user.
// Used by routes a candidate opens from their invite link without logging in.
const optionalAuth = (req, res, next) => {
    try {
        const { token } = req.cookies
        if (token) {
            const verifyToken = jwt.verify(token, process.env.JWT_SECRET)
            req.userId = verifyToken?.userId
        }
    } catch (error) {
        req.userId = undefined
    }
    next()
}

export default optionalAuth
