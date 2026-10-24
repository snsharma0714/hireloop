// yes/no questions always offer the same two answers
export const optionsOf = (q) => q.kind === "yesno"
    ? ["yes", "no"]
    : String(q.optionsText ?? (q.options || []).join(", ")).split(",").map(s => s.trim()).filter(Boolean)

// editor rows -> what the API stores
export const questionsPayload = (list) => list.map(q => ({
    _id: q._id,
    text: q.text,
    kind: q.kind,
    required: q.required,
    expected: q.expected,
    options: q.kind === "choice" ? optionsOf(q) : []
}))

// first required question without an answer, so forms can say what's missing before sending
export const missingAnswer = (questions = [], value = {}) => questions.find(q => q.required && !String(value[q._id] || "").trim())
