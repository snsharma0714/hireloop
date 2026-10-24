import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireOrg from "../middlewares/requireOrg.js"
import {
    addActivity, addToJob, bulkUpdate, createCandidate, createList, deleteCandidate, deleteList, getCandidate,
    getLists, getTags, importCandidates, listCandidates, mergeCandidates, updateCandidate, updateList
} from "../controllers/candidate.controller.js"
import { emailCandidate } from "../controllers/email.controller.js"

const candidateRouter = express.Router()
const viewer = [isAuth, requireOrg("viewer")]
const recruiter = [isAuth, requireOrg("recruiter")]

// fixed paths before "/:id"
candidateRouter.get("/", ...viewer, listCandidates)
candidateRouter.get("/tags", ...viewer, getTags)
candidateRouter.get("/lists", ...viewer, getLists)
candidateRouter.post("/lists", ...recruiter, createList)
candidateRouter.patch("/lists/:id", ...recruiter, updateList)
candidateRouter.delete("/lists/:id", ...recruiter, deleteList)
candidateRouter.post("/import", ...recruiter, importCandidates)
candidateRouter.post("/bulk", ...recruiter, bulkUpdate)
candidateRouter.post("/", ...recruiter, createCandidate)
candidateRouter.get("/:id", ...viewer, getCandidate)
candidateRouter.patch("/:id", ...recruiter, updateCandidate)
candidateRouter.delete("/:id", ...recruiter, deleteCandidate)
candidateRouter.post("/:id/activities", ...recruiter, addActivity)
candidateRouter.post("/:id/jobs", ...recruiter, addToJob)
candidateRouter.post("/:id/merge", ...recruiter, mergeCandidates)
candidateRouter.post("/:id/email", ...recruiter, emailCandidate)

export default candidateRouter
