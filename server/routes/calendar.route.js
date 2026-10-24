import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireOrg from "../middlewares/requireOrg.js"
import { createEvent, deleteEvent, listCalendar, updateEvent } from "../controllers/calendar.controller.js"

const calendarRouter = express.Router()
const viewer = [isAuth, requireOrg("viewer")]
const recruiter = [isAuth, requireOrg("recruiter")]

calendarRouter.get("/", ...viewer, listCalendar)
calendarRouter.post("/events", ...recruiter, createEvent)
calendarRouter.patch("/events/:id", ...recruiter, updateEvent)
calendarRouter.delete("/events/:id", ...recruiter, deleteEvent)

export default calendarRouter
