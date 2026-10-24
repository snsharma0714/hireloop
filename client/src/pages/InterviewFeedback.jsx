import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Editor from '@monaco-editor/react'
import { FaArrowLeft } from 'react-icons/fa'
import { IoSparkles } from 'react-icons/io5'
import { MdWarningAmber } from 'react-icons/md'
import { ServerUrl } from '../App'
import toast from 'react-hot-toast'
import ScorecardPanel from '../components/room/ScorecardPanel'
import { emptyScorecard, VERDICTS } from '../components/room/roomConstants'
import { DIFFICULTY_STYLES } from '../components/practice/practiceUtils'

function InterviewFeedback() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [interview, setInterview] = useState(null)
    const [scorecard, setScorecard] = useState(emptyScorecard)
    const [error, setError] = useState("")
    const [generating, setGenerating] = useState(false)
    // which code to show: a question's index, or null for the final editor contents
    const [codeOf, setCodeOf] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const result = await axios.get(ServerUrl + `/api/schedule/${id}`, { withCredentials: true })
                setInterview(result.data)
                setScorecard({ ...emptyScorecard, ...result.data.scorecard })
            } catch (error) {
                setError(error.response?.data?.message || "Could not load interview")
            }
        }
        load()
    }, [id])

    const generateSummary = async () => {
        setGenerating(true)
        try {
            // Save the latest ratings first so the summary uses them
            await axios.patch(ServerUrl + `/api/schedule/${id}`, { scorecard }, { withCredentials: true })
            const result = await axios.post(ServerUrl + `/api/schedule/${id}/ai-summary`, {}, { withCredentials: true })
            setInterview({ ...interview, aiSummary: result.data.aiSummary })
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not generate summary")
        } finally {
            setGenerating(false)
        }
    }

    if (error) return <div className='min-h-screen flex items-center justify-center text-gray-500'>{error}</div>
    if (!interview) return <div className='min-h-screen flex items-center justify-center text-gray-500'>Loading...</div>

    const verdict = VERDICTS.find(v => v.value === scorecard.verdict)
    const questions = interview.questions || []
    const shownQuestion = codeOf !== null ? questions[codeOf] : null
    const shownCode = shownQuestion ? shownQuestion.code : interview.code
    const shownLanguage = (shownQuestion ? shownQuestion.language : interview.language) || "javascript"
    const minutes = interview.startedAt && interview.endedAt
        ? Math.round((new Date(interview.endedAt) - new Date(interview.startedAt)) / 60000)
        : null

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 py-10'>
            <div className='w-[92vw] lg:w-[75vw] mx-auto'>
                <div className='mb-8 flex items-start gap-4'>
                    <button onClick={() => navigate("/company/interviews")} className='mt-1 p-3 rounded-full bg-white shadow hover:shadow-md transition'>
                        <FaArrowLeft className='text-gray-600' />
                    </button>
                    <div>
                        <div className='flex items-center gap-3 flex-wrap'>
                            <h1 className='text-3xl font-bold text-gray-800'>{interview.candidateName}</h1>
                            {verdict && <span className={`px-3 py-1 rounded-full text-sm ${verdict.style}`}>{verdict.label}</span>}
                        </div>
                        <p className='text-gray-500 mt-2'>
                            {interview.title}{interview.companyName && ` • ${interview.companyName}`} • {new Date(interview.scheduledAt).toLocaleString()}
                            {minutes !== null && ` • lasted ${minutes} min`}
                        </p>
                    </div>
                </div>

                <div className='grid lg:grid-cols-3 gap-6'>
                    <div className='bg-white rounded-2xl shadow-md border border-gray-100 p-6 min-h-[520px] flex flex-col'>
                        <h2 className='font-semibold text-lg mb-4'>Scorecard</h2>
                        <div className='flex-1'>
                            <ScorecardPanel interviewId={interview._id} scorecard={scorecard} onChange={setScorecard} />
                        </div>
                    </div>

                    <div className='lg:col-span-2 flex flex-col gap-6'>
                        <div className='bg-white rounded-2xl shadow-md border border-gray-100 p-6'>
                            <div className='flex items-center justify-between gap-4 mb-4 flex-wrap'>
                                <h2 className='font-semibold text-lg'>AI Summary</h2>
                                <button onClick={generateSummary} disabled={generating}
                                    className='flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm disabled:opacity-50'>
                                    <IoSparkles /> {generating ? "Generating..." : interview.aiSummary ? "Regenerate" : "Generate"}
                                </button>
                            </div>
                            {interview.aiSummary
                                ? <div className='text-sm text-gray-700 whitespace-pre-wrap leading-relaxed'>{interview.aiSummary}</div>
                                : <p className='text-sm text-gray-400'>Fill in the scorecard, then generate a summary from your ratings, notes and the candidate's code.</p>}
                        </div>

                        <div className='bg-white rounded-2xl shadow-md border border-gray-100 p-6'>
                            <h2 className='font-semibold text-lg mb-4'>Integrity Log</h2>
                            {interview.proctorEvents.length === 0
                                ? <p className='text-sm text-emerald-600'>No tab switches, full screen exits or large pastes detected.</p>
                                : <div className='space-y-2 max-h-56 overflow-y-auto'>
                                    {interview.proctorEvents.map((e, i) => (
                                        <div key={i} className='flex items-center gap-2 text-sm'>
                                            <MdWarningAmber className='text-yellow-600 shrink-0' />
                                            <span className='text-gray-800'>{e.message}</span>
                                            <span className='text-xs text-gray-400 ml-auto'>{new Date(e.at).toLocaleTimeString()}</span>
                                        </div>
                                    ))}
                                </div>}
                        </div>

                        <div className='bg-white rounded-2xl shadow-md border border-gray-100 p-6' data-testid='questions-asked'>
                            <h2 className='font-semibold text-lg mb-4'>Questions asked</h2>
                            {questions.length === 0
                                ? <p className='text-sm text-gray-400'>No questions were put on screen in this interview.</p>
                                : <div className='divide-y divide-gray-100'>
                                    {questions.map((q, i) => {
                                        const accepted = q.best?.verdict === "Accepted"
                                        return (
                                            <div key={i} className='flex items-center justify-between gap-3 py-3 flex-wrap'>
                                                <div className='min-w-0'>
                                                    <p className='font-medium text-gray-800'>Q{i + 1}. {q.title}
                                                        {q.difficulty && <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full align-middle ${DIFFICULTY_STYLES[q.difficulty]}`}>{q.difficulty}</span>}
                                                    </p>
                                                    <p className={`text-sm mt-0.5 ${q.kind === "custom" ? "text-gray-500" : accepted ? "text-emerald-600" : q.best ? "text-red-500" : "text-gray-400"}`}>
                                                        {q.kind === "custom" ? "Your own question (no automatic tests)"
                                                            : q.best?.verdict ? `Best submit: ${q.best.verdict} • ${q.best.passed}/${q.best.total} tests • ${q.best.language}${q.submissions > 1 ? ` • ${q.submissions} submits` : ""}`
                                                                : "Never submitted"}
                                                    </p>
                                                </div>
                                                {q.code?.trim() && <button onClick={() => setCodeOf(i)} className={`text-xs px-3 py-1.5 rounded-full ${codeOf === i ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"}`}>View code</button>}
                                            </div>
                                        )
                                    })}
                                </div>}
                        </div>

                        <div className='bg-white rounded-2xl shadow-md border border-gray-100 p-6'>
                            <div className='flex items-center justify-between gap-3 mb-4 flex-wrap'>
                                <h2 className='font-semibold text-lg'>{shownQuestion ? `Code for Q${codeOf + 1}: ${shownQuestion.title}` : "Final Code"} <span className='text-sm text-gray-400 font-normal'>({shownLanguage})</span></h2>
                                {shownQuestion && <button onClick={() => setCodeOf(null)} className='text-xs text-gray-500 hover:text-black'>Show final code</button>}
                            </div>
                            <div className='h-80 rounded-xl overflow-hidden'>
                                <Editor theme='vs-dark' language={shownLanguage} value={shownCode || "// No code written"}
                                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InterviewFeedback
