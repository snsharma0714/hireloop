import React, { useMemo } from 'react'
import { dayKey } from './practiceUtils'

const WEEKS = 20

const shade = (n) => {
    if (!n) return "bg-gray-100"
    if (n === 1) return "bg-emerald-200"
    if (n <= 3) return "bg-emerald-400"
    return "bg-emerald-600"
}

// GitHub-style grid of the last 20 weeks, one column per week
function ActivityHeatmap({ counts }) {
    const weeks = useMemo(() => {
        const today = new Date()
        const start = new Date(today)
        start.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7)
        return Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => {
            const day = new Date(start)
            day.setDate(start.getDate() + w * 7 + d)
            return day > today ? null : day
        }))
    }, [])

    return (
        <div className='flex gap-[3px] overflow-x-auto'>
            {weeks.map((week, w) => (
                <div key={w} className='flex flex-col gap-[3px]'>
                    {week.map((day, d) => day
                        ? <div key={d} title={`${day.toDateString()}: ${counts[dayKey(day)] || 0} solved`} className={`w-3 h-3 rounded-[3px] ${shade(counts[dayKey(day)])}`} />
                        : <div key={d} className='w-3 h-3' />)}
                </div>
            ))}
        </div>
    )
}

export default ActivityHeatmap
