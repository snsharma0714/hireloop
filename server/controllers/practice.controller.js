import Submission from "../models/submission.model.js"
import SheetProgress from "../models/sheetProgress.model.js"
import { getProblem, listProblems } from "../practice/problems.js"
import { displayArgs, starterCode } from "../practice/drivers.js"
import { LANGUAGES } from "../services/codeRunner.service.js"
import { codeProblem, handleJudgeError, runAllTests, runSamples as judgeSamples } from "../services/judge.service.js"
import { askAi } from "../services/openRouter.service.js"
import { computeStats, statusMap } from "../services/practiceStats.service.js"

const handleError = handleJudgeError

const validateCode = (req, res) => {
    const problem = codeProblem(req.body)
    if (problem) res.status(400).json({ message: problem })
    return !problem
}

export const getProblems = async (req, res) => {
    try {
        const status = await statusMap(req.userId)
        const problems = listProblems().map(p => ({
            slug: p.slug,
            title: p.title,
            difficulty: p.difficulty,
            topics: p.topics,
            status: status[p.slug] || null
        }))
        return res.status(200).json(problems)
    } catch (error) {
        return handleError(res, error, "failed to get problems")
    }
}

export const getProblemBySlug = async (req, res) => {
    try {
        const p = getProblem(req.params.slug)
        if (!p) return res.status(404).json({ message: "Problem not found" })
        const status = await statusMap(req.userId)
        return res.status(200).json({
            slug: p.slug,
            title: p.title,
            difficulty: p.difficulty,
            topics: p.topics,
            description: p.description,
            constraints: p.constraints,
            followUp: p.followUp,
            examples: p.examples.map((e, i) => ({
                input: displayArgs(p.signature, e.args),
                output: p.sampleTests[i].expected,
                explanation: e.explanation
            })),
            starterCode: Object.fromEntries(LANGUAGES.map(l => [l, starterCode(l, p.signature)])),
            leetcodeUrl: `https://leetcode.com/problems/${p.slug}/`,
            testCount: p.allTests.length,
            status: status[p.slug] || null
        })
    } catch (error) {
        return handleError(res, error, "failed to get problem")
    }
}

// Run = sample tests only, nothing saved
export const runSamples = async (req, res) => {
    try {
        const p = getProblem(req.params.slug)
        if (!p) return res.status(404).json({ message: "Problem not found" })
        if (!validateCode(req, res)) return

        const { language, code } = req.body
        return res.status(200).json(await judgeSamples(p, language, code))
    } catch (error) {
        return handleError(res, error, "run failed")
    }
}

// Submit = every hidden test, saved as a submission
export const submitSolution = async (req, res) => {
    try {
        const p = getProblem(req.params.slug)
        if (!p) return res.status(404).json({ message: "Problem not found" })
        if (!validateCode(req, res)) return

        const { language, code } = req.body
        const r = await runAllTests(p, language, code)

        const submission = await Submission.create({
            user: req.userId,
            problemSlug: p.slug,
            language,
            code,
            verdict: r.verdict,
            passed: r.passed,
            total: r.total,
            time: r.time,
            memory: r.memory
        })

        // Solving a built-in problem ticks it on every sheet that has it
        if (r.verdict === "Accepted") {
            const existing = await SheetProgress.findOne({ user: req.userId, key: p.slug })
            if (!existing?.solved) {
                await SheetProgress.updateOne(
                    { user: req.userId, key: p.slug },
                    { $set: { solved: true, solvedAt: new Date() } },
                    { upsert: true }
                )
            }
        }

        return res.status(200).json({ _id: submission._id, ...r })
    } catch (error) {
        return handleError(res, error, "submit failed")
    }
}

export const getSubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({ user: req.userId, problemSlug: req.params.slug })
            .sort({ createdAt: -1 })
            .limit(50)
        return res.status(200).json(submissions)
    } catch (error) {
        return handleError(res, error, "failed to get submissions")
    }
}

const aiHelp = (mode) => async (req, res) => {
    try {
        const p = getProblem(req.params.slug)
        if (!p) return res.status(404).json({ message: "Problem not found" })
        const { language, code } = req.body

        const system = mode === "hint"
            ? "You are a patient DSA mentor. Give ONE short, progressive hint (max 80 words) that nudges the student toward the optimal approach. Point out a bug in their code if there is one. Never write the full solution or complete code."
            : "You are a senior engineer reviewing a DSA solution. In under 150 words of markdown, state the time and space complexity with a one-line justification each, whether it is optimal for the constraints, and one concrete improvement if any."

        const content = await askAi([
            { role: "system", content: system },
            {
                role: "user",
                content: `Problem: ${p.title}
${p.description}
Constraints: ${p.constraints.join("; ")}

My ${language} code:
${(code || "").slice(0, 6000) || "(empty)"}`
            }
        ])
        return res.status(200).json({ content })
    } catch (error) {
        return handleError(res, error, "AI help failed")
    }
}

export const getHint = aiHelp("hint")
export const analyzeCode = aiHelp("analyze")

export const getStats = async (req, res) => {
    try {
        return res.status(200).json(await computeStats(req.userId))
    } catch (error) {
        return handleError(res, error, "failed to get stats")
    }
}
