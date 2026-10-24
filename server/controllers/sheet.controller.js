import SheetProgress from "../models/sheetProgress.model.js"
import { getSheet, listSheets } from "../practice/sheets.js"
import { listProblems } from "../practice/problems.js"

const progressFor = async (userId, keys) => {
    if (!userId) return {}
    const rows = await SheetProgress.find({ user: userId, key: { $in: keys } })
    return Object.fromEntries(rows.map(r => [r.key, { solved: r.solved, revisit: r.revisit }]))
}

const sheetKeys = (sheet) => sheet.sections.flatMap(s => s.problems.map(p => p.key))

export const getSheets = async (req, res) => {
    try {
        const sheets = listSheets()
        const progress = await progressFor(req.userId, [...new Set(sheets.flatMap(sheetKeys))])
        return res.status(200).json(sheets.map(s => ({
            id: s.id,
            name: s.name,
            author: s.author,
            description: s.description,
            total: s.total,
            sections: s.sections.length,
            solved: sheetKeys(s).filter(k => progress[k]?.solved).length
        })))
    } catch (error) {
        return res.status(500).json({ message: `failed to get sheets ${error}` })
    }
}

export const getSheetById = async (req, res) => {
    try {
        const sheet = getSheet(req.params.id)
        if (!sheet) return res.status(404).json({ message: "Sheet not found" })
        const progress = await progressFor(req.userId, sheetKeys(sheet))
        return res.status(200).json({
            ...sheet,
            progress,
            // problems that can be solved in the built-in editor
            builtIn: listProblems().map(p => p.slug)
        })
    } catch (error) {
        return res.status(500).json({ message: `failed to get sheet ${error}` })
    }
}

export const updateProgress = async (req, res) => {
    try {
        const { key } = req.params
        const known = listSheets().some(s => sheetKeys(s).includes(key))
        if (!known) return res.status(404).json({ message: "Unknown problem" })

        const update = {}
        if (typeof req.body.solved === "boolean") {
            update.solved = req.body.solved
            update.solvedAt = req.body.solved ? new Date() : null
        }
        if (typeof req.body.revisit === "boolean") update.revisit = req.body.revisit

        const row = await SheetProgress.findOneAndUpdate(
            { user: req.userId, key },
            { $set: update },
            { upsert: true, new: true }
        )
        return res.status(200).json({ key, solved: row.solved, revisit: row.revisit })
    } catch (error) {
        return res.status(500).json({ message: `failed to update progress ${error}` })
    }
}
