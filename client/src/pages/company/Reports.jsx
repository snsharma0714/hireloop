import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaDownload } from 'react-icons/fa'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { ServerUrl } from '../../App'
import { STAGES } from '../../components/jobs/jobUtils'
import { SOURCE_LABELS } from '../../components/company/candidateUtils'

const RANGES = [
    { days: 30, label: "Last 30 days" },
    { days: 90, label: "Last 90 days" },
    { days: 180, label: "Last 6 months" },
    { days: 365, label: "Last 12 months" }
]
const VERDICTS = [
    { key: "strong_hire", label: "Strong hire", style: "bg-emerald-500" },
    { key: "hire", label: "Hire", style: "bg-emerald-300" },
    { key: "no_hire", label: "No hire", style: "bg-red-300" },
    { key: "strong_no_hire", label: "Strong no hire", style: "bg-red-500" }
]
const SCORE_LABELS = { problemSolving: "Problem solving", coding: "Coding", communication: "Communication", fundamentals: "Fundamentals" }

const pct = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : "–")
const days = (n) => (n === null || n === undefined ? "–" : `${n} ${n === 1 ? "day" : "days"}`)

const Card = ({ title, children, action }) => (
    <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
        <div className='flex items-center justify-between gap-3 mb-4'>
            <h2 className='font-semibold text-gray-800'>{title}</h2>
            {action}
        </div>
        {children}
    </section>
)

