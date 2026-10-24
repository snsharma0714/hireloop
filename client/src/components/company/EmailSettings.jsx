import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'
import { ServerUrl } from '../../App'
import { timeAgo } from '../jobs/jobUtils'

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney", "UTC"]
const STATUS_STYLE = { sent: "bg-emerald-100 text-emerald-700", skipped: "bg-gray-100 text-gray-600", failed: "bg-red-100 text-red-600", queued: "bg-blue-100 text-blue-700" }
const SAMPLE = { candidate: "Riya Sharma", job: "Software Engineer", stage: "Interview", time: "Monday, 12 October 2026 at 3:30 pm (Asia/Kolkata)", duration: "60", link: "https://your-site/room/abc123" }
const fill = (text, vars) => String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)

function Toggle({ checked, onChange, label, hint }) {
    return (
        <label className='flex items-start gap-3 cursor-pointer'>
            <input type='checkbox' checked={checked} onChange={e => onChange(e.target.checked)} className='mt-1 w-4 h-4 accent-emerald-600' />
            <span className='text-sm'>{label}{hint && <span className='block text-xs text-gray-500'>{hint}</span>}</span>
        </label>
    )
}

// Admins choose which automatic emails go out and edit their wording
function EmailSettings({ orgName, careersUrl }) {
    const [state, setState] = useState(null)
    const [settings, setSettings] = useState(null)
    const [timezone, setTimezone] = useState("")
    const [templates, setTemplates] = useState({})
    const [open, setOpen] = useState(null)
    const [log, setLog] = useState([])
    const [saving, setSaving] = useState(false)

    const apply = (data) => {
        setState(data)
        setSettings(data.settings)
        setTimezone(data.timezone)
        setTemplates(Object.fromEntries(data.templates.map(t => [t.key, { subject: t.subject, body: t.body }])))
    }
    const loadLog = () => axios.get(ServerUrl + "/api/org/emails/log", { withCredentials: true }).then(r => setLog(r.data)).catch(() => {})

    useEffect(() => {
        axios.get(ServerUrl + "/api/org/emails", { withCredentials: true }).then(r => apply(r.data)).catch(() => toast.error("Could not load email settings"))
        axios.get(ServerUrl + "/api/org/emails/log", { withCredentials: true }).then(r => setLog(r.data)).catch(() => {})
    }, [])

    if (!state) return <div className='text-gray-500'>Loading...</div>
    const setS = (key) => (value) => setSettings({ ...settings, [key]: value })
    const toggleStage = (key) => setS("onStages")(settings.onStages.includes(key) ? settings.onStages.filter(s => s !== key) : [...settings.onStages, key])
    const editT = (key, field, value) => setTemplates({ ...templates, [key]: { ...templates[key], [field]: value } })
    const sample = { ...SAMPLE, company: orgName, careers: careersUrl }

    const save = async () => {
        setSaving(true)
        try {
            const res = await axios.patch(ServerUrl + "/api/org/emails", { settings, timezone, templates }, { withCredentials: true })
            apply(res.data)
            toast.success("Email settings saved")
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save")
        } finally {
            setSaving(false)
        }
    }

    const test = async (key) => {
        try {
            const res = await axios.post(ServerUrl + "/api/org/emails/test", { key }, { withCredentials: true })
            if (res.data.status === "sent") toast.success(`Test email sent to ${res.data.to}`)
            else toast.error(`Not sent: ${res.data.error}`)
            loadLog()
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not send test")
        }
    }

    return (
        <div className='space-y-6'>
            {state.configured
                ? <p className='flex items-center gap-2 text-sm bg-emerald-50 text-emerald-800 rounded-2xl p-4'><FaCheckCircle /> Sending from {state.sender}</p>
                : <div className='text-sm bg-amber-50 text-amber-900 rounded-2xl p-4' data-testid='not-configured'>
                    <p className='flex items-center gap-2 font-medium'><FaExclamationTriangle /> Email isn't set up on the server yet</p>
                    <p className='mt-1'>Emails are recorded below as "skipped" instead of being sent. To send for free through Gmail, add <code>SMTP_USER</code> (your Gmail address) and <code>SMTP_PASS</code> (an app password from myaccount.google.com/apppasswords) to <code>server/.env</code>, then restart the server.</p>
                </div>}

            <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-7 space-y-4'>
                <div className='flex items-center justify-between gap-3'>
                    <p className='font-semibold'>Automatic emails to candidates</p>
                    <label className='flex items-center gap-2 text-sm'><input type='checkbox' aria-label='Automatic emails on' checked={settings.enabled} onChange={e => setS("enabled")(e.target.checked)} className='w-4 h-4 accent-emerald-600' /> On</label>
                </div>
                <div className={`space-y-3 ${settings.enabled ? "" : "opacity-40 pointer-events-none"}`}>
                    <Toggle checked={settings.onApply} onChange={setS("onApply")} label='When someone applies' hint='A thank-you that confirms we got their application' />
                    <div>
                        <p className='text-sm'>When a candidate moves to</p>
                        <div className='flex flex-wrap gap-2 mt-2'>
                            {state.stages.map(s => (
                                <button type='button' key={s.key} onClick={() => toggleStage(s.key)} aria-pressed={settings.onStages.includes(s.key)}
                                    className={`text-xs px-3 py-1.5 rounded-full border ${settings.onStages.includes(s.key) ? "bg-black text-white border-black" : "border-gray-200 text-gray-600"}`}>{s.label}</button>
                            ))}
                        </div>
                    </div>
                    <Toggle checked={settings.onReject} onChange={setS("onReject")} label='When a candidate is rejected' hint='Off by default, so you can tell people yourself if you prefer' />
                    <Toggle checked={settings.onInterview} onChange={setS("onInterview")} label='Interview invites and time changes' hint='Includes the time and the link to the live interview room' />
                </div>
                <div className='grid sm:grid-cols-2 gap-4 pt-2'>
                    <div>
                        <label className='block text-sm text-gray-600 mb-1'>Replies go to</label>
                        <input value={settings.replyTo} onChange={e => setS("replyTo")(e.target.value)} placeholder='careers@yourcompany.com' className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black' />
                    </div>
                    <div>
                        <label className='block text-sm text-gray-600 mb-1'>Time zone for interview times</label>
                        <select aria-label='Time zone' value={timezone} onChange={e => setTimezone(e.target.value)} className='w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm'>
                            {[...new Set([timezone, ...TIMEZONES])].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-7'>
                <p className='font-semibold'>Wording</p>
                <p className='text-sm text-gray-500 mb-4'>Click a placeholder to add it. It's swapped for the real value when the email goes out.</p>
                <div className='divide-y divide-gray-100'>
                    {state.templates.map(t => {
                        const value = templates[t.key]
                        const changed = value.subject !== t.defaultSubject || value.body !== t.defaultBody
                        return (
                            <div key={t.key} className='py-3'>
                                <button type='button' onClick={() => setOpen(open === t.key ? null : t.key)} className='w-full flex items-center justify-between gap-3 text-left'>
                                    <span><span className='text-sm font-medium'>{t.label}</span><span className='block text-xs text-gray-500'>{t.when}</span></span>
                                    <span className='text-xs text-gray-400'>{changed ? "edited" : "default"} {open === t.key ? "▲" : "▼"}</span>
                                </button>
                                {open === t.key && (
                                    <div className='grid lg:grid-cols-2 gap-4 mt-4'>
                                        <div className='space-y-2'>
                                            <input aria-label='Subject' value={value.subject} onChange={e => editT(t.key, "subject", e.target.value)} className='w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black' />
                                            <textarea aria-label='Body' rows={10} value={value.body} onChange={e => editT(t.key, "body", e.target.value)} className='w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black resize-y font-mono' />
                                            <div className='flex flex-wrap gap-1.5'>
                                                {Object.entries(state.vars).map(([k, label]) => (
                                                    <button type='button' key={k} title={label} onClick={() => editT(t.key, "body", `${value.body}{{${k}}}`)} className='text-[11px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 font-mono'>{`{{${k}}}`}</button>
                                                ))}
                                            </div>
                                            <div className='flex gap-2 pt-1'>
                                                {changed && <button type='button' onClick={() => setTemplates({ ...templates, [t.key]: { subject: t.defaultSubject, body: t.defaultBody } })} className='text-xs px-3 py-1.5 rounded-full bg-gray-100'>Reset to default</button>}
                                                <button type='button' onClick={() => test(t.key)} className='text-xs px-3 py-1.5 rounded-full bg-gray-100' title='Uses the saved wording'>Send me a test</button>
                                            </div>
                                        </div>
                                        <div className='bg-gray-50 rounded-xl p-4 text-sm' data-testid='preview'>
                                            <p className='text-xs text-gray-400 mb-2'>Preview</p>
                                            <p className='font-medium mb-3'>{fill(value.subject, sample)}</p>
                                            <p className='whitespace-pre-wrap text-gray-700 break-words'>{fill(value.body, sample)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>

            <div className='flex justify-end'>
                <button onClick={save} disabled={saving} className='bg-black text-white px-8 py-3 rounded-full disabled:opacity-50'>{saving ? "Saving..." : "Save email settings"}</button>
            </div>

            <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-7'>
                <div className='flex items-center justify-between mb-3'>
                    <p className='font-semibold'>Recent emails</p>
                    <button onClick={loadLog} className='text-xs text-gray-500 hover:text-black'>Refresh</button>
                </div>
                {log.length === 0 && <p className='text-sm text-gray-400'>Nothing yet.</p>}
                <div className='divide-y divide-gray-100' data-testid='email-log'>
                    {log.map(m => (
                        <div key={m._id} className='flex items-start justify-between gap-3 py-2.5'>
                            <div className='min-w-0'>
                                <p className='text-sm truncate'>{m.subject}</p>
                                <p className='text-xs text-gray-500 truncate'>to {m.to || "(no address)"}{m.candidate && ` • ${m.candidate.name}`}{m.by && ` • by ${m.by.name}`} • {timeAgo(m.createdAt)}</p>
                                {m.error && <p className='text-xs text-gray-400 truncate'>{m.error}</p>}
                            </div>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[m.status]}`}>{m.status}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}

export default EmailSettings
