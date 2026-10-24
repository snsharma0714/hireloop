import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaChevronLeft, FaChevronRight, FaPlus, FaTimes, FaVideo, FaRegCopy, FaGoogle, FaDownload } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { can } from '../../components/company/access'
import EventForm from '../../components/company/EventForm'
import {
    DAY_NAMES, addDays, dateInput, downloadIcs, googleCalendarUrl, kindOf, monthGrid, sameDay, startOfDay, timeInput, timeLabel, whenLabel
} from '../../components/company/calendarUtils'

const MAX_CHIPS = 3

function EventDetails({ item, canEdit, onClose, onEdit, onChanged }) {
    const navigate = useNavigate()
    const [rescheduling, setRescheduling] = useState(false)
    const [when, setWhen] = useState(`${dateInput(new Date(item.start))}T${timeInput(new Date(item.start))}`)
    const kind = kindOf(item)
    const isInterview = item.source === "interview"
    const roomLink = item.token && `${window.location.origin}/room/${item.token}`

    const remove = async () => {
        if (!window.confirm(`Delete "${item.title}"?`)) return
        try {
            await axios.delete(ServerUrl + `/api/calendar/events/${item._id}`, { withCredentials: true })
            toast.success("Event deleted")
            onChanged()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not delete")
        }
    }

    const reschedule = async () => {
        try {
            await axios.patch(ServerUrl + `/api/schedule/${item._id}`, { scheduledAt: new Date(when).toISOString() }, { withCredentials: true })
            toast.success("Interview moved")
            onChanged()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not reschedule")
        }
    }

    return (
        <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4' onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className='relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 space-y-4' role='dialog' aria-label={item.title}>
                <button onClick={onClose} aria-label='Close' className='absolute top-6 right-6 text-gray-500 hover:text-black'><FaTimes /></button>
                <div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full ${kind.chip}`}>{kind.label}{isInterview && " • live room"}</span>
                    <h2 className='text-xl font-semibold mt-2 pr-6'>{item.title}</h2>
                    <p className='text-sm text-gray-500 mt-1'>{whenLabel(item)}{isInterview && item.status !== "scheduled" && ` • ${item.status}`}</p>
                </div>

                <div className='text-sm space-y-1.5'>
                    {item.candidate &&
                        <p>Candidate: <button onClick={() => navigate(`/company/candidates/${item.candidate._id}`)} className='underline'>{item.candidate.name}</button></p>}
                    {item.job?.title &&
                        <p>Job: {item.job._id ? <button onClick={() => navigate(`/company/jobs/${item.job._id}`)} className='underline'>{item.job.title}</button> : item.job.title}</p>}
                    {item.location && !isInterview && <p>Where: {/^https?:\/\//.test(item.location) ? <a href={item.location} target='_blank' rel='noreferrer' className='underline break-all'>{item.location}</a> : item.location}</p>}
                    {item.attendees?.length > 0 && <p>With: {item.attendees.map(a => a.name).join(", ")}</p>}
                    {item.notes && <p className='whitespace-pre-wrap text-gray-600 bg-gray-50 rounded-xl p-3 mt-2'>{item.notes}</p>}
                </div>

                <div className='flex flex-wrap gap-2'>
                    {isInterview && roomLink && ["scheduled", "live"].includes(item.status) && <>
                        <button onClick={() => navigate(`/room/${item.token}`)} className='flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-purple-600 text-white'><FaVideo /> Join room</button>
                        <button onClick={() => navigator.clipboard.writeText(roomLink).then(() => toast.success("Link copied"))} className='flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-gray-100'><FaRegCopy /> Candidate link</button>
                    </>}
                    {isInterview && item.status === "completed" &&
                        <button onClick={() => navigate(`/company/interviews/${item._id}`)} className='text-xs px-3 py-2 rounded-full bg-black text-white'>Scorecard</button>}
                    <a href={googleCalendarUrl(item)} target='_blank' rel='noreferrer' className='flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-gray-100'><FaGoogle /> Google Calendar</a>
                    <button onClick={() => downloadIcs([item], "event.ics")} className='flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-gray-100'><FaDownload /> .ics</button>
                </div>

                {canEdit && !isInterview &&
                    <div className='flex gap-2 pt-2 border-t border-gray-100'>
                        <button onClick={onEdit} className='text-sm px-4 py-2 rounded-full bg-black text-white'>Edit</button>
                        <button onClick={remove} className='text-sm px-4 py-2 rounded-full text-red-600 hover:bg-red-50'>Delete</button>
                    </div>}
                {canEdit && isInterview && item.status === "scheduled" &&
                    <div className='pt-2 border-t border-gray-100'>
                        {rescheduling
                            ? <div className='flex gap-2'>
                                <input type='datetime-local' aria-label='New time' value={when} onChange={e => setWhen(e.target.value)} className='flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm' />
                                <button onClick={reschedule} className='text-sm px-4 rounded-xl bg-black text-white'>Move</button>
                            </div>
                            : <button onClick={() => setRescheduling(true)} className='text-sm px-4 py-2 rounded-full bg-gray-100'>Reschedule</button>}
                    </div>}
            </div>
        </div>
    )
}

function Calendar() {
    const { userData } = useSelector((state) => state.user)
    const canEdit = can(userData, "recruiter")
    const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
    const [view, setView] = useState("month")
    const [mine, setMine] = useState(false)
    const [items, setItems] = useState(null)
    const [open, setOpen] = useState(null)       // item shown in details
    const [editing, setEditing] = useState(null) // null | { event } | { defaults }
    const [version, setVersion] = useState(0)

    const days = monthGrid(month)

    useEffect(() => {
        const grid = monthGrid(month)
        const params = { from: grid[0].toISOString(), to: addDays(grid[41], 1).toISOString(), mine: mine ? 1 : 0 }
        axios.get(ServerUrl + "/api/calendar", { params, withCredentials: true })
            .then(r => setItems(r.data.items)).catch(() => setItems([]))
    }, [month, mine, version])

    const reload = () => setVersion(v => v + 1)
    const today = startOfDay(new Date())
    const shiftMonth = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
    const onDay = (day) => (items || []).filter(i => sameDay(i.start, day))
    const newOn = (day) => canEdit && setEditing({ defaults: { start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0) } })
    const inMonth = (items || []).filter(i => new Date(i.start).getMonth() === month.getMonth())
    // agenda: the rest of this month (or all of it when looking at another month)
    const agendaDays = [...new Set(inMonth.filter(i => month.getMonth() !== today.getMonth() || new Date(i.start) >= today)
        .map(i => startOfDay(i.start).getTime()))].map(t => new Date(t))

    const chip = (item, compact) => {
        const kind = kindOf(item)
        return (
            <button key={`${item.source}-${item._id}`} onClick={(e) => { e.stopPropagation(); setOpen(item) }} title={item.title}
                className={`w-full text-left truncate rounded-md px-1.5 py-0.5 text-[11px] ${kind.chip} ${item.status === "completed" ? "opacity-60" : ""}`}>
                {compact ? "" : <span className='font-medium'>{timeLabel(item)} </span>}{item.title}
            </button>
        )
    }

    return (
        <div className='p-6 lg:p-10 max-w-7xl'>
            <div className='flex items-start justify-between gap-4 flex-wrap mb-6'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-800'>Calendar</h1>
                    <p className='text-gray-500 mt-1'>Live-room interviews and your team's calls, meetings and reminders.</p>
                </div>
                <div className='flex gap-2'>
                    <button onClick={() => downloadIcs(inMonth, `hireloop-${dateInput(month).slice(0, 7)}.ics`)} disabled={!inMonth.length}
                        className='flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-full text-sm hover:bg-gray-50 disabled:opacity-40'><FaDownload size={11} /> Export month</button>
                    {canEdit && <button onClick={() => setEditing({ defaults: {} })} className='flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-sm'><FaPlus size={11} /> New event</button>}
                </div>
            </div>

            <div className='flex items-center justify-between gap-3 flex-wrap mb-4'>
                <div className='flex items-center gap-2'>
                    <button onClick={() => shiftMonth(-1)} aria-label='Previous month' className='w-9 h-9 grid place-items-center rounded-full bg-white border border-gray-200 hover:bg-gray-50'><FaChevronLeft size={11} /></button>
                    <button onClick={() => shiftMonth(1)} aria-label='Next month' className='w-9 h-9 grid place-items-center rounded-full bg-white border border-gray-200 hover:bg-gray-50'><FaChevronRight size={11} /></button>
                    <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }} className='px-4 h-9 rounded-full bg-white border border-gray-200 text-sm hover:bg-gray-50'>Today</button>
                    <h2 className='text-lg font-semibold ml-2' data-testid='month-label'>{month.toLocaleDateString([], { month: "long", year: "numeric" })}</h2>
                </div>
                <div className='flex items-center gap-3'>
                    <label className='flex items-center gap-2 text-sm text-gray-600'>
                        <input type='checkbox' checked={mine} onChange={e => setMine(e.target.checked)} className='accent-emerald-600' /> Only mine
                    </label>
                    <div className='flex bg-white border border-gray-200 rounded-full p-0.5 text-sm'>
                        {["month", "agenda"].map(v => (
                            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-full capitalize ${view === v ? "bg-black text-white" : "text-gray-600"}`}>{v}</button>
                        ))}
                    </div>
                </div>
            </div>

            {view === "month" ? (
                <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
                    <div className='grid grid-cols-7 border-b border-gray-100'>
                        {DAY_NAMES.map(d => <div key={d} className='px-2 py-2 text-xs font-medium text-gray-500 text-center'>{d}</div>)}
                    </div>
                    <div className='grid grid-cols-7'>
                        {days.map(day => {
                            const list = onDay(day)
                            const outside = day.getMonth() !== month.getMonth()
                            const isToday = sameDay(day, today)
                            return (
                                <div key={day.toISOString()} onClick={() => newOn(day)} data-date={dateInput(day)}
                                    className={`min-h-20 sm:min-h-28 border-b border-r border-gray-100 p-1 sm:p-1.5 ${outside ? "bg-gray-50/60" : ""} ${canEdit ? "cursor-pointer hover:bg-emerald-50/40" : ""}`}>
                                    <div className={`text-xs mb-1 w-6 h-6 grid place-items-center rounded-full ${isToday ? "bg-black text-white" : outside ? "text-gray-300" : "text-gray-600"}`}>{day.getDate()}</div>
                                    <div className='space-y-0.5'>
                                        {list.slice(0, MAX_CHIPS).map(item => chip(item))}
                                        {list.length > MAX_CHIPS &&
                                            <button onClick={(e) => { e.stopPropagation(); setView("agenda") }} className='text-[11px] text-gray-500 px-1.5 hover:underline'>+{list.length - MAX_CHIPS} more</button>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className='space-y-4'>
                    {items && agendaDays.length === 0 && <div className='bg-white rounded-2xl p-10 text-center text-gray-500 shadow-sm'>Nothing {month.getMonth() === today.getMonth() ? "else this month" : "this month"}.</div>}
                    {agendaDays.map(day => (
                        <div key={day.toISOString()} className='bg-white rounded-2xl border border-gray-100 shadow-sm'>
                            <p className={`px-5 pt-4 pb-2 text-sm font-semibold ${sameDay(day, today) ? "text-emerald-700" : "text-gray-700"}`}>
                                {sameDay(day, today) ? "Today • " : ""}{day.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
                            </p>
                            <div className='divide-y divide-gray-100'>
                                {onDay(day).map(item => {
                                    const kind = kindOf(item)
                                    return (
                                        <button key={`${item.source}-${item._id}`} onClick={() => setOpen(item)} className='w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-gray-50'>
                                            <span className='w-20 shrink-0 text-sm text-gray-500'>{timeLabel(item)}</span>
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${kind.dot}`} />
                                            <span className='min-w-0 flex-1'>
                                                <span className='block text-sm font-medium text-gray-800 truncate'>{item.title}</span>
                                                <span className='block text-xs text-gray-500 truncate'>{[kind.label, item.job?.title, item.attendees?.map(a => a.name).join(", ")].filter(Boolean).join(" • ")}</span>
                                            </span>
                                            {item.status && item.status !== "scheduled" && <span className='text-xs text-gray-400 capitalize'>{item.status}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {open && <EventDetails key={open._id} item={open} canEdit={canEdit} onClose={() => setOpen(null)}
                onEdit={() => { setEditing({ event: open }); setOpen(null) }} onChanged={() => { setOpen(null); reload() }} />}
            {editing && <EventForm event={editing.event} defaults={editing.defaults} onClose={() => setEditing(null)}
                onSaved={() => { setEditing(null); reload() }} />}
        </div>
    )
}

export default Calendar
