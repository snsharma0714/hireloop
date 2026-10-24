import { getProblem } from "../practice/problems.js"
import { starterCode } from "../practice/drivers.js"
import { clean } from "./candidate.service.js"

// What the interviewer picked -> a question to store, or { error }
export const buildQuestion = (input = {}) => {
    if (input.slug) {
        const p = getProblem(String(input.slug))
        if (!p) return { error: "Problem not found" }
        return { kind: "builtin", slug: p.slug, title: p.title, difficulty: p.difficulty }
    }
    const title = clean(input.title, 150)
    if (!title) return { error: "Give the question a title" }
    return { kind: "custom", title, description: clean(input.description, 5000) }
}

// What both people see. Never includes results or saved code.
export const publicQuestion = (interview) => {
    const q = interview.questions?.[interview.currentQuestion]
    if (!q) return null
    return { index: interview.currentQuestion, kind: q.kind, slug: q.slug, title: q.title, difficulty: q.difficulty, description: q.description }
}

// The interviewer's list of everything asked so far, with the best Submit result for each
export const askedQuestions = (interview) => (interview.questions || []).map((q, index) => ({
    index, kind: q.kind, slug: q.slug, title: q.title, difficulty: q.difficulty, askedAt: q.askedAt,
    submissions: q.submissions, best: q.best?.verdict ? q.best : null
}))

const LANGUAGE_COMMENT = { python: "#" }

// Fresh editor text for a question: the function signature for built-in problems, a header comment otherwise
export const starterFor = (q, language) => {
    if (q.kind === "builtin") {
        const p = getProblem(q.slug)
        if (p) return starterCode(language, p.signature)
    }
    const c = LANGUAGE_COMMENT[language] || "//"
    return `${c} Question: ${q.title}\n${c} Write your solution below\n\n`
}

// Optional first question picked while scheduling: it's on screen as soon as the room opens
export const firstQuestionFields = (slug) => {
    if (!slug) return {}
    const q = buildQuestion({ slug })
    if (q.error) return {}
    return { questions: [q], currentQuestion: 0, code: starterFor(q, "javascript"), language: "javascript" }
}
