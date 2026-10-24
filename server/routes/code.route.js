import express from "express"
import optionalAuth from "../middlewares/optionalAuth.js"
import { runCode } from "../controllers/code.controller.js"

const codeRouter = express.Router()

codeRouter.post("/run", optionalAuth, runCode)

export default codeRouter
