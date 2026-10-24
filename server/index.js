import express from "express"
import http from "http"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import connectDb from "./config/connectDb.js"
import cookieParser from "cookie-parser"
dotenv.config()
import cors from "cors"
import { Server } from "socket.io"
import authRouter from "./routes/auth.route.js"
import userRouter from "./routes/user.route.js"
import interviewRouter from "./routes/interview.route.js"
import paymentRouter from "./routes/payment.route.js"
import scheduleRouter from "./routes/schedule.route.js"
import codeRouter from "./routes/code.route.js"
import practiceRouter from "./routes/practice.route.js"
import sheetRouter from "./routes/sheet.route.js"
import jobRouter from "./routes/job.route.js"
import orgRouter from "./routes/org.route.js"
import candidateRouter from "./routes/candidate.route.js"
import careersRouter from "./routes/careers.route.js"
import calendarRouter from "./routes/calendar.route.js"
import reportRouter from "./routes/report.route.js"
import registerRoomSocket from "./socket/room.socket.js"

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173"

const app = express()
// behind Render's proxy: lets req.ip be the visitor's address (used to rate-limit the public careers form)
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1)
app.use(cors({
    origin:CLIENT_URL,
    credentials:true
}))

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth" , authRouter)
app.use("/api/user", userRouter)
app.use("/api/interview" , interviewRouter)
app.use("/api/payment" , paymentRouter)
app.use("/api/schedule" , scheduleRouter)
app.use("/api/code" , codeRouter)
app.use("/api/practice" , practiceRouter)
app.use("/api/sheets" , sheetRouter)
app.use("/api/jobs" , jobRouter)
app.use("/api/org" , orgRouter)
app.use("/api/candidates" , candidateRouter)
app.use("/api/careers" , careersRouter)
app.use("/api/calendar" , calendarRouter)
app.use("/api/reports" , reportRouter)

app.get("/api/health", (req, res) => res.status(200).json({ ok: true }))

// In production this server also serves the built React app, so everything runs as one service
// on one domain (no cross-site cookies, no CORS problems)
if (process.env.NODE_ENV === "production") {
    const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../client/dist")
    app.use(express.static(clientDist))
    app.get(/^(?!\/api\/|\/socket\.io\/).*/, (req, res) => res.sendFile(path.join(clientDist, "index.html")))
}

const server = http.createServer(app)
const io = new Server(server, {
    cors: { origin: CLIENT_URL, credentials: true }
})
registerRoomSocket(io)

const PORT = process.env.PORT || 6000
server.listen(PORT , ()=>{
    console.log(`Server running on port ${PORT}`)
    connectDb()
})
