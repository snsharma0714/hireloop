import React, { useState } from 'react'
import axios from 'axios'
import { FaStar } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { VERDICTS } from './roomConstants'

const CRITERIA = [
    { key: "problemSolving", label: "Problem Solving" },
    { key: "coding", label: "Coding" },
    { key: "communication", label: "Communication" },
    { key: "fundamentals", label: "CS Fundamentals" }
]

// Controlled by the parent so the room can save it when the interview ends
function ScorecardPanel({ interviewId, scorecard, onChange }) {
    const [status, setStatus] = useState("")

    const update = (patch) => {
        onChange({ ...scorecard, ...patch })
        setStatus("")
    }

    const save = async () => {
        setStatus("Saving...")
        try {
            await axios.patch(ServerUrl + `/api/schedule/${interviewId}`, { scorecard }, { withCredentials: true })
            setStatus("Saved")
        } catch (error) {
            setStatus(error.response?.data?.message || "Save failed")
        }
    }

    return (
        <div className='flex flex-col h-full overflow-y-auto gap-4 p-1'>
            <p className='text-xs text-gray-400'>Private to you. The candidate can't see this.</p>
            {CRITERIA.map(c => (
                <div key={c.key}>
                    <p className='text-sm font-medium text-gray-700 mb-1'>{c.label}</p>
                    <div className='flex gap-1'>
                        {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} type='button' onClick={() => update({ [c.key]: n })}>
                                <FaStar size={20} className={n <= scorecard[c.key] ? "text-yellow-400" : "text-gray-200"} />
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            <div>
                <p className='text-sm font-medium text-gray-700 mb-1'>Verdict</p>
                <div className='grid grid-cols-2 gap-2'>
                    {VERDICTS.map(v => (
                        <button key={v.value} type='button' onClick={() => update({ verdict: v.value })}
                            className={`text-xs py-2 rounded-lg border ${scorecard.verdict === v.value ? `${v.style} border-transparent` : "border-gray-200 text-gray-600"}`}>
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className='flex-1 flex flex-col'>
                <p className='text-sm font-medium text-gray-700 mb-1'>Notes</p>
                <textarea value={scorecard.notes} onChange={e => update({ notes: e.target.value })} placeholder='Approach, hints given, edge cases missed...'
                    className='flex-1 min-h-28 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-black resize-none' />
            </div>

            <div className='flex items-center gap-3'>
                <button onClick={save} className='bg-black text-white text-sm px-5 py-2 rounded-full'>Save</button>
                <span className='text-xs text-gray-500'>{status}</span>
            </div>
        </div>
    )
}

export default ScorecardPanel
