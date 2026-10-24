import React from 'react'

// The applicant's side of a job's screening questions. `value` is { [questionId]: answer }.
function ScreeningFields({ questions = [], value, onChange }) {
    if (!questions.length) return null
    const set = (id, answer) => onChange({ ...value, [id]: answer })

    return (
        <div className='space-y-4'>
            {questions.map((q, i) => (
                <div key={q._id}>
                    <p className='text-sm text-gray-700 mb-2'>{i + 1}. {q.text}{q.required ? <span className='text-red-500'> *</span> : <span className='text-gray-400'> (optional)</span>}</p>
                    {q.kind === "text" &&
                        <textarea rows={2} value={value[q._id] || ""} onChange={e => set(q._id, e.target.value)}
                            aria-label={q.text} className='w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-black resize-none text-sm' />}
                    {q.kind !== "text" &&
                        <div className='flex flex-wrap gap-2' role='radiogroup' aria-label={q.text}>
                            {(q.kind === "yesno" ? ["yes", "no"] : q.options).map(opt => (
                                <button type='button' key={opt} role='radio' aria-checked={value[q._id] === opt} onClick={() => set(q._id, opt)}
                                    className={`text-sm px-4 py-1.5 rounded-full border capitalize ${value[q._id] === opt ? "bg-black text-white border-black" : "border-gray-200 hover:bg-gray-50"}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>}
                </div>
            ))}
        </div>
    )
}

export default ScreeningFields
