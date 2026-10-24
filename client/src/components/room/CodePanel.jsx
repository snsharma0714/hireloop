import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaPlay, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { LANGUAGES } from './roomConstants'
import { celebrate } from '../practice/celebrate'

// Result of Run / Submit against a problem's tests (peer sessions)
function JudgeOutput({ output }) {
    const accepted = output.verdict === "Accepted"
    return (
        <div>
            <p className={`mb-2 ${accepted ? "text-emerald-400" : "text-red-400"}`}>
                {output.mode === "run" && accepted ? "Sample tests passed" : output.verdict} • {output.passed}/{output.total} tests
                {output.by && <span className='text-gray-500'> • run by {output.by}</span>}
            </p>
            {output.cases?.map((c, i) => (
                <div key={i} className='mb-2 text-gray-300'>
                    <p className='flex items-center gap-2'>{c.ok ? <FaCheckCircle className='text-emerald-500' /> : <FaTimesCircle className='text-red-500' />} Case {i + 1}: {c.input}</p>
                    {!c.ok && <p className='pl-6 text-gray-400'>expected {c.expected}, got {c.output ?? "nothing"}</p>}
                </div>
            ))}
            {output.failedCase && <div className='text-gray-300'>
                <p>Failed test: {output.failedCase.input}</p>
                <p className='text-gray-400'>expected {output.failedCase.expected}, got {output.failedCase.output}</p>
            </div>}
            {output.error && <pre className='text-red-400 whitespace-pre-wrap mt-2'>{output.error}</pre>}
            {output.stdout && <pre className='text-gray-100 whitespace-pre-wrap mt-2'>{output.stdout}</pre>}
        </div>
    )
}

