import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { EVENT_KINDS, addDays, dateInput, overlaps, startOfDay, timeInput, timeLabel } from './calendarUtils'

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-black text-sm'
const DURATIONS = [15, 30, 45, 60, 90, 120]
const KINDS = Object.entries(EVENT_KINDS)

// Create or edit a calendar event. `event` = existing event to edit; `defaults` = { start, candidate, job } for a new one
function EventForm({ event, defaults = {}, lockCandidate, onClose, onSaved }) {
    const { userData } = useSelector((state) => state.user)
    const [form, setForm] = useState(() => {
        const start = new Date(event?.start || defaults.start || Date.now() + 3600 * 1000)
        return {
            title: event?.title || "",
            kind: event?.kind || defaults.kind || "meeting",
            date: dateInput(start),
            time: event || defaults.start ? timeInput(start) : "10:00",
            durationMin: event?.durationMin || 30,
            allDay: event?.allDay || false,
            location: event?.location || "",
            notes: event?.notes || "",
            candidate: event?.candidate || defaults.candidate || null,
            job: event?.job?._id || defaults.job || "",
            attendees: event ? event.attendees.map(a => a._id) : [userData?._id]
        }
    })
    const [team, setTeam] = useState([])
    const [jobs, setJobs] = useState([])
    const [query, setQuery] = useState("")
    const [matches, setMatches] = useState([])
    const [sameDayItems, setSameDayItems] = useState([])
    const [saving, setSaving] = useState(false)
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value })

    useEffect(() => {
        axios.get(ServerUrl + "/api/org/team", { withCredentials: true }).then(r => setTeam(r.data.members)).catch(() => {})
        axios.get(ServerUrl + "/api/jobs/mine", { withCredentials: true }).then(r => setJobs(r.data)).catch(() => {})
    }, [])

    // everything else on that day, to warn about double-booking
    useEffect(() => {
        if (!form.date) return
        const from = startOfDay(new Date(`${form.date}T00:00`))
        axios.get(ServerUrl + "/api/calendar", { params: { from: from.toISOString(), to: addDays(from, 1).toISOString() }, withCredentials: true })
            .then(r => setSameDayItems(r.data.items)).catch(() => {})
    }, [form.date])

    useEffect(() => {
        if (!query.trim()) return
        const t = setTimeout(() => {
            axios.get(ServerUrl + "/api/candidates", { params: { q: query.trim() }, withCredentials: true })
                .then(r => setMatches(r.data.candidates.slice(0, 6))).catch(() => {})
        }, 250)
        return () => clearTimeout(t)
    }, [query])

    const startDate = form.allDay ? new Date(`${form.date}T00:00`) : new Date(`${form.date}T${form.time || "00:00"}`)
    const draft = { start: startDate, durationMin: Number(form.durationMin), allDay: form.allDay }
    const clashes = form.date ? sameDayItems.filter(item =>
        item._id !== event?._id && overlaps(item, draft) &&
        item.attendees.some(a => form.attendees.includes(a._id))) : []

    const toggleAttendee = (id) => setForm({ ...form, attendees: form.attendees.includes(id) ? form.attendees.filter(a => a !== id) : [...form.attendees, id] })

    const save = async (e) => {
        e.preventDefault()
        if (isNaN(startDate.getTime())) return toast.error("Pick a valid date and time")
        setSaving(true)
        const body = {
            title: form.title, kind: form.kind, start: startDate.toISOString(), durationMin: Number(form.durationMin), allDay: form.allDay,
            location: form.location, notes: form.notes, candidate: form.candidate?._id || null, job: form.job || null, attendees: form.attendees
        }
        try {
            const res = event
                ? await axios.patch(ServerUrl + `/api/calendar/events/${event._id}`, body, { withCredentials: true })
                : await axios.post(ServerUrl + "/api/calendar/events", body, { withCredentials: true })
            toast.success(event ? "Event updated" : "Added to the calendar")
            onSaved(res.data)
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save event")
            setSaving(false)
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4' onClick={onClose}>
            <form onSubmit={save} onClick={e => e.stopPropagation()} className='relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-7 max-h-[92vh] overflow-y-auto space-y-4'>
                <button type='button' onClick={onClose} aria-label='Close' className='absolute top-6 right-6 text-gray-500 hover:text-black'><FaTimes /></button>
                <h2 className='text-xl font-semibold'>{event ? "Edit event" : "New event"}</h2>

                <input required autoFocus placeholder='Title (e.g. Phone screen with Riya)' value={form.title} onChange={set("title")} className={inputClass} />
                <div className='flex flex-wrap gap-2'>
                    {KINDS.map(([key, info]) => (
                        <button type='button' key={key} onClick={() => setForm({ ...form, kind: key })}
                            className={`text-xs px-3 py-1.5 rounded-full ${form.kind === key ? info.chip + " font-medium ring-1 ring-black/10" : "bg-gray-50 text-gray-600"}`}>{info.label}</button>
                    ))}
                </div>

                <div className='grid grid-cols-3 gap-2'>
                    <input type='date' required aria-label='Date' value={form.date} onChange={set("date")} className={`${inputClass} col-span-3 sm:col-span-1`} />
                    {!form.allDay && <>
                        <input type='time' required aria-label='Time' value={form.time} onChange={set("time")} className={inputClass} />
                        <select aria-label='Duration' value={form.durationMin} onChange={set("durationMin")} className={inputClass}>
                            {DURATIONS.map(m => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
                        </select>
                    </>}
                </div>
                <label className='flex items-center gap-2 text-sm text-gray-600'>
                    <input type='checkbox' checked={form.allDay} onChange={set("allDay")} className='accent-emerald-600' /> All day
                </label>

                {clashes.length > 0 &&
                    <div className='text-sm bg-amber-50 text-amber-800 rounded-xl p-3' data-testid='clash'>
                        <p className='flex items-center gap-2 font-medium'><FaExclamationTriangle /> Someone is already busy then</p>
                        {clashes.map(c => <p key={c._id} className='text-xs mt-1'>{timeLabel(c)} • {c.title} ({c.attendees.map(a => a.name).join(", ")})</p>)}
                    </div>}

                <input placeholder='Location or meeting link' value={form.location} onChange={set("location")} className={inputClass} />

                <div>
                    <p className='text-sm text-gray-600 mb-1'>Candidate <span className='text-gray-400'>(optional)</span></p>
                    {form.candidate
                        ? <div className='flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 text-sm'>
                            <span>{form.candidate.name}</span>
                            {!lockCandidate && <button type='button' onClick={() => setForm({ ...form, candidate: null })} className='text-gray-400 hover:text-black text-xs'>change</button>}
                        </div>
                        : <div className='relative'>
                            <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search the talent pool...' className={inputClass} />
                            {query.trim() && matches.length > 0 &&
                                <div className='absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden'>
                                    {matches.map(m => (
                                        <button type='button' key={m._id} onClick={() => { setForm({ ...form, candidate: { _id: m._id, name: m.name } }); setQuery(""); setMatches([]) }}
                                            className='block w-full text-left px-3 py-2 text-sm hover:bg-gray-50'>{m.name} <span className='text-gray-400'>{m.email}</span></button>
                                    ))}
                                </div>}
                        </div>}
                </div>

                <select aria-label='Job' value={form.job} onChange={set("job")} className={inputClass}>
                    <option value=''>No job</option>
                    {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
                </select>

                <div>
                    <p className='text-sm text-gray-600 mb-2'>Who's going</p>
                    <div className='flex flex-wrap gap-2'>
                        {team.map(m => (
                            <button type='button' key={m._id} onClick={() => toggleAttendee(m._id)}
                                className={`text-xs px-3 py-1.5 rounded-full border ${form.attendees.includes(m._id) ? "bg-black text-white border-black" : "border-gray-200 text-gray-600"}`}>
                                {m.name}{m._id === userData?._id && " (you)"}
                            </button>
                        ))}
                    </div>
                </div>

                <textarea rows={3} placeholder='Notes' value={form.notes} onChange={set("notes")} className={`${inputClass} resize-none`} />
                <button disabled={saving} className='w-full bg-black text-white py-3 rounded-full hover:opacity-90 disabled:opacity-50'>{saving ? "Saving..." : event ? "Save changes" : "Add to calendar"}</button>
            </form>
        </div>
    )
}

export default EventForm
