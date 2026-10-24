import React from 'react'
import { FaTrash, FaPlus } from 'react-icons/fa'
import { optionsOf } from './screeningUtils'

const KINDS = [
    { key: "yesno", label: "Yes / No" },
    { key: "choice", label: "Multiple choice" },
    { key: "text", label: "Short answer" }
]
const MAX = 10

// Recruiter's side: build the screening questions for a job.
// For yes/no and choice questions you can pick the answer you're looking for; applicants
// who answer differently can still apply, but get flagged on the pipeline.
function QuestionsEditor({ value, onChange }) {
    const update = (i, patch) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)))
    const add = () => onChange([...value, { text: "", kind: "yesno", options: [], optionsText: "", required: true, expected: "" }])
    const remove = (i) => onChange(value.filter((_, j) => j !== i))

    return (
        <div>
            <div className='flex items-center justify-between mb-2'>
                <p className='text-sm font-medium'>Screening questions <span className='text-gray-400 font-normal'>(optional)</span></p>
                {value.length < MAX &&
                    <button type='button' onClick={add} className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200'><FaPlus size={9} /> Add question</button>}
            </div>
            {value.length === 0 && <p className='text-xs text-gray-400'>e.g. "Can you join within 30 days?" or "Which year do you graduate?"</p>}
            <div className='space-y-3'>
                {value.map((q, i) => (
                    <div key={q._id || i} className='border border-gray-200 rounded-xl p-3 space-y-2' data-testid='question-row'>
                        <div className='flex gap-2'>
                            <input value={q.text} onChange={e => update(i, { text: e.target.value })} placeholder={`Question ${i + 1}`}
                                className='flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black' />
                            <select value={q.kind} onChange={e => update(i, { kind: e.target.value, expected: "" })} aria-label='Question type' className='border border-gray-200 rounded-lg px-2 text-sm'>
                                {KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
                            </select>
                            <button type='button' onClick={() => remove(i)} aria-label='Remove question' className='px-2 text-gray-400 hover:text-red-500'><FaTrash size={12} /></button>
                        </div>
                        {q.kind === "choice" &&
                            <input value={q.optionsText ?? (q.options || []).join(", ")} onChange={e => update(i, { optionsText: e.target.value, expected: "" })}
                                placeholder='Options, comma separated (at least 2)' className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black' />}
                        <div className='flex flex-wrap items-center gap-4 text-xs text-gray-600'>
                            <label className='flex items-center gap-1.5'>
                                <input type='checkbox' checked={q.required} onChange={e => update(i, { required: e.target.checked })} className='accent-emerald-600' /> Required
                            </label>
                            {q.kind !== "text" &&
                                <label className='flex items-center gap-1.5'>
                                    Looking for
                                    <select value={q.expected} onChange={e => update(i, { expected: e.target.value })} aria-label='Expected answer' className='border border-gray-200 rounded-md px-1.5 py-0.5'>
                                        <option value=''>any answer</option>
                                        {optionsOf(q).map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </label>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default QuestionsEditor
