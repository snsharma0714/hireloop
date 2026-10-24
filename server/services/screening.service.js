import mongoose from "mongoose"
import { QUESTION_KINDS } from "../models/job.model.js"
import { clean, cleanList } from "./candidate.service.js"

const MAX_QUESTIONS = 10

// What a recruiter typed into the job form -> questions we can store
export const cleanQuestions = (list) => {
    if (!Array.isArray(list)) return []
    const out = []
    for (const q of list.slice(0, MAX_QUESTIONS)) {
        const text = clean(q?.text, 300)
        if (!text) continue
        const kind = QUESTION_KINDS.includes(q.kind) ? q.kind : "text"
        const options = kind === "choice" ? cleanList(q.options, 10) : []
        if (kind === "choice" && options.length < 2) continue
        let expected = clean(q.expected, 40)
        if (kind === "yesno" && !["yes", "no"].includes(expected)) expected = ""
        if (kind === "choice" && !options.includes(expected)) expected = ""
        if (kind === "text") expected = ""
        out.push({
            // keep the id when editing so the form and answers stay matched
            ...(mongoose.isValidObjectId(q._id) ? { _id: q._id } : {}),
            text, kind, options, expected,
            required: q.required !== false
        })
    }
    return out
}

// Applicants never see which answer the company is looking for
export const publicQuestions = (questions = []) =>
    questions.map(q => ({ _id: q._id, text: q.text, kind: q.kind, options: q.options, required: q.required }))

// answers: { [questionId]: "answer" } -> { error } or { answers, screeningPassed }
export const gradeAnswers = (questions = [], input = {}) => {
    const given = input && typeof input === "object" ? input : {}
    const answers = []
    let checked = 0, failed = 0
    for (const q of questions) {
        const answer = clean(given[String(q._id)], 2000)
        if (!answer) {
            if (q.required) return { error: `Please answer: ${q.text}` }
            continue
        }
        if (q.kind === "yesno" && !["yes", "no"].includes(answer)) return { error: `Answer yes or no: ${q.text}` }
        if (q.kind === "choice" && !q.options.includes(answer)) return { error: `Pick one of the options: ${q.text}` }
        let ok = null
        if (q.expected) {
            ok = answer === q.expected
            checked++
            if (!ok) failed++
        }
        answers.push({ question: q.text, answer, ok })
    }
    return { answers, screeningPassed: checked ? failed === 0 : null }
}
