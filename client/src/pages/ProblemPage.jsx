import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import Editor from '@monaco-editor/react'
import { FaArrowLeft, FaPlay, FaCheckCircle, FaTimesCircle, FaUndo, FaExternalLinkAlt } from 'react-icons/fa'
import { IoSparkles } from 'react-icons/io5'
import { ServerUrl } from '../App'
import AuthModel from '../components/AuthModel'
import RichText from '../components/practice/RichText'
import { DIFFICULTY_STYLES, VERDICT_STYLES, storage } from '../components/practice/practiceUtils'
import { LANGUAGES } from '../components/room/roomConstants'
import SplitPane from '../components/SplitPane'
import { celebrate } from '../components/practice/celebrate'
import toast from 'react-hot-toast'

const Block = ({ label, children, danger }) => (
    <div className='mb-3'>
        <p className='text-xs text-gray-500 mb-1'>{label}</p>
        <pre className={`text-sm font-mono rounded-lg px-3 py-2 whitespace-pre-wrap break-all ${danger ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-800"}`}>{children}</pre>
    </div>
)

function ResultPanel({ result, busy }) {
    const [caseIndex, setCaseIndex] = useState(0)
    if (busy) return <p className='text-sm text-gray-500'>{busy === "submit" ? "Judging against all test cases..." : "Running sample tests..."}</p>
    if (!result) return <p className='text-sm text-gray-400'>Run your code to see results here. Tip: Ctrl + Enter runs, Ctrl + Shift + Enter submits.</p>
    if (result.kind === "error") return <p className='text-sm text-red-500'>{result.message}</p>

    const d = result.data
    const accepted = d.verdict === "Accepted"

    return (
        <div>
            <div className='flex items-baseline gap-3 flex-wrap mb-3'>
                <h3 className={`text-xl font-semibold ${VERDICT_STYLES[d.verdict]}`}>
                    {result.kind === "run" && accepted ? "Sample tests passed" : d.verdict}
                </h3>
                <span className='text-sm text-gray-500'>{d.passed}/{d.total} test cases passed</span>
                {result.kind === "submit" && accepted && d.time !== undefined &&
                    <span className='text-sm text-gray-500'>• {Math.round(d.time * 1000)} ms{d.memory ? ` • ${(d.memory / 1024).toFixed(1)} MB` : ""}</span>}
            </div>

            {d.error && <Block label={d.verdict === "Compilation Error" ? "Compiler output" : "Error"} danger>{d.error}</Block>}

            {result.kind === "run" && d.cases && <>
                <div className='flex gap-2 mb-3 flex-wrap'>
                    {d.cases.map((c, i) => (
                        <button key={i} onClick={() => setCaseIndex(i)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${caseIndex === i ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                            {c.ok ? <FaCheckCircle className='text-emerald-500' /> : <FaTimesCircle className='text-red-500' />} Case {i + 1}
                        </button>
                    ))}
                </div>
                {d.cases[caseIndex] && <>
                    <Block label='Input'>{d.cases[caseIndex].input}</Block>
                    <Block label='Expected'>{d.cases[caseIndex].expected}</Block>
                    <Block label='Your output' danger={!d.cases[caseIndex].ok}>{d.cases[caseIndex].output ?? "(no output)"}</Block>
                </>}
            </>}

            {result.kind === "submit" && d.failedCase && <>
                <p className='text-sm text-gray-600 mb-2'>Failed on test {d.passed + 1}:</p>
                <Block label='Input'>{d.failedCase.input}</Block>
                <Block label='Expected'>{d.failedCase.expected}</Block>
                <Block label='Your output' danger>{d.failedCase.output}</Block>
            </>}

            {d.stdout && <Block label='Your print statements (stdout)'>{d.stdout}</Block>}
        </div>
    )
}

function ProblemPage() {
    const { slug } = useParams()
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)

    const [problem, setProblem] = useState(null)
    const [error, setError] = useState("")
    const [language, setLanguage] = useState(() => storage.get("iq:lang") || "javascript")
    const [leftTab, setLeftTab] = useState("description")
    const [consoleTab, setConsoleTab] = useState("testcases")
    const [result, setResult] = useState(null)
    const [busy, setBusy] = useState(null)
    const [submissions, setSubmissions] = useState([])
    const [aiMessages, setAiMessages] = useState([])
    const [aiBusy, setAiBusy] = useState(false)
    const [showAuth, setShowAuth] = useState(false)
    const [editorVersion, setEditorVersion] = useState(0)
    const editorRef = useRef(null)

    const codeKey = `iq:code:${slug}:${language}`

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get(ServerUrl + `/api/practice/problems/${slug}`, { withCredentials: true })
                setProblem(res.data)
                setResult(null)
                setAiMessages([])
            } catch (error) {
                setError(error.response?.data?.message || "Could not load problem")
            }
        }
        load()
    }, [slug])

    const loadSubmissions = useCallback(async () => {
        if (!userData) return
        try {
            const res = await axios.get(ServerUrl + `/api/practice/problems/${slug}/submissions`, { withCredentials: true })
            setSubmissions(res.data)
        } catch (error) {
            console.log(error)
        }
    }, [slug, userData])

    useEffect(() => {
        if (leftTab === "submissions") loadSubmissions()
    }, [leftTab, loadSubmissions])

    const getCode = () => editorRef.current?.getValue() ?? ""

    const execute = async (kind) => {
        if (!userData) return setShowAuth(true)
        if (busy) return
        setBusy(kind)
        setConsoleTab("result")
        try {
            const res = await axios.post(ServerUrl + `/api/practice/problems/${slug}/${kind}`, { language, code: getCode() }, { withCredentials: true })
            setResult({ kind, data: res.data, id: Date.now() })
            if (kind === "submit") {
                const solved = res.data.verdict === "Accepted"
                if (solved) {
                    celebrate()
                    toast.success(`Accepted! ${res.data.passed}/${res.data.total} tests passed`)
                } else toast.error(`${res.data.verdict}: ${res.data.passed}/${res.data.total} tests passed`)
                setProblem(p => ({ ...p, status: solved || p.status === "solved" ? "solved" : "attempted" }))
                loadSubmissions()
            }
        } catch (error) {
            setResult({ kind: "error", message: error.response?.data?.message || error.message })
        } finally {
            setBusy(null)
        }
    }

    // Keyboard shortcuts are registered once, so they call the latest execute through a ref
    const executeRef = useRef(execute)
    useLayoutEffect(() => {
        executeRef.current = execute
    })

    const handleMount = (editor, monaco) => {
        editorRef.current = editor
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => executeRef.current("run"))
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => executeRef.current("submit"))
    }

    const changeLanguage = (next) => {
        setLanguage(next)
        storage.set("iq:lang", next)
    }

    const resetCode = () => {
        if (!window.confirm("Reset to the starter code? Your code for this language will be lost.")) return
        storage.remove(codeKey)
        setEditorVersion(v => v + 1)
    }

    const loadSubmission = (s) => {
        storage.set(`iq:code:${slug}:${s.language}`, s.code)
        changeLanguage(s.language)
        setEditorVersion(v => v + 1)
    }

    const askAi = async (mode) => {
        if (!userData) return setShowAuth(true)
        setAiBusy(true)
        try {
            const res = await axios.post(ServerUrl + `/api/practice/problems/${slug}/${mode}`, { language, code: getCode() }, { withCredentials: true })
            setAiMessages(m => [...m, { mode, content: res.data.content }])
        } catch (error) {
            setAiMessages(m => [...m, { mode, content: error.response?.data?.message || "AI request failed" }])
        } finally {
            setAiBusy(false)
        }
    }

    if (error) return <div className='min-h-screen flex items-center justify-center text-gray-500'>{error}</div>
    if (!problem) return <div className='min-h-screen flex items-center justify-center text-gray-500'>Loading...</div>

    return (
        <div className='h-screen flex flex-col bg-[#f3f3f3]'>
            <header className='flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-gray-200'>
                <div className='flex items-center gap-3 min-w-0'>
                    <button onClick={() => navigate("/practice")} className='p-2 rounded-full hover:bg-gray-100'><FaArrowLeft className='text-gray-600' /></button>
                    <p className='font-semibold truncate'>{problem.title}</p>
                    {problem.status === "solved" && <span className='flex items-center gap-1 text-xs text-emerald-600'><FaCheckCircle /> Solved</span>}
                </div>
                <div className='flex items-center gap-2'>
                    <button onClick={() => execute("run")} disabled={!!busy} className='flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm px-4 py-2 rounded-lg'>
                        <FaPlay size={11} /> {busy === "run" ? "Running..." : "Run"}
                    </button>
                    <button onClick={() => execute("submit")} disabled={!!busy} className='bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg'>
                        {busy === "submit" ? "Judging..." : "Submit"}
                    </button>
                </div>
            </header>

            <SplitPane
                className='flex-1 min-h-0 p-3 overflow-y-auto lg:overflow-hidden'
                mobileFirstClass='h-[70vh]'
                defaultFirst='45%'
                minFirst='25%'
                minSecond='30%'
                first={
                <section className='bg-white rounded-2xl border border-gray-200 flex flex-col h-full'>
                    <div className='flex gap-1 px-3 pt-3 border-b border-gray-100'>
                        {[["description", "Description"], ["submissions", "Submissions"], ["ai", "AI Help"]].map(([key, label]) => (
                            <button key={key} onClick={() => setLeftTab(key)}
                                className={`text-sm px-4 py-2 -mb-px border-b-2 ${leftTab === key ? "border-black font-medium" : "border-transparent text-gray-500"}`}>{label}</button>
                        ))}
                    </div>

                    <div className='flex-1 overflow-y-auto p-5'>
                        {leftTab === "description" && <>
                            <h1 className='text-2xl font-semibold mb-3'>{problem.title}</h1>
                            <div className='flex flex-wrap gap-2 mb-5'>
                                <span className={`text-xs px-3 py-1 rounded-full ${DIFFICULTY_STYLES[problem.difficulty]}`}>{problem.difficulty}</span>
                                {problem.topics.map(t => <span key={t} className='text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600'>{t}</span>)}
                            </div>
                            <RichText text={problem.description} className='text-gray-700 text-[15px]' />

                            {problem.examples.map((e, i) => (
                                <div key={i} className='mt-5'>
                                    <p className='font-semibold text-sm mb-2'>Example {i + 1}</p>
                                    <div className='border-l-2 border-gray-200 pl-4 text-sm font-mono space-y-1'>
                                        <p><span className='text-gray-500'>Input:</span> {e.input}</p>
                                        <p><span className='text-gray-500'>Output:</span> {e.output}</p>
                                        {e.explanation && <p className='font-sans text-gray-600'><span className='text-gray-500 font-mono'>Explanation:</span> {e.explanation}</p>}
                                    </div>
                                </div>
                            ))}

                            <p className='font-semibold text-sm mt-6 mb-2'>Constraints</p>
                            <ul className='list-disc pl-5 text-sm text-gray-700 space-y-1 font-mono'>
                                {problem.constraints.map(c => <li key={c}>{c}</li>)}
                            </ul>
                            {problem.followUp && <p className='text-sm text-gray-700 mt-5'><b>Follow-up:</b> {problem.followUp}</p>}

                            <p className='text-xs text-gray-400 mt-8'>
                                Submissions are judged against {problem.testCount} test cases. •{" "}
                                <a href={problem.leetcodeUrl} target='_blank' rel='noreferrer' className='underline inline-flex items-center gap-1'>Similar problem on LeetCode <FaExternalLinkAlt size={9} /></a>
                            </p>
                        </>}

                        {leftTab === "submissions" && (
                            !userData ? <p className='text-sm text-gray-500'>Log in to see your submissions.</p>
                                : submissions.length === 0 ? <p className='text-sm text-gray-500'>No submissions yet.</p>
                                    : <div className='divide-y divide-gray-100'>
                                        {submissions.map(s => (
                                            <div key={s._id} className='flex items-center justify-between gap-3 py-3 text-sm'>
                                                <div>
                                                    <p className={`font-medium ${VERDICT_STYLES[s.verdict]}`}>{s.verdict}</p>
                                                    <p className='text-xs text-gray-400'>{new Date(s.createdAt).toLocaleString()}</p>
                                                </div>
                                                <div className='flex items-center gap-4 text-gray-500'>
                                                    <span>{LANGUAGES[s.language]?.label}</span>
                                                    <span>{s.passed}/{s.total}</span>
                                                    {s.verdict === "Accepted" && s.time !== undefined && <span>{Math.round(s.time * 1000)} ms</span>}
                                                    <button onClick={() => loadSubmission(s)} className='text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200'>Load code</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                        )}

                        {leftTab === "ai" && <>
                            <p className='text-sm text-gray-500 mb-4'>The AI looks at the problem and your current code. Hints nudge you toward the approach without giving the answer away.</p>
                            <div className='flex gap-2 mb-5 flex-wrap'>
                                <button onClick={() => askAi("hint")} disabled={aiBusy} className='flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm disabled:opacity-50'><IoSparkles /> Get a hint</button>
                                <button onClick={() => askAi("analyze")} disabled={aiBusy} className='flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm disabled:opacity-50'>Analyze my code</button>
                            </div>
                            {aiBusy && <p className='text-sm text-gray-400 mb-3'>Thinking...</p>}
                            <div className='space-y-3'>
                                {[...aiMessages].reverse().map((m, i) => (
                                    <div key={i} className='bg-gray-50 rounded-xl p-4'>
                                        <p className='text-xs font-medium text-gray-500 mb-2'>{m.mode === "hint" ? "Hint" : "Code analysis"}</p>
                                        <div className='text-sm text-gray-700 whitespace-pre-wrap leading-relaxed'>{m.content}</div>
                                    </div>
                                ))}
                            </div>
                        </>}
                    </div>
                </section>
                }
                second={
                <SplitPane
                    orientation='vertical'
                    className='h-full'
                    defaultFirst='62%'
                    minFirst='25%'
                    minSecond='15%'
                    mobileFirstClass='h-[60vh]'
                    mobileSecondClass='h-[320px]'
                    first={
                    <div className='flex flex-col bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-800 h-full'>
                        <div className='flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-gray-800'>
                            <select value={language} onChange={e => changeLanguage(e.target.value)} className='bg-[#3c3c3c] text-gray-100 text-sm rounded-md px-3 py-1.5 outline-none'>
                                {Object.entries(LANGUAGES).map(([key, l]) => <option key={key} value={key}>{l.label}</option>)}
                            </select>
                            <button onClick={resetCode} title='Reset to starter code' className='text-gray-400 hover:text-white p-2'><FaUndo size={13} /></button>
                        </div>
                        <div className='flex-1 min-h-0'>
                            <Editor
                                key={`${slug}-${language}-${editorVersion}`}
                                theme='vs-dark'
                                language={language}
                                defaultValue={storage.get(codeKey) || problem.starterCode[language]}
                                onChange={(value) => storage.set(codeKey, value ?? "")}
                                onMount={handleMount}
                                options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, scrollBeyondLastLine: false, tabSize: 4 }}
                            />
                        </div>
                    </div>
                    }
                    second={
                    <div className='bg-white rounded-2xl border border-gray-200 h-full flex flex-col'>
                        <div className='flex gap-1 px-3 pt-2 border-b border-gray-100'>
                            {[["testcases", "Testcases"], ["result", "Result"]].map(([key, label]) => (
                                <button key={key} onClick={() => setConsoleTab(key)}
                                    className={`text-sm px-4 py-2 -mb-px border-b-2 ${consoleTab === key ? "border-black font-medium" : "border-transparent text-gray-500"}`}>{label}</button>
                            ))}
                        </div>
                        <div className='flex-1 overflow-y-auto p-4'>
                            {consoleTab === "testcases"
                                ? problem.examples.map((e, i) => (
                                    <div key={i} className='mb-4'>
                                        <p className='text-xs font-medium text-gray-600 mb-1'>Case {i + 1}</p>
                                        <Block label='Input'>{e.input}</Block>
                                        <Block label='Expected'>{e.output}</Block>
                                    </div>
                                ))
                                : <ResultPanel key={result?.id ?? 0} result={result} busy={busy} />}
                        </div>
                    </div>
                    }
                />
                }
            />

            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </div>
    )
}

export default ProblemPage
