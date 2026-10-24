import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireOrg from "../middlewares/requireOrg.js"
import { exportApplications, getReport } from "../controllers/report.controller.js"

const reportRouter = express.Router()

reportRouter.get("/", isAuth, requireOrg("viewer"), getReport)
reportRouter.get("/export", isAuth, requireOrg("viewer"), exportApplications)

export default reportRouter
