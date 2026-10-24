import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { chooseRole, getCurrentUser, updateProfile } from "../controllers/user.controller.js"


const userRouter = express.Router()

userRouter.get("/current-user",isAuth,getCurrentUser)
userRouter.post("/role",isAuth,chooseRole)
userRouter.patch("/profile",isAuth,updateProfile)

export default userRouter
