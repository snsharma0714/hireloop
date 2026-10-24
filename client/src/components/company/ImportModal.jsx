import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaTimes, FaFileCsv } from 'react-icons/fa'
import { ServerUrl } from '../../App'

const SAMPLE = "name,email,phone,headline,location,skills,tags\nRiya Sharma,riya@example.com,+91 98765 43210,SDE-1 at Swiggy,Bengaluru,\"Java, Spring\",backend\n"

// Upload CSV -> preview (dry run) -> import
function ImportModal({ onClose, onDone }) {
    const [csv, setCsv] = useState("")
    const [fileName, setFileName] = useState("")
    const [preview, setPreview] = useState(null)
    const [onDuplicate, setOnDuplicate] = useState("skip")
    const [tag, setTag] = useState("")
    const [busy, setBusy] = useState(false)

    const pick = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) return toast.error("CSV must be under 2 MB")
        const reader = new FileReader()
        reader.onload = async () => {
            setCsv(reader.result)
            setFileName(file.name)
            await run(reader.result, true)
        }
        reader.readAsText(file)
    }

    const run = async (text, dryRun) => {
        setBusy(true)
        try {
            const res = await axios.post(ServerUrl + "/api/candidates/import", { csv: text, dryRun, onDuplicate, tag }, { withCredentials: true })
            if (dryRun) setPreview(res.data)
            else {
                toast.success(`Imported ${res.data.created} new${res.data.updated ? `, updated ${res.data.updated}` : ""}`)
                onDone()
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Import failed")
            if (dryRun) setPreview(null)
        } finally {
            setBusy(false)
        }
    }

    const downloadSample = () => {
        const url = URL.createObjectURL(new Blob([SAMPLE], { type: "text/csv" }))
        const a = document.createElement("a")
        a.href = url
        a.download = "candidates-sample.csv"
        a.click()
        URL.revokeObjectURL(url)
    }

    const willImport = preview ? preview.valid + (onDuplicate === "update" ? preview.duplicates : 0) : 0

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4'>
            <div className='relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-8 max-h-[92vh] overflow-y-auto'>
                <button onClick={onClose} className='absolute top-6 right-6 text-gray-500 hover:text-black'><FaTimes /></button>
                <h2 className='text-2xl font-semibold'>Import candidates</h2>
                <p className='text-sm text-gray-500 mt-1 mb-5'>
                    CSV with a header row. Recognised columns: name (or first/last name), email, phone, headline, location, company, skills, tags, linkedin, resume.{" "}
                    <button onClick={downloadSample} className='underline'>Download a sample</button>
                </p>

                <label className='flex items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-black'>
                    <FaFileCsv size={22} className='text-emerald-600' />
                    <span className='text-sm'>{fileName || "Choose a .csv file"}</span>
                    <input type='file' accept='.csv,text/csv' onChange={pick} className='hidden' data-testid='csv-input' />
                </label>

                {preview && <>
                    <div className='grid grid-cols-4 gap-3 my-5 text-center'>
                        {[["Rows", preview.total, ""], ["New", preview.valid, "text-emerald-600"], ["Already in pool", preview.duplicates, "text-amber-600"], ["Errors", preview.errors, "text-red-500"]].map(([l, v, c]) => (
                            <div key={l} className='bg-gray-50 rounded-xl p-3'><p className={`text-xl font-bold ${c}`}>{v}</p><p className='text-xs text-gray-500'>{l}</p></div>
                        ))}
                    </div>
                    <p className='text-xs text-gray-500 mb-2'>Columns found: {preview.columns.join(", ")}</p>
                    <div className='border border-gray-100 rounded-xl overflow-x-auto max-h-64'>
                        <table className='w-full text-xs'>
                            <thead className='bg-gray-50 text-gray-500'><tr>{["Line", "Name", "Email", "Skills", "Tags", "Status"].map(h => <th key={h} className='text-left px-3 py-2 font-medium'>{h}</th>)}</tr></thead>
                            <tbody>
                                {preview.preview.map(r => (
                                    <tr key={r.line} className='border-t border-gray-100'>
                                        <td className='px-3 py-2 text-gray-400'>{r.line}</td>
                                        <td className='px-3 py-2'>{r.name}</td>
                                        <td className='px-3 py-2'>{r.email}</td>
                                        <td className='px-3 py-2'>{r.skills.join(", ")}</td>
                                        <td className='px-3 py-2'>{r.tags.join(", ")}</td>
                                        <td className='px-3 py-2'>
                                            {r.error ? <span className='text-red-500'>{r.error}</span> : r.duplicateOf ? <span className='text-amber-600'>matches {r.duplicateOf}</span> : <span className='text-emerald-600'>new</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {preview.total > preview.preview.length && <p className='text-xs text-gray-400 mt-1'>Showing the first {preview.preview.length} rows.</p>}

                    <div className='grid md:grid-cols-2 gap-3 mt-5'>
                        <select value={onDuplicate} onChange={e => setOnDuplicate(e.target.value)} className='border border-gray-200 rounded-xl px-3 py-2.5 text-sm'>
                            <option value='skip'>People already in the pool: skip them</option>
                            <option value='update'>People already in the pool: update their details</option>
                        </select>
                        <input value={tag} onChange={e => setTag(e.target.value)} placeholder='Tag everyone imported (optional)' className='border border-gray-200 rounded-xl px-3 py-2.5 text-sm' />
                    </div>
                    <button onClick={() => run(csv, false)} disabled={busy || willImport === 0}
                        className='w-full mt-5 bg-black text-white py-3 rounded-full disabled:opacity-40'>
                        {busy ? "Importing..." : `Import ${willImport} candidate${willImport === 1 ? "" : "s"}`}
                    </button>
                </>}
            </div>
        </div>
    )
}

export default ImportModal
