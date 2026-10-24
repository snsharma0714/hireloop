import jwt from "jsonwebtoken"
import ScheduledInterview from "../models/scheduledInterview.model.js"
import User from "../models/user.model.js"
import { canManageInterviews } from "../middlewares/requireOrg.js"
import { askedQuestions, buildQuestion, publicQuestion, starterFor } from "../services/interviewQuestion.service.js"

// token -> { interviewer, candidate, code, language, saveTimer }
// interviewer / candidate hold { socketId, name } while that person is in the room
const rooms = new Map()

const getCookie = (cookieHeader, name) => {
    const match = (cookieHeader || "").split(";").map(c => c.trim()).find(c => c.startsWith(name + "="))
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

const getUserId = (socket) => {
    try {
        const token = getCookie(socket.handshake.headers.cookie, "token")
        return token ? jwt.verify(token, process.env.JWT_SECRET).userId : null
    } catch {
        return null
    }
}

// Save code at most every 3s instead of on every keystroke
const scheduleCodeSave = (token, room) => {
    clearTimeout(room.saveTimer)
    room.saveTimer = setTimeout(() => {
        ScheduledInterview.updateOne({ token }, { code: room.code, language: room.language })
            .catch(err => console.log("code save error", err.message))
    }, 3000)
}

const registerRoomSocket = (io) => {
    io.on("connection", (socket) => {

        socket.on("join-room", async ({ token, name }, ack) => {
            try {
                const interview = await ScheduledInterview.findOne({ token }).populate("interviewer", "name")
                if (!interview) return ack?.({ error: "Invalid interview link" })

                const userId = getUserId(socket)
                const account = userId ? await User.findById(userId).select("role org orgRole name") : null
                const isInterviewer = (userId && String(interview.interviewer._id) === String(userId)) || canManageInterviews(account, interview)
                if (!isInterviewer && account?.role === "company" && interview.org && String(account.org) === String(interview.org)) {
                    return ack?.({ error: "Viewers can't join interviews" })
                }
                const role = isInterviewer ? "interviewer" : "candidate"

                if (role === "candidate" && ["completed", "cancelled"].includes(interview.status)) {
                    return ack?.({ error: `This interview is ${interview.status}` })
                }

                const isPeer = interview.type === "peer"
                if (isPeer && role === "candidate") {
                    if (!userId) return ack?.({ error: "Log in to join this practice session" })
                    if (interview.participant && String(interview.participant) !== String(userId)) {
                        return ack?.({ error: "This session is full" })
                    }
                }

                if (!rooms.has(token)) {
                    rooms.set(token, { type: interview.type, interviewer: null, candidate: null, code: interview.code, language: interview.language })
                }
                const room = rooms.get(token)

                // Room is locked to two people. The same account rejoining (refresh / new tab) replaces its old
                // connection; anyone else is turned away while the seat is taken.
                const previous = room[role]
                const previousLive = previous && io.sockets.sockets.get(previous.socketId)?.connected
                const sameUser = role === "interviewer" || (isPeer && previous?.userId === String(userId))
                if (previousLive && previous.socketId !== socket.id && !sameUser) {
                    return ack?.({ error: "Someone is already in this interview. If that's you, close the other tab and try again." })
                }
                if (previous && previous.socketId !== socket.id) {
                    io.to(previous.socketId).emit("replaced")
                    const oldSocket = io.sockets.sockets.get(previous.socketId)
                    if (oldSocket) {
                        oldSocket.leave(token)
                        oldSocket.data = {}
                    }
                }

                let displayName = role === "interviewer" ? (account?.name || interview.interviewer.name) : (name || interview.candidateName)
                if (isPeer && role === "candidate") {
                    displayName = (await User.findById(userId).select("name"))?.name || "Participant"
                    if (!interview.participant) {
                        interview.participant = userId
                        await interview.save()
                    }
                }
                room[role] = { socketId: socket.id, name: displayName, userId: userId ? String(userId) : null }
                socket.data = { token, role, name: displayName }
                socket.join(token)

                const peerRole = role === "interviewer" ? "candidate" : "interviewer"
                const peer = room[peerRole]

                if (peer && interview.status === "scheduled") {
                    interview.status = "live"
                    interview.startedAt = new Date()
                    await interview.save()
                }

                ack?.({
                    role, code: room.code, language: room.language, peer: peer ? { role: peerRole, name: peer.name } : null,
                    // hiring interviews: the question on screen, and (for the interviewer) everything asked so far
                    question: isPeer ? null : publicQuestion(interview),
                    questions: !isPeer && role === "interviewer" ? askedQuestions(interview) : undefined
                })

                if (peer) {
                    io.to(peer.socketId).emit("peer-joined", { role, name: displayName })
                }
            } catch (error) {
                ack?.({ error: `Could not join room ${error.message}` })
            }
        })

        // WebRTC offer / answer / ICE candidates, relayed to the other person
        socket.on("signal", (data) => {
            const { token } = socket.data || {}
            if (token) socket.to(token).emit("signal", data)
        })

        socket.on("code-change", ({ code, language }) => {
            const { token } = socket.data || {}
            const room = token && rooms.get(token)
            if (!room || typeof code !== "string" || code.length > 50000) return
            room.code = code
            if (language) room.language = language
            socket.to(token).emit("code-update", { code, language: room.language })
            scheduleCodeSave(token, room)
        })

        // Share code run results so both people see the same output
        socket.on("run-output", (result) => {
            const { token } = socket.data || {}
            if (token) socket.to(token).emit("run-output", result)
        })

        // Run / Submit results against a problem's tests in peer sessions
        socket.on("judge-result", (result) => {
            const { token, name } = socket.data || {}
            if (token) socket.to(token).emit("judge-result", { ...result, by: name })
        })

        // Interviewer puts a question on screen: { slug } for a built-in problem, { title, description } for
        // their own, { index } to go back to one already asked, or { clear: true } to hide it
        socket.on("set-question", async (input, ack) => {
            try {
                const { token, role } = socket.data || {}
                if (!token || role !== "interviewer") return ack?.({ error: "Only the interviewer can change the question" })
                const room = rooms.get(token)
                const interview = await ScheduledInterview.findOne({ token })
                if (!interview || interview.type === "peer") return ack?.({ error: "Questions are for hiring interviews" })
                if (["completed", "cancelled"].includes(interview.status)) return ack?.({ error: "This interview has ended" })

                // keep the answer to the question we're leaving
                const leaving = interview.questions[interview.currentQuestion]
                if (leaving && room) {
                    leaving.code = room.code
                    leaving.language = room.language
                }

                if (input?.clear) {
                    interview.currentQuestion = -1
                } else if (Number.isInteger(input?.index)) {
                    if (!interview.questions[input.index]) return ack?.({ error: "Question not found" })
                    interview.currentQuestion = input.index
                } else {
                    const q = buildQuestion(input)
                    if (q.error) return ack?.({ error: q.error })
                    // asking a built-in problem again goes back to it instead of adding a duplicate
                    let index = q.kind === "builtin" ? interview.questions.findIndex(x => x.kind === "builtin" && x.slug === q.slug) : -1
                    if (index === -1) {
                        interview.questions.push(q)
                        index = interview.questions.length - 1
                    }
                    interview.currentQuestion = index
                }

                const current = interview.questions[interview.currentQuestion]
                if (current && room && input?.resetCode !== false) {
                    // back to a question: their earlier answer; a new one: the starter code
                    if (current.code?.trim()) room.language = current.language || room.language
                    room.code = current.code?.trim() ? current.code : starterFor(current, room.language)
                    interview.code = room.code
                    interview.language = room.language
                    clearTimeout(room.saveTimer)
                    io.to(token).emit("code-update", { code: room.code, language: room.language })
                }
                await interview.save()
                io.to(token).emit("question", publicQuestion(interview))
                ack?.({ ok: true, questions: askedQuestions(interview) })
            } catch (error) {
                ack?.({ error: `Could not change the question ${error.message}` })
            }
        })

        // Interviewer refreshes the asked-questions list (best results change as the candidate submits)
        socket.on("get-questions", async (ack) => {
            const { token, role } = socket.data || {}
            if (!token || role !== "interviewer") return ack?.({ error: "Only the interviewer can see this" })
            const interview = await ScheduledInterview.findOne({ token }).select("questions currentQuestion")
            ack?.({ questions: interview ? askedQuestions(interview) : [] })
        })

        // Tell the other person when the call is being recorded
        socket.on("recording", ({ on }) => {
            const { token, name } = socket.data || {}
            if (token) socket.to(token).emit("recording", { on: Boolean(on), by: name })
        })

        socket.on("chat", ({ text }) => {
            const { token, role, name } = socket.data || {}
            if (!token || !text?.trim()) return
            io.to(token).emit("chat", { text: text.slice(0, 1000), role, name, at: Date.now() })
        })

        socket.on("media-state", (state) => {
            const { token } = socket.data || {}
            if (token) socket.to(token).emit("media-state", state)
        })

        // Candidate-side integrity signals (tab switch, paste, leaving full screen)
        socket.on("proctor", async ({ type, message }) => {
            const { token, role } = socket.data || {}
            if (!token || role !== "candidate" || rooms.get(token)?.type === "peer") return
            const event = { type: String(type).slice(0, 40), message: String(message).slice(0, 200), at: new Date() }
            const room = rooms.get(token)
            if (room?.interviewer) io.to(room.interviewer.socketId).emit("proctor-alert", event)
            ScheduledInterview.updateOne({ token }, { $push: { proctorEvents: event } })
                .catch(err => console.log("proctor save error", err.message))
        })

        socket.on("end-interview", async (ack) => {
            const { token, role } = socket.data || {}
            if (!token || role !== "interviewer") return ack?.({ error: "Only the interviewer can end the interview" })
            const room = rooms.get(token)
            clearTimeout(room?.saveTimer)
            const interview = await ScheduledInterview.findOne({ token }).select("currentQuestion")
            const atQuestion = interview?.currentQuestion >= 0 && room
                ? { [`questions.${interview.currentQuestion}.code`]: room.code, [`questions.${interview.currentQuestion}.language`]: room.language }
                : {}
            await ScheduledInterview.updateOne({ token }, {
                status: "completed",
                endedAt: new Date(),
                ...(room ? { code: room.code, language: room.language } : {}),
                ...atQuestion
            })
            socket.to(token).emit("interview-ended")
            ack?.({ ok: true })
        })

        socket.on("disconnect", () => {
            const { token, role } = socket.data || {}
            const room = token && rooms.get(token)
            if (!room || room[role]?.socketId !== socket.id) return
            room[role] = null
            socket.to(token).emit("peer-left", { role })
            if (!room.interviewer && !room.candidate) {
                clearTimeout(room.saveTimer)
                ScheduledInterview.updateOne({ token }, { code: room.code, language: room.language }).catch(() => {})
                rooms.delete(token)
            }
        })
    })
}

export default registerRoomSocket
