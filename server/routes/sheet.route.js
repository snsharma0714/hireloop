import express from "express"
import isAuth from "../middlewares/isAuth.js"
import optionalAuth from "../middlewares/optionalAuth.js"
import { getSheetById, getSheets, updateProgress } from "../controllers/sheet.controller.js"

const sheetRouter = express.Router()

sheetRouter.get("/", optionalAuth, getSheets)
sheetRouter.put("/progress/:key", isAuth, updateProgress)
sheetRouter.get("/:id", optionalAuth, getSheetById)

export default sheetRouter
