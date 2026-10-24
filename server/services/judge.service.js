import { buildProgram, displayArgs, RESULT_MARKER, serializeTests } from "../practice/drivers.js"
import { execute, JudgeError, LANGUAGES } from "./codeRunner.service.js"

// Running a solution against a built-in problem's tests. Used by the practice pages and by interview rooms.

export const clip = (text, max = 1000) => (text && text.length > max ? text.slice(0, max) + "…" : text)

export const handleJudgeError = (res, error, what) => {
    if (error instanceof JudgeError) return res.status(error.httpStatus).json({ message: error.message })
    return res.status(500).json({ message: `${what} ${error.message}` })
}

// Returns an error message, or null when the code can be run
export const codeProblem = ({ language, code }) => {
    if (!LANGUAGES.includes(language)) return `Unsupported language ${language}`
    if (!code?.trim() || code.length > 50000) return "Code is empty or too long"
    return null
}

// Runs the user's function against the given tests in ONE execution
export const judge = async (problem, language, code, tests) => {
    const result = await execute({
        language,
        source: buildProgram(language, code, problem.signature),
        stdin: serializeTests(problem.signature, tests.map(t => t.args))
    })

    const outputs = []
    const userLines = []
    for (const line of result.stdout.split("\n")) {
        if (line.startsWith(RESULT_MARKER)) outputs.push(line.slice(RESULT_MARKER.length).trim())
        else userLines.push(line)
    }

    let verdict = "Accepted"
    let failedIndex = -1
    if (result.statusId === 6) {
        verdict = "Compilation Error"
    } else {
        failedIndex = tests.findIndex((t, i) => outputs[i] === undefined || outputs[i] !== t.expected)
        if (failedIndex !== -1) {
            if (outputs[failedIndex] !== undefined) verdict = "Wrong Answer"
            else verdict = result.statusId === 5 ? "Time Limit Exceeded" : "Runtime Error"
        }
    }

    return {
        verdict,
        outputs,
        failedIndex,
        passed: verdict === "Accepted" ? tests.length : Math.max(0, failedIndex),
        total: tests.length,
        stdout: clip(userLines.join("\n").trim(), 5000),
        error: clip(result.compileOutput || result.stderr, 5000),
        time: result.time ? Number(result.time) : undefined,
        memory: result.memory
    }
}

// Run = the visible examples, each case shown
export const runSamples = async (problem, language, code) => {
    const r = await judge(problem, language, code, problem.sampleTests)
    return {
        verdict: r.verdict,
        // every sample is shown, so count all that pass (not just those before the first failure)
        passed: problem.sampleTests.filter((t, i) => r.outputs[i] === t.expected).length,
        total: r.total,
        stdout: r.stdout,
        error: r.error,
        time: r.time,
        cases: problem.sampleTests.map((t, i) => ({
            input: displayArgs(problem.signature, t.args),
            expected: t.expected,
            output: r.outputs[i] ?? null,
            ok: r.outputs[i] === t.expected
        }))
    }
}

// Submit = every hidden test; only the first failing case is revealed
export const runAllTests = async (problem, language, code) => {
    const r = await judge(problem, language, code, problem.allTests)
    const failed = r.failedIndex >= 0 && r.verdict === "Wrong Answer" ? problem.allTests[r.failedIndex] : null
    return {
        verdict: r.verdict,
        passed: r.passed,
        total: r.total,
        time: r.time,
        memory: r.memory,
        stdout: r.stdout,
        error: r.error,
        failedCase: failed && {
            input: clip(displayArgs(problem.signature, failed.args)),
            expected: clip(failed.expected),
            output: clip(r.outputs[r.failedIndex])
        }
    }
}
