import ScheduledInterview from "../models/scheduledInterview.model.js"
import { execute, JudgeError } from "../services/codeRunner.service.js"

export const runCode = async (req, res) => {
    try {
        const { language, source, stdin, roomToken } = req.body

        // Logged-in users can always run code; candidates need a valid, open interview link
        if (!req.userId) {
            const interview = roomToken && await ScheduledInterview.findOne({ token: roomToken }).select("status")
            if (!interview || ["completed", "cancelled"].includes(interview.status)) {
                return res.status(401).json({ message: "Not allowed to run code" })
            }
        }

        if (!source || source.length > 50000) {
            return res.status(400).json({ message: "Code is empty or too long" })
        }

        const result = await execute({ language, source, stdin })
        return res.status(200).json({
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
            compileOutput: result.compileOutput,
            time: result.time,
            memory: result.memory
        })
    } catch (error) {
        if (error instanceof JudgeError) {
            return res.status(error.httpStatus).json({ message: error.message })
        }
        return res.status(500).json({ message: `Code run failed ${error.message}` })
    }
}
