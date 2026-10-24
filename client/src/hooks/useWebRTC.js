import { useCallback, useEffect, useRef, useState } from "react"

const ICE_SERVERS = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    // Optional TURN server for strict networks (set in client/.env)
    ...(import.meta.env.VITE_TURN_URL ? [{
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL
    }] : [])
]

// 1:1 call over a socket.io signaling channel.
// The person already in the room calls (sends the offer) when the other joins, so there is never offer glare.
// Tracks are attached with replaceTrack, so muting, camera-less joins and screen share need no renegotiation.
function useWebRTC(socket, localStream) {
    const pcRef = useRef(null)
    const pendingCandidates = useRef([])
    const screenTrackRef = useRef(null)
    const [remoteStream, setRemoteStream] = useState(null)
    const [connectionState, setConnectionState] = useState("new")
    const [screenTrack, setScreenTrack] = useState(null)

    const currentTrack = useCallback((kind) => {
        if (kind === "video" && screenTrackRef.current) return screenTrackRef.current
        return localStream?.getTracks().find(t => t.kind === kind) || null
    }, [localStream])

    const attachLocalTracks = useCallback(async (pc) => {
        for (const transceiver of pc.getTransceivers()) {
            const kind = transceiver.receiver.track?.kind
            if (!kind) continue
            transceiver.direction = "sendrecv"
            await transceiver.sender.replaceTrack(currentTrack(kind))
        }
    }, [currentTrack])

    // keepPending: ICE candidates can arrive just before the offer they belong to
    const closePc = useCallback((keepPending = false) => {
        if (pcRef.current) {
            pcRef.current.ontrack = null
            pcRef.current.onicecandidate = null
            pcRef.current.onconnectionstatechange = null
            pcRef.current.close()
            pcRef.current = null
        }
        if (!keepPending) pendingCandidates.current = []
        setRemoteStream(null)
        setConnectionState("new")
    }, [])

    const createPc = useCallback(() => {
        closePc(true)
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
        const remote = new MediaStream()
        pc.ontrack = (event) => {
            remote.addTrack(event.track)
            setRemoteStream(new MediaStream(remote.getTracks()))
        }
        pc.onicecandidate = (event) => {
            if (event.candidate) socket.emit("signal", { candidate: event.candidate })
        }
        pc.onconnectionstatechange = () => setConnectionState(pc.connectionState)
        pcRef.current = pc
        return pc
    }, [socket, closePc])

    const flushCandidates = async (pc) => {
        for (const candidate of pendingCandidates.current) {
            await pc.addIceCandidate(candidate).catch(err => console.log("ICE error", err))
        }
        pendingCandidates.current = []
    }

    const call = useCallback(async () => {
        const pc = createPc()
        pc.addTransceiver("audio", { direction: "sendrecv" })
        pc.addTransceiver("video", { direction: "sendrecv" })
        await attachLocalTracks(pc)
        await pc.setLocalDescription(await pc.createOffer())
        socket.emit("signal", { description: pc.localDescription })
    }, [socket, createPc, attachLocalTracks])

    useEffect(() => {
        if (!socket) return
        const onSignal = async ({ description, candidate }) => {
            try {
                if (description?.type === "offer") {
                    const pc = createPc()
                    await pc.setRemoteDescription(description)
                    await attachLocalTracks(pc)
                    await pc.setLocalDescription(await pc.createAnswer())
                    socket.emit("signal", { description: pc.localDescription })
                    await flushCandidates(pc)
                } else if (description?.type === "answer" && pcRef.current) {
                    await pcRef.current.setRemoteDescription(description)
                    await flushCandidates(pcRef.current)
                } else if (candidate) {
                    const pc = pcRef.current
                    if (pc?.remoteDescription) await pc.addIceCandidate(candidate)
                    else pendingCandidates.current.push(candidate)
                }
            } catch (error) {
                console.log("signal error", error)
            }
        }
        socket.on("signal", onSignal)
        return () => socket.off("signal", onSignal)
    }, [socket, createPc, attachLocalTracks])

    const videoSender = () => pcRef.current?.getTransceivers().find(t => t.receiver.track?.kind === "video")?.sender

    const stopScreenShare = useCallback(async () => {
        const track = screenTrackRef.current
        if (!track) return
        screenTrackRef.current = null
        track.onended = null
        track.stop()
        setScreenTrack(null)
        await videoSender()?.replaceTrack(localStream?.getVideoTracks()[0] || null)
    }, [localStream])

    const startScreenShare = useCallback(async () => {
        try {
            const display = await navigator.mediaDevices.getDisplayMedia({ video: true })
            const track = display.getVideoTracks()[0]
            screenTrackRef.current = track
            track.onended = () => stopScreenShare()
            setScreenTrack(track)
            await videoSender()?.replaceTrack(track)
            return track
        } catch (error) {
            console.log("screen share cancelled", error)
            return null
        }
    }, [stopScreenShare])

    // Clean up on unmount
    useEffect(() => () => {
        screenTrackRef.current?.stop()
        closePc()
    }, [closePc])

    return {
        call,
        hangup: () => closePc(),
        remoteStream,
        connectionState,
        isScreenSharing: !!screenTrack,
        screenTrack,
        startScreenShare,
        stopScreenShare
    }
}

export default useWebRTC
