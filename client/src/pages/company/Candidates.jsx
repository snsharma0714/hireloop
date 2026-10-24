import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaSearch, FaPlus, FaFileImport, FaTimes } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { can } from '../../components/company/access'
import { SOURCE_LABELS } from '../../components/company/candidateUtils'
import { timeAgo } from '../../components/jobs/jobUtils'
import CandidateForm from '../../components/company/CandidateForm'
import ImportModal from '../../components/company/ImportModal'

function Candidates() {
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)
    const canEdit = can(userData, "recruiter")
    const [params, setParams] = useSearchParams()
    const list = params.get("list") || ""
    const tag = params.get("tag") || ""
    const source = params.get("source") || ""
    const [q, setQ] = useState("")
    const [page, setPage] = useState(1)
    const [data, setData] = useState(null)
    const [tags, setTags] = useState([])
    const [lists, setLists] = useState([])
    const [selected, setSelected] = useState(new Set())
    const [bulkTag, setBulkTag] = useState("")
    const [modal, setModal] = useState(null) // "add" | "import"
    const [version, setVersion] = useState(0)

    const setFilter = (key, value) => {
        const next = new URLSearchParams(params)
        if (value) next.set(key, value)
        else next.delete(key)
        setParams(next)
        setPage(1)
        setSelected(new Set())
    }

    useEffect(() => {
        const id = setTimeout(() => {
            axios.get(ServerUrl + "/api/candidates", { params: { q, tag: tag || undefined, source: source || undefined, list: list || undefined, page }, withCredentials: true })
                .then(r => setData(r.data)).catch(() => setData({ total: 0, candidates: [], pages: 0 }))
        }, 250)
        return () => clearTimeout(id)
    }, [q, tag, source, list, page, version])

    const loadMeta = useCallback(() => {
        axios.get(ServerUrl + "/api/candidates/tags", { withCredentials: true }).then(r => setTags(r.data)).catch(() => {})
        axios.get(ServerUrl + "/api/candidates/lists", { withCredentials: true }).then(r => setLists(r.data)).catch(() => {})
    }, [])
    useEffect(() => { loadMeta() }, [loadMeta, version])

    const refresh = () => setVersion(v => v + 1)

    const toggle = (id) => {
        const next = new Set(selected)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelected(next)
    }

    const bulk = async (body, message) => {
        try {
            await axios.post(ServerUrl + "/api/candidates/bulk", { ids: [...selected], ...body }, { withCredentials: true })
            toast.success(message)
            setBulkTag("")
            setSelected(new Set())
            refresh()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not update")
        }
    }

    const newList = async () => {
        const name = window.prompt("Name the new list (e.g. 'Backend - strong maybes')")
        if (!name?.trim()) return
        try {
            const res = await axios.post(ServerUrl + "/api/candidates/lists", { name }, { withCredentials: true })
            if (selected.size) await axios.post(ServerUrl + "/api/candidates/bulk", { ids: [...selected], listId: res.data._id }, { withCredentials: true })
            toast.success(`List "${res.data.name}" created${selected.size ? ` with ${selected.size} candidates` : ""}`)
            setSelected(new Set())
            refresh()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not create list")
        }
    }

    const deleteList = async () => {
        const current = lists.find(l => l._id === list)
        if (!current || !window.confirm(`Delete the list "${current.name}"? Candidates stay in the talent pool.`)) return
        await axios.delete(ServerUrl + `/api/candidates/lists/${list}`, { withCredentials: true })
        setFilter("list", "")
        refresh()
    }

    const removeFromList = async () => {
        await axios.patch(ServerUrl + `/api/candidates/lists/${list}`, { remove: [...selected] }, { withCredentials: true })
        toast.success("Removed from list")
        setSelected(new Set())
        refresh()
    }

    const rows = data?.candidates || []
    const allSelected = rows.length > 0 && rows.every(c => selected.has(c._id))

    return (
        <div className='p-6 lg:p-10 max-w-6xl'>
            <div className='flex items-start justify-between gap-4 flex-wrap mb-6'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-800'>Candidates</h1>
                    <p className='text-gray-500 mt-1'>Your talent pool: everyone who applied, plus people you add or import.</p>
                </div>
                {canEdit &&
                    <div className='flex gap-2'>
                        <button onClick={() => setModal("import")} className='flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm hover:bg-gray-50'><FaFileImport /> Import CSV</button>
                        <button onClick={() => setModal("add")} className='flex items-center gap-2 px-4 py-2.5 rounded-full bg-black text-white text-sm'><FaPlus size={11} /> Add candidate</button>
                    </div>}
            </div>

            {/* saved lists */}
            <div className='flex items-center gap-2 flex-wrap mb-4'>
                <span className='text-xs text-gray-500 mr-1'>Lists:</span>
                <button onClick={() => setFilter("list", "")} className={`text-xs px-3 py-1.5 rounded-full ${!list ? "bg-black text-white" : "bg-white border border-gray-200"}`}>All candidates</button>
                {lists.map(l => (
                    <button key={l._id} onClick={() => setFilter("list", l._id)} className={`text-xs px-3 py-1.5 rounded-full ${list === l._id ? "bg-black text-white" : "bg-white border border-gray-200"}`}>{l.name} ({l.count})</button>
                ))}
                {canEdit && <button onClick={newList} className='text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-500 hover:text-black'>+ New list</button>}
                {list && canEdit && <button onClick={deleteList} className='text-xs text-red-500 ml-1'>Delete this list</button>}
            </div>

            <div className='flex flex-wrap gap-3 mb-4'>
                <div className='flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 flex-1 min-w-[220px]'>
                    <FaSearch className='text-gray-400' size={13} />
                    <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder='Search name, email, skill, company, tag...' className='outline-none text-sm flex-1' />
                </div>
                <select value={tag} onChange={e => setFilter("tag", e.target.value)} className='bg-white border border-gray-200 rounded-full px-4 py-2 text-sm'>
                    <option value=''>All tags</option>
                    {tags.map(t => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
                </select>
                <select value={source} onChange={e => setFilter("source", e.target.value)} className='bg-white border border-gray-200 rounded-full px-4 py-2 text-sm'>
                    <option value=''>All sources</option>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {canEdit && selected.size > 0 &&
                <div className='flex items-center gap-3 flex-wrap bg-black text-white rounded-2xl px-4 py-3 mb-3 text-sm'>
                    <span>{selected.size} selected</span>
                    <input value={bulkTag} onChange={e => setBulkTag(e.target.value)} placeholder='tag' className='bg-white/10 rounded-lg px-3 py-1 outline-none w-28' />
                    <button disabled={!bulkTag.trim()} onClick={() => bulk({ addTag: bulkTag }, `Tagged ${selected.size} as "${bulkTag}"`)} className='underline disabled:opacity-40'>Add tag</button>
                    <select value='' onChange={e => e.target.value && bulk({ listId: e.target.value }, "Added to list")} className='bg-white/10 rounded-lg px-2 py-1'>
                        <option value=''>Add to list...</option>
                        {lists.map(l => <option key={l._id} value={l._id} className='text-black'>{l.name}</option>)}
                    </select>
                    {list && <button onClick={removeFromList} className='underline'>Remove from this list</button>}
                    <button onClick={() => setSelected(new Set())} className='ml-auto'><FaTimes /></button>
                </div>}

            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto'>
                <table className='w-full text-sm'>
                    <thead className='text-xs text-gray-500 border-b border-gray-100'>
                        <tr>
                            {canEdit && <th className='px-4 py-3 w-8'><input type='checkbox' aria-label='Select all' checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(c => c._id)))} /></th>}
                            <th className='text-left px-4 py-3 font-medium'>Candidate</th>
                            <th className='text-left px-4 py-3 font-medium hidden md:table-cell'>Tags</th>
                            <th className='text-left px-4 py-3 font-medium hidden md:table-cell'>Source</th>
                            <th className='text-left px-4 py-3 font-medium'>Jobs</th>
                            <th className='text-left px-4 py-3 font-medium hidden md:table-cell'>Last activity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data && rows.length === 0 && <tr><td colSpan={6} className='p-10 text-center text-gray-500'>No candidates match.</td></tr>}
                        {rows.map(c => (
                            <tr key={c._id} className='border-t border-gray-50 hover:bg-gray-50 cursor-pointer' onClick={() => navigate(`/company/candidates/${c._id}`)}>
                                {canEdit && <td className='px-4 py-3' onClick={e => e.stopPropagation()}><input type='checkbox' aria-label={`Select ${c.name}`} checked={selected.has(c._id)} onChange={() => toggle(c._id)} /></td>}
                                <td className='px-4 py-3'>
                                    <p className='font-medium text-gray-800'>{c.name}</p>
                                    <p className='text-xs text-gray-500 truncate max-w-xs'>{[c.headline, c.email].filter(Boolean).join(" • ")}</p>
                                </td>
                                <td className='px-4 py-3 hidden md:table-cell'>
                                    <div className='flex flex-wrap gap-1'>{c.tags.slice(0, 4).map(t => <span key={t} className='text-[11px] px-2 py-0.5 rounded-full bg-gray-100'>{t}</span>)}</div>
                                </td>
                                <td className='px-4 py-3 text-xs text-gray-500 hidden md:table-cell'>{SOURCE_LABELS[c.source]}</td>
                                <td className='px-4 py-3 text-xs'>{c.applications}</td>
                                <td className='px-4 py-3 text-xs text-gray-500 hidden md:table-cell'>{timeAgo(c.lastActivityAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data && data.pages > 1 &&
                <div className='flex items-center justify-center gap-3 mt-4 text-sm'>
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className='px-3 py-1 rounded-full bg-white border disabled:opacity-40'>Prev</button>
                    <span>Page {page} of {data.pages} • {data.total} candidates</span>
                    <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className='px-3 py-1 rounded-full bg-white border disabled:opacity-40'>Next</button>
                </div>}

            {modal === "add" && <CandidateForm onClose={() => setModal(null)} onSaved={(c) => navigate(`/company/candidates/${c._id}`)} />}
            {modal === "import" && <ImportModal onClose={() => setModal(null)} onDone={() => { setModal(null); refresh() }} />}
        </div>
    )
}

export default Candidates
