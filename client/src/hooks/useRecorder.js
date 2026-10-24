import { useCallback, useEffect, useRef, useState } from "react"

const MIME_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]

// Records one video track plus a mix of several audio tracks with the browser's MediaRecorder,
// then downloads the result as a .webm file. Nothing is uploaded anywhere.
function useRecorder(fileName = "interview") {
    const recorderRef = useRef(null)
    const audioCtxRef = useRef(null)
    const [recording, setRecording] = useState(false)
    const [startedAt, setStartedAt] = useState(null)

    const start = useCallback(({ videoTrack, audioTracks = [] }) => {
        if (recorderRef.current || typeof MediaRecorder === "undefined") return false

        const ctx = new AudioContext()
        const mix = ctx.createMediaStreamDestination()
        for (const track of audioTracks.filter(Boolean)) {
            ctx.createMediaStreamSource(new MediaStream([track])).connect(mix)
        }
        audioCtxRef.current = ctx

        const tracks = [...(videoTrack ? [videoTrack] : []), ...mix.stream.getAudioTracks()]
        const mimeType = MIME_TYPES.find(m => MediaRecorder.isTypeSupported(m))
        const recorder = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType } : undefined)
        const chunks = []

        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${fileName}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.webm`
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 10000)
            audioCtxRef.current?.close().catch(() => {})
            audioCtxRef.current = null
            recorderRef.current = null
            setRecording(false)
            setStartedAt(null)
        }

        recorder.start(1000)
        recorderRef.current = recorder
        setRecording(true)
        setStartedAt(Date.now())
        return true
    }, [fileName])

    const stop = useCallback(() => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop()
    }, [])

    // Save what was recorded if the page is closed mid-recording
    useEffect(() => () => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop()
    }, [])

    return { recording, startedAt, start, stop }
}

export default useRecorder