function Reports() {
    const navigate = useNavigate()
    const [rangeDays, setRangeDays] = useState(90)
    const [job, setJob] = useState("")
    const [data, setData] = useState(null)
    const [exporting, setExporting] = useState(false)

    const params = (d) => ({ from: new Date(Date.now() - d * 864e5).toISOString(), to: new Date().toISOString(), ...(job ? { job } : {}) })

    useEffect(() => {
        axios.get(ServerUrl + "/api/reports", { params: { from: new Date(Date.now() - rangeDays * 864e5).toISOString(), to: new Date().toISOString(), ...(job ? { job } : {}) }, withCredentials: true })
            .then(r => setData(r.data)).catch(() => toast.error("Could not load reports"))
    }, [rangeDays, job])

    const exportCsv = async () => {
        setExporting(true)
        try {
            const res = await axios.get(ServerUrl + "/api/reports/export", { params: params(rangeDays), withCredentials: true, responseType: "blob" })
            const url = URL.createObjectURL(res.data)
            const a = document.createElement("a")
            a.href = url
            a.download = `applications-last-${rangeDays}-days.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast.error("Could not export")
        } finally {
            setExporting(false)
        }
    }

    if (!data) return <div className='p-10 text-gray-500'>Loading...</div>
    const { totals, funnel, sources, byJob, weeks, interviews, team, screening } = data
    const applied = funnel[0].count
    const verdictTotal = Object.values(interviews.verdicts).reduce((a, b) => a + b, 0)

    return (
        <div className='p-6 lg:p-10 max-w-7xl space-y-6'>
            <div className='flex items-start justify-between gap-4 flex-wrap'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-800'>Reports</h1>
                    <p className='text-gray-500 mt-1'>How your hiring is going: where candidates come from, where they drop off, how fast you hire.</p>
                </div>
                <div className='flex gap-2 flex-wrap'>
                    <select aria-label='Period' value={rangeDays} onChange={e => setRangeDays(Number(e.target.value))} className='bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm'>
                        {RANGES.map(r => <option key={r.days} value={r.days}>{r.label}</option>)}
                    </select>
                    <select aria-label='Job' value={job} onChange={e => setJob(e.target.value)} className='bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm max-w-56'>
                        <option value=''>All jobs</option>
                        {data.jobs.map(j => <option key={j._id} value={j._id}>{j.title}{j.status === "closed" ? " (closed)" : ""}</option>)}
                    </select>
                    <button onClick={exportCsv} disabled={exporting} className='flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-sm disabled:opacity-50'>
                        <FaDownload size={11} /> {exporting ? "Exporting..." : "Export CSV"}
                    </button>
                </div>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4' data-testid='totals'>
                {[
                    ["Applications", totals.applications],
                    ["In progress", totals.active],
                    ["Hired", totals.hired],
                    ["Offer → hired", pct(totals.hired, funnel[3].count)],
                    ["Avg. time to hire", days(data.timeToHire.avg)],
                    ["New in talent pool", totals.newCandidates]
                ].map(([label, value]) => (
                    <div key={label} className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
                        <p className='text-2xl font-bold'>{value}</p>
                        <p className='text-xs text-gray-500 mt-1'>{label}</p>
                    </div>
                ))}
            </div>

            <div className='grid lg:grid-cols-2 gap-6'>
                <Card title='Pipeline funnel'>
                    {applied === 0 && <p className='text-sm text-gray-400'>No applications in this period.</p>}
                    {applied > 0 && <div className='space-y-3' data-testid='funnel'>
                        {funnel.map((f, i) => {
                            const st = STAGES.find(s => s.key === f.stage)
                            return (
                                <div key={f.stage}>
                                    <div className='flex justify-between text-sm mb-1'>
                                        <span>{st.label}</span>
                                        <span className='text-gray-500'>{f.count} <span className='text-xs'>({pct(f.count, applied)}{i > 0 && ` • ${pct(f.count, funnel[i - 1].count)} of previous`})</span></span>
                                    </div>
                                    <div className='h-3 rounded-full bg-gray-100 overflow-hidden'>
                                        <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${(f.count / applied) * 100}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                        <p className='text-xs text-gray-500 pt-1'>{totals.rejected} rejected • counts people who reached each stage, even if rejected later</p>
                    </div>}
                </Card>

                <Card title='Applications and hires per week'>
                    <div className='h-64'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={weeks} margin={{ left: -20 }}>
                                <CartesianGrid strokeDasharray='3 3' vertical={false} />
                                <XAxis dataKey='week' tick={{ fontSize: 11 }} tickFormatter={w => new Date(w).toLocaleDateString([], { day: "numeric", month: "short" })} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip labelFormatter={w => `Week of ${new Date(w).toLocaleDateString()}`} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey='applications' name='Applications' fill='#60a5fa' radius={[4, 4, 0, 0]} />
                                <Bar dataKey='hires' name='Hires' fill='#10b981' radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className='grid lg:grid-cols-3 gap-6'>
                <Card title='Speed'>
                    <div className='space-y-4 text-sm'>
                        {[["Time to hire", data.timeToHire], ["Time to first interview", data.timeToInterview]].map(([label, s]) => (
                            <div key={label}>
                                <p className='text-gray-500'>{label} <span className='text-xs'>({s.count} {s.count === 1 ? "person" : "people"})</span></p>
                                <p className='mt-1'><b className='text-lg'>{days(s.avg)}</b> average • median {days(s.median)} • fastest {days(s.fastest)}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title='Screening questions'>
                    <div className='grid grid-cols-3 gap-2 text-center'>
                        {[["Matched", screening.passed, "text-emerald-600"], ["Flagged", screening.failed, "text-red-500"], ["Flagged but hired", screening.failedButHired, "text-gray-700"]].map(([l, v, c]) => (
                            <div key={l} className='bg-gray-50 rounded-xl p-3'><p className={`text-xl font-bold ${c}`}>{v}</p><p className='text-xs text-gray-500'>{l}</p></div>
                        ))}
                    </div>
                    <p className='text-xs text-gray-400 mt-3'>Only jobs where you set a "looking for" answer count.</p>
                </Card>

                <Card title='Interviews'>
                    <p className='text-sm text-gray-600'>{interviews.scheduled} scheduled • {interviews.completed} completed{interviews.cancelled ? ` • ${interviews.cancelled} cancelled` : ""}</p>
                    {verdictTotal > 0 && <>
                        <div className='flex h-3 rounded-full overflow-hidden mt-3'>
                            {VERDICTS.map(v => interviews.verdicts[v.key] > 0 && <div key={v.key} className={v.style} style={{ width: `${(interviews.verdicts[v.key] / verdictTotal) * 100}%` }} title={`${v.label}: ${interviews.verdicts[v.key]}`} />)}
                        </div>
                        <div className='flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500'>
                            {VERDICTS.map(v => <span key={v.key} className='flex items-center gap-1'><span className={`w-2 h-2 rounded-full ${v.style}`} />{v.label} {interviews.verdicts[v.key]}</span>)}
                        </div>
                        <div className='grid grid-cols-2 gap-2 mt-4 text-xs'>
                            {Object.entries(interviews.averages).map(([k, v]) => <p key={k} className='text-gray-600'>{SCORE_LABELS[k]}: <b>{v ?? "–"}</b>/5</p>)}
                        </div>
                    </>}
                    {verdictTotal === 0 && <p className='text-xs text-gray-400 mt-3'>Scorecard results show here once interviews are scored.</p>}
                </Card>
            </div>

            <Card title='Where candidates come from'>
                {sources.length === 0 ? <p className='text-sm text-gray-400'>No applications in this period.</p> :
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm' data-testid='sources'>
                            <thead><tr className='text-left text-gray-500 border-b border-gray-100'><th className='py-2 font-medium'>Source</th><th className='font-medium'>Applicants</th><th className='font-medium'>Reached interview</th><th className='font-medium'>Hired</th><th className='font-medium'>Hire rate</th></tr></thead>
                            <tbody>
                                {sources.map(s => (
                                    <tr key={s.source} className='border-b border-gray-50'>
                                        <td className='py-2.5'>{SOURCE_LABELS[s.source] || s.source}</td><td>{s.applicants}</td><td>{s.interviewed}</td><td>{s.hired}</td><td>{pct(s.hired, s.applicants)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>}
            </Card>

            <Card title='By job'>
                {byJob.length === 0 ? <p className='text-sm text-gray-400'>No applications in this period.</p> :
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm min-w-[640px]' data-testid='by-job'>
                            <thead><tr className='text-left text-gray-500 border-b border-gray-100'>
                                <th className='py-2 font-medium'>Job</th><th className='font-medium'>Total</th>
                                {STAGES.map(s => <th key={s.key} className='font-medium'>{s.label}</th>)}
                            </tr></thead>
                            <tbody>
                                {byJob.map(j => (
                                    <tr key={j.jobId} className='border-b border-gray-50'>
                                        <td className='py-2.5'>
                                            <button onClick={() => navigate(`/company/jobs/${j.jobId}`)} className='hover:underline text-left'>{j.title}</button>
                                            {j.status === "closed" && <span className='ml-2 text-xs text-gray-400'>closed</span>}
                                        </td>
                                        <td className='font-medium'>{j.total}</td>
                                        {STAGES.map(s => <td key={s.key} className={j[s.key] ? "" : "text-gray-300"}>{j[s.key]}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className='text-xs text-gray-400 mt-2'>Where each applicant is right now.</p>
                    </div>}
            </Card>

            <Card title='Team activity'>
                {team.length === 0 ? <p className='text-sm text-gray-400'>No logged activity in this period.</p> :
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm' data-testid='team'>
                            <thead><tr className='text-left text-gray-500 border-b border-gray-100'>
                                {["Teammate", "Stage moves", "Interviews done", "Calls", "Emails", "Meetings", "Notes"].map(h => <th key={h} className='py-2 font-medium'>{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {team.map(t => (
                                    <tr key={t.name} className='border-b border-gray-50'>
                                        <td className='py-2.5'>{t.name}</td><td>{t.stageMoves}</td><td>{t.interviews}</td><td>{t.calls}</td><td>{t.emails}</td><td>{t.meetings}</td><td>{t.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>}
            </Card>
        </div>
    )
}

export default Reports
