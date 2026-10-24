import axios from "axios"
import { spawn } from "child_process"
import { chown, mkdtemp, rm, writeFile } from "fs/promises"
import os from "os"
import path from "path"

// Runs one program and returns a Judge0-shaped result:
//   { statusId, status, stdout, stderr, compileOutput, time, memory }
// statusId follows Judge0: 3 ok, 5 time limit, 6 compile error, 11 runtime error.
//
// Which backend is used:
//   JUDGE0_API_KEY or JUDGE0_URL set -> Judge0 (RapidAPI or self-hosted)
//   PISTON_URL set                   -> self-hosted Piston
//   otherwise                        -> local runner (free, runs on this machine)

export const LANGUAGES = ["javascript", "python", "cpp", "java"]

export class JudgeError extends Error {
    constructor(message, httpStatus) {
        super(message)
        this.httpStatus = httpStatus
    }
}

const RUN_TIMEOUT_MS = 5000
const COMPILE_TIMEOUT_MS = 20000
const MAX_OUTPUT = 8 * 1024 * 1024

const result = (statusId, fields = {}) => ({
    statusId,
    status: { 3: "Accepted", 5: "Time Limit Exceeded", 6: "Compilation Error", 11: "Runtime Error" }[statusId],
    stdout: "",
    stderr: "",
    compileOutput: "",
    ...fields
})

// ---------- local runner ----------

// User code must never see the server's secrets (MONGODB_URL, JWT_SECRET...), so it gets a bare environment
// RUNNER_EXTRA_PATH lets compilers live outside the system PATH (e.g. a user-level g++ / JDK on Windows)
const safeEnv = () => {
    const keep = ["SYSTEMROOT", "SystemRoot", "TEMP", "TMP", "HOME", "USERPROFILE", "LANG"]
    const env = Object.fromEntries(keep.filter(k => process.env[k]).map(k => [k, process.env[k]]))
    const systemPath = process.env.PATH || process.env.Path || ""
    env.PATH = [process.env.RUNNER_EXTRA_PATH, systemPath].filter(Boolean).join(path.delimiter)
    return env
}

// On a Linux server (the Docker image sets RUNNER_UID) user code runs as a separate unprivileged user,
// so it can't read the server's files or its environment through /proc, and prlimit caps processes,
// file size and memory. Locally (e.g. Windows dev) these are skipped.
const SANDBOX_UID = process.platform === "linux" && process.env.RUNNER_UID ? Number(process.env.RUNNER_UID) : null
const SANDBOX_GID = SANDBOX_UID !== null ? Number(process.env.RUNNER_GID || process.env.RUNNER_UID) : null

const sandboxed = (cmd, args, memoryBytes) => {
    if (SANDBOX_UID === null) return [cmd, args]
    const limits = ["--nproc=256", "--fsize=33554432", "--core=0", ...(memoryBytes ? [`--as=${memoryBytes}`] : [])]
    return ["prlimit", [...limits, "--", cmd, ...args]]
}

const runProcess = (rawCmd, rawArgs, { cwd, stdin = "", timeout, memoryBytes }) => new Promise((resolve) => {
    const started = Date.now()
    let stdout = "", stderr = "", timedOut = false, finished = false
    const [cmd, args] = sandboxed(rawCmd, rawArgs, memoryBytes)
    const isLinux = process.platform === "linux"
    const child = spawn(cmd, args, {
        cwd,
        // sandboxed programs can't write to the server's HOME, so they get their temp folder instead
        env: SANDBOX_UID !== null ? { ...safeEnv(), HOME: cwd } : safeEnv(),
        windowsHide: true,
        // own process group on Linux, so a timeout kills everything the program started
        detached: isLinux,
        ...(SANDBOX_UID !== null ? { uid: SANDBOX_UID, gid: SANDBOX_GID } : {})
    })

    const timer = setTimeout(() => {
        timedOut = true
        try {
            if (isLinux) process.kill(-child.pid, "SIGKILL")
            else child.kill("SIGKILL")
        } catch { /* already gone */ }
    }, timeout)

    const finish = (value) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        resolve({ ...value, time: (Date.now() - started) / 1000 })
    }

    child.stdout.on("data", d => { if (stdout.length < MAX_OUTPUT) stdout += d })
    child.stderr.on("data", d => { if (stderr.length < MAX_OUTPUT) stderr += d })
    child.on("error", (error) => finish({ spawnError: error, stdout, stderr, code: null }))
    child.on("close", (code) => finish({ code, stdout, stderr, timedOut }))

    child.stdin.on("error", () => {}) // program may exit before reading all input
    child.stdin.end(stdin)
})

const MB = 1024 * 1024

// memory: address-space cap for the sandbox (JVM and V8 reserve big virtual ranges, so they use their own flags)
const TOOLS = {
    javascript: { file: "main.js", run: () => ["node", ["--max-old-space-size=256", "--stack-size=16000", "main.js"]] },
    python: { file: "main.py", memory: 512 * MB, run: () => [process.env.PYTHON_CMD || (process.platform === "win32" ? "python" : "python3"), ["main.py"]] },
    cpp: {
        file: "main.cpp",
        memory: 512 * MB,
        compile: () => ["g++", ["-O2", "-std=c++17", "main.cpp", "-o", "main.exe"]],
        run: (dir) => [path.join(dir, "main.exe"), []]
    },
    java: {
        file: "Main.java",
        compile: () => ["javac", ["-J-Xmx256m", "-encoding", "UTF-8", "Main.java"]],
        run: () => ["java", ["-Xmx256m", "-Xss64m", "-cp", ".", "Main"]]
    }
}

