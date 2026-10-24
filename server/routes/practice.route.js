import express from "express"
import isAuth from "../middlewares/isAuth.js"
import optionalAuth from "../middlewares/optionalAuth.js"
import { analyzeCode, getHint, getProblemBySlug, getProblems, getStats, getSubmissions, runSamples, submitSolution } from "../controllers/practice.controller.js"

const practiceRouter = express.Router()

practiceRouter.get("/problems", optionalAuth, getProblems)
practiceRouter.get("/problems/:slug", optionalAuth, getProblemBySlug)
practiceRouter.post("/problems/:slug/run", isAuth, runSamples)
practiceRouter.post("/problems/:slug/submit", isAuth, submitSolution)
practiceRouter.get("/problems/:slug/submissions", isAuth, getSubmissions)
practiceRouter.post("/problems/:slug/hint", isAuth, getHint)
practiceRouter.post("/problems/:slug/analyze", isAuth, analyzeCode)
practiceRouter.get("/stats", isAuth, getStats)

export default practiceRouter
