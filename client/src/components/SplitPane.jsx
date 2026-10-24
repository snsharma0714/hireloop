import React, { useSyncExternalStore } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'

const WIDE = "(min-width: 1024px)"
const subscribe = (cb) => {
    const mq = window.matchMedia(WIDE)
    mq.addEventListener("change", cb)
    return () => mq.removeEventListener("change", cb)
}
const useIsWide = () => useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches)

// Two panels with a draggable divider on desktop; stacked on small screens
function SplitPane({ orientation = "horizontal", first, second, defaultFirst = "50%", minFirst = "20%", minSecond = "20%", className = "", mobileFirstClass = "", mobileSecondClass = "" }) {
    const wide = useIsWide()

    if (!wide) {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                <div className={mobileFirstClass}>{first}</div>
                <div className={mobileSecondClass}>{second}</div>
            </div>
        )
    }

    const horizontal = orientation === "horizontal"
    return (
        <Group orientation={orientation} className={className}>
            <Panel defaultSize={defaultFirst} minSize={minFirst} className='min-h-0 min-w-0'>{first}</Panel>
            <Separator className={`group flex items-center justify-center ${horizontal ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize"}`}>
                <div className={`rounded-full bg-gray-300 group-hover:bg-emerald-500 group-active:bg-emerald-600 transition-colors ${horizontal ? "w-1 h-10" : "h-1 w-10"}`} />
            </Separator>
            <Panel minSize={minSecond} className='min-h-0 min-w-0'>{second}</Panel>
        </Group>
    )
}

export default SplitPane
