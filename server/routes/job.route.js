import express from "express"
import isAuth from "../middlewares/isAuth.js"
import optionalAuth from "../middlewares/optionalAuth.js"
import requireRole from "../middlewares/requireRole.js"
import requireOrg from "../middlewares/requireOrg.js"
import {
    applyToJob, createJob, getJob, getJobApplications, getMyApplications, getMyJobs,
    listJobs, scheduleInterview, updateApplication, updateJob
} from "../controllers/job.controller.js"

const jobRouter = express.Router()
// viewers can look, recruiters and admins can change things
const viewer = [isAuth, requireOrg("viewer")]
const recruiter = [isAuth, requireOrg("recruiter")]
const student = [isAuth, requireRole("student")]

// order matters: fixed paths before "/:id"
jobRouter.get("/", optionalAuth, listJobs)
jobRouter.get("/mine", ...viewer, getMyJobs)
jobRouter.get("/applications/mine", ...student, getMyApplications)
jobRouter.patch("/applications/:id", ...recruiter, updateApplication)
jobRouter.post("/applications/:id/schedule", ...recruiter, scheduleInterview)
jobRouter.post("/", ...recruiter, createJob)
jobRouter.get("/:id", optionalAuth, getJob)
jobRouter.patch("/:id", ...recruiter, updateJob)
jobRouter.get("/:id/applications", ...viewer, getJobApplications)
jobRouter.post("/:id/apply", ...student, applyToJob)

export default jobRouter