const TOOL_NAMES = { javascript: "Node.js", python: "Python", cpp: "a C++ compiler (g++)", java: "a Java JDK (javac)" }

// Only a couple of programs at a time so a burst of submissions can't overload the machine
let running = 0
const queue = []
const withSlot = async (fn) => {
    if (running >= 2) await new Promise(r => queue.push(r))
    running++
    try {
        return await fn()
    } finally {
        running--
        queue.shift()?.()
    }
}

const executeLocal = ({ language, source, stdin }) => withSlot(async () => {
    const tool = TOOLS[language]
    const dir = await mkdtemp(path.join(os.tmpdir(), "iq-run-"))
    const missing = () => new JudgeError(`Can't run ${language}: ${TOOL_NAMES[language]} is not installed on the server`, 503)
    try {
        await writeFile(path.join(dir, tool.file), source)
        if (SANDBOX_UID !== null) {
            await chown(dir, SANDBOX_UID, SANDBOX_GID)
            await chown(path.join(dir, tool.file), SANDBOX_UID, SANDBOX_GID)
        }

        if (tool.compile) {
            const [cmd, args] = tool.compile(dir)
            const c = await runProcess(cmd, args, { cwd: dir, timeout: COMPILE_TIMEOUT_MS })
            if (c.spawnError) throw missing()
            // Windows Smart App Control blocks MinGW's unsigned assembler; say so instead of showing a baffling error
            if (process.platform === "win32" && /cannot execute '[^']*\bas\.exe'/.test(c.stderr)) {
                throw new JudgeError(`Can't run ${language} on this PC: Windows Smart App Control blocks the compiler's assembler (as.exe). It works on the deployed Linux server.`, 503)
            }
            if (c.timedOut || c.code !== 0) return result(6, { compileOutput: c.timedOut ? "Compilation timed out" : (c.stderr || c.stdout) })
        }

        const [cmd, args] = tool.run(dir)
        const r = await runProcess(cmd, args, { cwd: dir, stdin, timeout: RUN_TIMEOUT_MS, memoryBytes: tool.memory })
        if (r.spawnError) throw missing()
        const statusId = r.timedOut ? 5 : r.code === 0 ? 3 : 11
        return result(statusId, { stdout: r.stdout, stderr: r.stderr, time: r.time })
    } finally {
        rm(dir, { recursive: true, force: true }).catch(() => {})
    }
})

// ---------- Piston (self-hosted: https://github.com/engineer-man/piston) ----------

const PISTON_LANG = { javascript: "javascript", python: "python", cpp: "c++", java: "java" }

const executePiston = async ({ language, source, stdin }) => {
    try {
        const { data } = await axios.post(`${process.env.PISTON_URL}/api/v2/execute`, {
            language: PISTON_LANG[language],
            version: "*",
            files: [{ name: TOOLS[language].file, content: source }],
            stdin,
            compile_timeout: COMPILE_TIMEOUT_MS,
            run_timeout: RUN_TIMEOUT_MS
        }, { timeout: 30000 })
        if (data.compile && data.compile.code !== 0) return result(6, { compileOutput: data.compile.stderr || data.compile.output })
        const run = data.run || {}
        const statusId = run.signal === "SIGKILL" ? 5 : run.code === 0 ? 3 : 11
        return result(statusId, { stdout: run.stdout, stderr: run.stderr })
    } catch (error) {
        throw new JudgeError(`Code run failed ${error.response?.data?.message || error.message}`, 502)
    }
}

// ---------- Judge0 (RapidAPI or self-hosted) ----------

const JUDGE0_IDS = { javascript: 63, python: 71, cpp: 54, java: 62 }
const toB64 = (str) => Buffer.from(str || "", "utf8").toString("base64")
const fromB64 = (str) => (str ? Buffer.from(str, "base64").toString("utf8") : "")

const executeJudge0 = async ({ language, source, stdin }) => {
    const apiKey = process.env.JUDGE0_API_KEY
    const baseUrl = process.env.JUDGE0_URL || "https://judge0-ce.p.rapidapi.com"
    const headers = { "Content-Type": "application/json" }
    if (apiKey) {
        headers["X-RapidAPI-Key"] = apiKey
        headers["X-RapidAPI-Host"] = new URL(baseUrl).host
    }
    try {
        const { data } = await axios.post(
            `${baseUrl}/submissions?base64_encoded=true&wait=true`,
            { language_id: JUDGE0_IDS[language], source_code: toB64(source), stdin: toB64(stdin), cpu_time_limit: 5, wall_time_limit: 10 },
            { headers, timeout: 30000 }
        )
        const id = data.status?.id
        const statusId = id === 3 ? 3 : id === 5 ? 5 : id === 6 ? 6 : 11
        return result(statusId, {
            stdout: fromB64(data.stdout),
            stderr: fromB64(data.stderr),
            compileOutput: fromB64(data.compile_output),
            time: data.time ? Number(data.time) : undefined,
            memory: data.memory
        })
    } catch (error) {
        if (error.response?.status === 429) throw new JudgeError("Code runner daily limit reached. Try again later.", 429)
        throw new JudgeError(`Code run failed ${error.response?.data?.message || error.message}`, 502)
    }
}

export const runnerName = () =>
    process.env.JUDGE0_API_KEY || process.env.JUDGE0_URL ? "judge0" : process.env.PISTON_URL ? "piston" : "local"

export const execute = async ({ language, source, stdin }) => {
    if (!LANGUAGES.includes(language)) throw new JudgeError(`Unsupported language ${language}`, 400)
    const runner = runnerName()
    if (runner === "judge0") return executeJudge0({ language, source, stdin })
    if (runner === "piston") return executePiston({ language, source, stdin })
    return executeLocal({ language, source, stdin })
}
