import express from "express"
import isAuth from "../middlewares/isAuth.js"
import optionalAuth from "../middlewares/optionalAuth.js"
import requireRole from "../middlewares/requireRole.js"
import requireOrg from "../middlewares/requireOrg.js"
import { createPeerSession, getActivePeerSessions, getMyPeerSessions, createSchedule, deleteSchedule, generateAiSummary, getMySchedules, getRoomByToken, getScheduleById, judgeInRoom, updateSchedule } from "../controllers/schedule.controller.js"

const scheduleRouter = express.Router()

scheduleRouter.get("/room/:token", optionalAuth, getRoomByToken)
scheduleRouter.post("/room/:token/judge", optionalAuth, judgeInRoom)
// peer practice sessions are for students, hiring interviews for companies
const student = [isAuth, requireRole("student")]
const viewer = [isAuth, requireOrg("viewer")]
const recruiter = [isAuth, requireOrg("recruiter")]

scheduleRouter.post("/peer", ...student, createPeerSession)
scheduleRouter.get("/peer/active", ...student, getActivePeerSessions)
scheduleRouter.get("/peer/mine", ...student, getMyPeerSessions)
scheduleRouter.post("/", ...recruiter, createSchedule)
scheduleRouter.get("/", ...viewer, getMySchedules)
scheduleRouter.get("/:id", ...viewer, getScheduleById)
scheduleRouter.patch("/:id", ...recruiter, updateSchedule)
scheduleRouter.delete("/:id", ...recruiter, deleteSchedule)
scheduleRouter.post("/:id/ai-summary", ...recruiter, generateAiSummary)

export default scheduleRouter