// problem: optional { slug, starterCode, judgeUrl? } that turns on Run/Submit against that problem's tests.
// judgeUrl sends them to the interview room's own endpoint (no login needed, no practice record).
function CodePanel({ socket, token, initialCode, initialLanguage, onPaste, problem }) {
    const [language, setLanguage] = useState(initialLanguage || "javascript")
    const [stdin, setStdin] = useState("")
    const [output, setOutput] = useState(null)
    const [running, setRunning] = useState(false)
    // The editor owns its text (uncontrolled). Feeding it back through React state drops keystrokes when typing fast.
    const editorRef = useRef(null)
    const templateFor = (lang) => problem?.starterCode?.[lang] ?? LANGUAGES[lang].template
    const isTemplateOrEmpty = (code) => !code?.trim() || Object.keys(LANGUAGES).some(l => templateFor(l) === code || LANGUAGES[l].template === code)
    const [startText] = useState(() => initialCode || templateFor(initialLanguage || "javascript"))
    const codeRef = useRef(startText)
    const applyingRemote = useRef(false)
    const onPasteRef = useRef(onPaste)
    useLayoutEffect(() => {
        onPasteRef.current = onPaste
    })

    // Replace editor text without echoing it back to the other person; keeps cursor and undo history
    const setEditorText = (text) => {
        codeRef.current = text
        const editor = editorRef.current
        const model = editor?.getModel()
        if (!model || model.getValue() === text) return
        const selections = editor.getSelections()
        applyingRemote.current = true
        model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null)
        applyingRemote.current = false
        if (selections) editor.setSelections(selections)
    }

    useEffect(() => {
        if (!socket) return
        const onCodeUpdate = ({ code, language }) => {
            setEditorText(code)
            if (language) setLanguage(language)
        }
        const onRunOutput = (result) => setOutput(result)
        const onJudgeResult = (result) => {
            setOutput({ ...result, kind: "judge" })
            if (result.mode === "submit" && result.verdict === "Accepted") {
                celebrate()
                toast.success(`${result.by} solved it!`)
            }
        }
        socket.on("code-update", onCodeUpdate)
        socket.on("run-output", onRunOutput)
        socket.on("judge-result", onJudgeResult)
        return () => {
            socket.off("code-update", onCodeUpdate)
            socket.off("run-output", onRunOutput)
            socket.off("judge-result", onJudgeResult)
        }
    }, [socket])

    const handleChange = (value) => {
        if (applyingRemote.current) return
        codeRef.current = value ?? ""
        socket?.emit("code-change", { code: codeRef.current, language })
    }

    const handleLanguage = (next) => {
        const nextCode = isTemplateOrEmpty(codeRef.current) ? templateFor(next) : codeRef.current
        setLanguage(next)
        setEditorText(nextCode)
        socket?.emit("code-change", { code: nextCode, language: next })
    }

    const handleMount = (editor) => {
        editorRef.current = editor
        // Pick up any update that arrived before the editor finished loading
        if (editor.getValue() !== codeRef.current) editor.setValue(codeRef.current)
        editor.onDidPaste((e) => {
            const text = editor.getModel()?.getValueInRange(e.range) || ""
            onPasteRef.current?.(text.length)
        })
    }

    const runCode = async () => {
        setRunning(true)
        setOutput(null)
        let result
        try {
            const res = await axios.post(ServerUrl + "/api/code/run", { language, source: editorRef.current?.getValue() ?? codeRef.current, stdin, roomToken: token }, { withCredentials: true })
            result = res.data
        } catch (error) {
            result = { status: "Error", stderr: error.response?.data?.message || error.message }
        }
        setOutput(result)
        socket?.emit("run-output", result)
        setRunning(false)
    }

    const judge = async (mode) => {
        setRunning(mode)
        setOutput(null)
        try {
            const url = problem.judgeUrl ? ServerUrl + problem.judgeUrl : ServerUrl + `/api/practice/problems/${problem.slug}/${mode}`
            const res = await axios.post(url, { mode, language, code: editorRef.current?.getValue() ?? codeRef.current }, { withCredentials: true })
            const result = { kind: "judge", mode, ...res.data }
            setOutput(result)
            socket?.emit("judge-result", result)
            if (mode === "submit" && result.verdict === "Accepted") {
                celebrate()
                toast.success("Accepted! Nice work")
            }
        } catch (error) {
            setOutput({ status: "Error", stderr: error.response?.data?.message || error.message })
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className='flex flex-col h-full bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-800'>
            <div className='flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-800'>
                <select value={language} onChange={e => handleLanguage(e.target.value)} className='bg-[#3c3c3c] text-gray-100 text-sm rounded-md px-3 py-1.5 outline-none'>
                    {Object.entries(LANGUAGES).map(([key, l]) => <option key={key} value={key}>{l.label}</option>)}
                </select>
                {problem
                    ? <div className='flex gap-2'>
                        <button onClick={() => judge("run")} disabled={!!running} className='flex items-center gap-2 bg-[#3c3c3c] hover:bg-[#4a4a4a] disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-md'>
                            <FaPlay size={11} /> {running === "run" ? "Running..." : "Run"}
                        </button>
                        <button onClick={() => judge("submit")} disabled={!!running} className='bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-md'>
                            {running === "submit" ? "Judging..." : "Submit"}
                        </button>
                    </div>
                    : <button onClick={runCode} disabled={running} className='flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-md'>
                        <FaPlay size={11} /> {running ? "Running..." : "Run"}
                    </button>}
            </div>

            <div className='flex-1 min-h-[250px]'>
                <Editor
                    theme='vs-dark'
                    language={language}
                    defaultValue={startText}
                    onChange={handleChange}
                    onMount={handleMount}
                    options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, scrollBeyondLastLine: false }}
                />
            </div>

            <div className={`grid border-t border-gray-800 h-40 ${problem ? "" : "md:grid-cols-2"}`}>
                {!problem && <textarea value={stdin} onChange={e => setStdin(e.target.value)} placeholder='Custom input (stdin)'
                    className='bg-[#1e1e1e] text-gray-200 text-sm font-mono p-3 outline-none resize-none border-r border-gray-800' />}
                <div className='p-3 overflow-auto text-sm font-mono'>
                    {!output && <p className='text-gray-500'>{problem ? "Run checks the examples, Submit checks every hidden test" : "Output appears here"}</p>}
                    {output?.kind === "judge" && <JudgeOutput output={output} />}
                    {output && output.kind !== "judge" && <>
                        <p className={`mb-1 ${output.status === "Accepted" ? "text-emerald-400" : "text-yellow-400"}`}>
                            {output.status}{output.time && ` • ${output.time}s`}{output.memory && ` • ${output.memory} KB`}
                        </p>
                        {output.stdout && <pre className='text-gray-100 whitespace-pre-wrap'>{output.stdout}</pre>}
                        {output.compileOutput && <pre className='text-red-400 whitespace-pre-wrap'>{output.compileOutput}</pre>}
                        {output.stderr && <pre className='text-red-400 whitespace-pre-wrap'>{output.stderr}</pre>}
                    </>}
                </div>
            </div>
        </div>
    )
}

export default CodePanel
