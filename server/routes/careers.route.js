import express from "express"
import optionalAuth from "../middlewares/optionalAuth.js"
import { applyViaCareers, getCareersJob, getCareersPage } from "../controllers/careers.controller.js"

// public: anyone with the link can browse and apply
const careersRouter = express.Router()

careersRouter.get("/:slug", getCareersPage)
careersRouter.get("/:slug/jobs/:jobId", optionalAuth, getCareersJob)
careersRouter.post("/:slug/jobs/:jobId/apply", applyViaCareers)

export default careersRouter
