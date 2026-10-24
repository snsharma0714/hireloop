import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { BsRobot } from 'react-icons/bs'
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaPhoneSlash, FaSignOutAlt, FaExpand, FaCode, FaRegCopy, FaCircle, FaStop, FaListUl } from 'react-icons/fa'
import { MdWarningAmber } from 'react-icons/md'
import { ServerUrl } from '../App'
import useWebRTC from '../hooks/useWebRTC'
import CodePanel from '../components/room/CodePanel'
import ChatPanel from '../components/room/ChatPanel'
import ScorecardPanel from '../components/room/ScorecardPanel'
import { emptyScorecard } from '../components/room/roomConstants'
import useRecorder from '../hooks/useRecorder'
import AuthModel from '../components/AuthModel'
import SplitPane from '../components/SplitPane'
import RichText from '../components/practice/RichText'
import { DIFFICULTY_STYLES } from '../components/practice/practiceUtils'
import QuestionPicker from '../components/room/QuestionPicker'

// The session's problem, shown next to the shared editor in peer sessions
function ProblemPanel({ problem }) {
    return (
        <div className='h-full overflow-y-auto bg-white rounded-2xl border border-gray-200 p-5'>
            <h2 className='text-xl font-semibold mb-2'>{problem.title}</h2>
            <div className='flex flex-wrap gap-2 mb-4'>
                <span className={`text-xs px-3 py-1 rounded-full ${DIFFICULTY_STYLES[problem.difficulty]}`}>{problem.difficulty}</span>
                {problem.topics.map(t => <span key={t} className='text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600'>{t}</span>)}
            </div>
            <RichText text={problem.description} className='text-gray-700 text-sm' />
            {problem.examples.map((e, i) => (
                <div key={i} className='mt-4'>
                    <p className='font-semibold text-sm mb-1'>Example {i + 1}</p>
                    <div className='border-l-2 border-gray-200 pl-3 text-xs font-mono space-y-1'>
                        <p><span className='text-gray-500'>Input:</span> {e.input}</p>
                        <p><span className='text-gray-500'>Output:</span> {e.output}</p>
                        {e.explanation && <p className='font-sans text-gray-600'>{e.explanation}</p>}
                    </div>
                </div>
            ))}
            <p className='font-semibold text-sm mt-5 mb-1'>Constraints</p>
            <ul className='list-disc pl-5 text-xs text-gray-700 space-y-1 font-mono'>
                {problem.constraints.map(c => <li key={c}>{c}</li>)}
            </ul>
        </div>
    )
}

// A question the interviewer wrote themselves (no automatic tests)
function CustomQuestionPanel({ question }) {
    return (
        <div className='h-full overflow-y-auto bg-white rounded-2xl border border-gray-200 p-5'>
            <p className='text-xs font-medium text-violet-600 mb-1'>Question {question.index + 1}</p>
            <h2 className='text-xl font-semibold mb-3'>{question.title}</h2>
            {question.description
                ? <RichText text={question.description} className='text-gray-700 text-sm' />
                : <p className='text-sm text-gray-400'>Your interviewer will explain this one.</p>}
        </div>
    )
}

function VideoTile({ stream, muted, label, mirrored, placeholder, off = false, className = "", onClick }) {
    const videoRef = useRef(null)
    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream || null
    }, [stream])
    const hasVideo = !off && stream?.getVideoTracks().some(t => t.readyState === "live")

    return (
        <div onClick={onClick} className={`relative bg-gray-900 rounded-2xl overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}>
            <video ref={videoRef} autoPlay playsInline muted={muted} className={`w-full h-full object-contain ${mirrored ? "scale-x-[-1]" : ""} ${hasVideo ? "" : "invisible"}`} />
            {!hasVideo && <div className='absolute inset-0 flex items-center justify-center text-gray-400 text-sm'>{placeholder}</div>}
            {label && <span className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md'>{label}</span>}
        </div>
    )
}

function ElapsedTimer({ since }) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])
    const secs = Math.max(0, Math.floor((now - since) / 1000))
    const mm = String(Math.floor(secs / 60)).padStart(2, "0")
    const ss = String(secs % 60).padStart(2, "0")
    return <span className='font-mono text-sm'>{mm}:{ss}</span>
}

const CenterCard = ({ children }) => (
    <div className='min-h-screen bg-[#f3f3f3] flex items-center justify-center px-4'>
        <div className='w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 p-10 text-center'>{children}</div>
    </div>
)

function InterviewRoom() {
    const { token } = useParams()
    const navigate = useNavigate()
    const { userData } = useSelector((state) => state.user)

    // loading | error | lobby | room | left | ended | replaced
    const [phase, setPhase] = useState("loading")
    const [error, setError] = useState("")
    const [role, setRole] = useState(null)
    const [interview, setInterview] = useState(null)
    const [name, setName] = useState("")
    const [localStream, setLocalStream] = useState(null)
    const [mediaError, setMediaError] = useState("")
    const [micOn, setMicOn] = useState(true)
    const [camOn, setCamOn] = useState(true)
    const [peer, setPeer] = useState(null)
    const [peerMedia, setPeerMedia] = useState({ mic: true, cam: true, screen: false })
    const [messages, setMessages] = useState([])
    const [alerts, setAlerts] = useState([])
    const [tab, setTab] = useState("chat")
    const [unread, setUnread] = useState(0)
    const [scorecard, setScorecard] = useState(emptyScorecard)
    const [joinData, setJoinData] = useState(null)
    const [joinedAt, setJoinedAt] = useState(null)
    const [focusRemote, setFocusRemote] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)
    const [problem, setProblem] = useState(null)
    // hiring interviews: the question the interviewer has on screen, and its full details for built-in problems
    const [question, setQuestion] = useState(null)
    const [questionDetail, setQuestionDetail] = useState(null)
    const [showPicker, setShowPicker] = useState(false)
    const [showAuth, setShowAuth] = useState(false)
    const [remoteRecording, setRemoteRecording] = useState(null)
    const recorder = useRecorder("hireloop-session")

    const socket = useMemo(() => io(ServerUrl || undefined, { withCredentials: true, autoConnect: false }), [])
    const rtc = useWebRTC(socket, localStream)

    // Latest values for socket handlers that are registered once
    const callRef = useRef(rtc.call)
    const hangupRef = useRef(rtc.hangup)
    const nameRef = useRef(name)
    const tabRef = useRef(tab)
    const streamRef = useRef(null)
    const peerScreenRef = useRef(false)
    const stopRecordingRef = useRef(recorder.stop)
    const phaseRef = useRef(phase)
    useLayoutEffect(() => {
        stopRecordingRef.current = recorder.stop
        phaseRef.current = phase
        callRef.current = rtc.call
        hangupRef.current = rtc.hangup
        nameRef.current = name
        tabRef.current = tab
        streamRef.current = localStream
    })

    // Load interview details from the link
    useEffect(() => {
        const load = async () => {
            // Re-check access after logging in, but never pull someone out of a call in progress
            if (!["loading", "login", "error"].includes(phaseRef.current)) return
            try {
                const result = await axios.get(ServerUrl + `/api/schedule/room/${token}`, { withCredentials: true })
                // a slow reply must not pull someone back to the lobby after they've joined
                if (!["loading", "login", "error"].includes(phaseRef.current)) return
                setRole(result.data.role)
                setInterview(result.data.interview)
                setName(result.data.interview.candidateName || "")
                if (result.data.problem) {
                    const p = await axios.get(ServerUrl + `/api/practice/problems/${result.data.problem.slug}`, { withCredentials: true })
                    setProblem(p.data)
                }
                if (result.data.role === "interviewer") {
                    setScorecard({ ...emptyScorecard, ...result.data.interview.scorecard })
                    setAlerts(result.data.interview.proctorEvents || [])
                }
                if (["loading", "login", "error"].includes(phaseRef.current)) setPhase("lobby")
            } catch (error) {
                setError(error.response?.data?.message || "Could not open this interview")
                setPhase(error.response?.data?.needsLogin ? "login" : "error")
            }
        }
        load()
    }, [token, userData])

    // Camera + mic for the lobby preview and the call
    useEffect(() => {
        if (phase !== "lobby" || streamRef.current) return
        const getMedia = async () => {
            try {
                setLocalStream(await navigator.mediaDevices.getUserMedia({ video: true, audio: true }))
            } catch {
                try {
                    setLocalStream(await navigator.mediaDevices.getUserMedia({ audio: true }))
                    setCamOn(false)
                    setMediaError("Camera not available. You can still join with audio.")
                } catch {
                    setMicOn(false)
                    setCamOn(false)
                    setMediaError("Camera and microphone are blocked. Allow access in your browser's address bar and reload.")
                }
            }
        }
        getMedia()
    }, [phase])

    // Stop camera and socket when leaving the page
    useEffect(() => () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        socket.disconnect()
    }, [socket])

    // Socket events
    useEffect(() => {
        const onConnect = () => {
            socket.emit("join-room", { token, name: nameRef.current }, (ack) => {
                if (ack?.error) {
                    setError(ack.error)
                    setPhase("error")
                    socket.disconnect()
                    return
                }
                setRole(ack.role)
                setQuestion(ack.question || null)
                setJoinData({ code: ack.code, language: ack.language })
                setPeer(ack.peer)
                setJoinedAt(prev => prev || Date.now())
                setPhase("room")
            })
        }
        const onPeerJoined = (p) => {
            setPeer(p)
            callRef.current()
        }
        const onPeerLeft = () => {
            setPeer(null)
            setPeerMedia({ mic: true, cam: true, screen: false })
            peerScreenRef.current = false
            setFocusRemote(false)
            setRemoteRecording(null)
            stopRecordingRef.current()
            hangupRef.current()
        }
        const onChat = (m) => {
            setMessages(prev => [...prev, m])
            if (tabRef.current !== "chat") setUnread(u => u + 1)
        }
        const onProctorAlert = (event) => setAlerts(prev => [...prev, event])
        const onMediaState = (state) => {
            setPeerMedia(state)
            // Show the other person's screen large when they start or stop sharing
            if (state.screen !== peerScreenRef.current) {
                peerScreenRef.current = state.screen
                setFocusRemote(state.screen)
            }
        }
        const onEnded = () => {
            hangupRef.current()
            socket.disconnect()
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
            setPhase("ended")
        }
        const onRecording = (r) => {
            setRemoteRecording(r.on ? r : null)
            if (r.on) toast(`${r.by} started recording this call`, { icon: "🔴" })
        }
        const onQuestion = (q) => {
            setQuestion(q)
            if (q) toast(`Question ${q.index + 1}: ${q.title}`, { icon: "📝" })
        }
        const onReplaced = () => {
            hangupRef.current()
            socket.disconnect()
            setPhase("replaced")
        }

        socket.on("connect", onConnect)
        socket.on("peer-joined", onPeerJoined)
        socket.on("peer-left", onPeerLeft)
        socket.on("chat", onChat)
        socket.on("proctor-alert", onProctorAlert)
        socket.on("media-state", onMediaState)
        socket.on("interview-ended", onEnded)
        socket.on("replaced", onReplaced)
        socket.on("recording", onRecording)
        socket.on("question", onQuestion)
        return () => {
            socket.off("question", onQuestion)
            socket.off("recording", onRecording)
            socket.off("connect", onConnect)
            socket.off("peer-joined", onPeerJoined)
            socket.off("peer-left", onPeerLeft)
            socket.off("chat", onChat)
            socket.off("proctor-alert", onProctorAlert)
            socket.off("media-state", onMediaState)
            socket.off("interview-ended", onEnded)
            socket.off("replaced", onReplaced)
        }
    }, [socket, token])

    // Full statement, examples and starter code for a built-in problem
    useEffect(() => {
        if (question?.kind !== "builtin") return
        axios.get(ServerUrl + `/api/practice/problems/${question.slug}`, { withCredentials: true })
            .then(r => setQuestionDetail(r.data)).catch(() => toast.error("Could not load the question"))
    }, [question?.kind, question?.slug])

    // Tell the other side when my mic / camera / screen share changes
    useEffect(() => {
        if (phase === "room") socket.emit("media-state", { mic: micOn, cam: camOn, screen: rtc.isScreenSharing })
    }, [socket, phase, micOn, camOn, rtc.isScreenSharing, peer])

    const sendProctor = useCallback((type, message) => {
        socket.emit("proctor", { type, message })
    }, [socket])

    const isPeer = interview?.type === "peer"
    const proctored = role === "candidate" && !isPeer

    // Candidate integrity signals (hiring interviews only)
    useEffect(() => {
        if (phase !== "room" || !proctored) return
        const onVisibility = () => {
            if (document.hidden) sendProctor("tab_switch", "Switched tab or minimized the window")
        }
        const onFullscreen = () => {
            const fs = !!document.fullscreenElement
            setIsFullscreen(fs)
            if (!fs) sendProctor("fullscreen_exit", "Exited full screen")
        }
        document.addEventListener("visibilitychange", onVisibility)
        document.addEventListener("fullscreenchange", onFullscreen)
        return () => {
            document.removeEventListener("visibilitychange", onVisibility)
            document.removeEventListener("fullscreenchange", onFullscreen)
        }
    }, [phase, proctored, sendProctor])

    const handlePaste = useCallback((length) => {
        if (proctored && length > 30) sendProctor("paste", `Pasted ${length} characters into the editor`)
    }, [proctored, sendProctor])

    const enterFullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {})

    const join = () => {
        if (proctored) enterFullscreen()
        socket.connect()
    }

    const toggleMic = () => {
        localStream?.getAudioTracks().forEach(t => { t.enabled = !micOn })
        setMicOn(!micOn)
    }

    const toggleCam = () => {
        localStream?.getVideoTracks().forEach(t => { t.enabled = !camOn })
        setCamOn(!camOn)
    }

    const toggleScreen = () => {
        if (rtc.isScreenSharing) rtc.stopScreenShare()
        else rtc.startScreenShare()
    }

    const leave = () => {
        rtc.stopScreenShare()
        rtc.hangup()
        socket.disconnect()
        setPeer(null)
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        recorder.stop()
        if (role === "interviewer") navigate(isPeer ? "/dashboard" : "/company/interviews")
        else setPhase("left")
    }

    const toggleRecording = () => {
        if (recorder.recording) {
            recorder.stop()
            socket.emit("recording", { on: false })
            toast.success("Recording saved to your downloads")
            return
        }
        const started = recorder.start({
            videoTrack: rtc.remoteStream?.getVideoTracks()[0],
            audioTracks: [...(rtc.remoteStream?.getAudioTracks() || []), localStream?.getAudioTracks()[0]]
        })
        if (started) {
            socket.emit("recording", { on: true })
            toast("Recording started. The other person has been told.", { icon: "🔴" })
        } else toast.error("Recording isn't supported in this browser")
    }

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            toast.success("Invite link copied")
        } catch {
            toast.error("Couldn't copy the link")
        }
    }

    const endInterview = async () => {
        if (isPeer) {
            if (!window.confirm("End this practice session for both of you?")) return
            recorder.stop()
            socket.emit("end-interview", () => {
                rtc.hangup()
                socket.disconnect()
                navigate("/dashboard")
            })
            return
        }
        if (!window.confirm("End the interview for both of you? The candidate's link will stop working.")) return
        recorder.stop()
        try {
            await axios.patch(ServerUrl + `/api/schedule/${interview._id}`, { scorecard }, { withCredentials: true })
        } catch (error) {
            console.log(error)
        }
        socket.emit("end-interview", () => {
            rtc.hangup()
            socket.disconnect()
            navigate(`/company/interviews/${interview._id}`)
        })
    }

    const localPreview = useMemo(() => {
        if (rtc.isScreenSharing && rtc.screenTrack) return new MediaStream([rtc.screenTrack])
        return localStream
    }, [rtc.isScreenSharing, rtc.screenTrack, localStream])

    if (phase === "loading") return <CenterCard><p className='text-gray-500'>Opening interview room...</p></CenterCard>

    if (phase === "login") return (
        <CenterCard>
            <h2 className='text-2xl font-semibold mb-3'>Log in to join</h2>
            <p className='text-gray-500 mb-6'>Practice sessions are for logged-in users, so your partner knows who they're coding with.</p>
            <button onClick={() => setShowAuth(true)} className='bg-black text-white px-8 py-3 rounded-full'>Log in</button>
            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </CenterCard>
    )

    if (phase === "error") return (
        <CenterCard>
            <h2 className='text-2xl font-semibold mb-3'>Can't join this interview</h2>
            <p className='text-gray-500'>{error}</p>
        </CenterCard>
    )

    if (phase === "ended") return (
        <CenterCard>
            <h2 className='text-2xl font-semibold mb-3'>{isPeer ? "Session ended" : "Interview ended"}</h2>
            {isPeer
                ? <>
                    <p className='text-gray-500 mb-6'>The host ended this practice session. Nice work!</p>
                    <button onClick={() => navigate("/dashboard")} className='bg-black text-white px-8 py-3 rounded-full'>Back to dashboard</button>
                </>
                : <p className='text-gray-500'>Thank you for your time, {name}. The team will get back to you soon.</p>}
        </CenterCard>
    )

    if (phase === "replaced") return (
        <CenterCard>
            <h2 className='text-2xl font-semibold mb-3'>Opened in another tab</h2>
            <p className='text-gray-500'>You joined this interview from another tab or device, so this one was disconnected.</p>
        </CenterCard>
    )

    if (phase === "left") return (
        <CenterCard>
            <h2 className='text-2xl font-semibold mb-3'>You left the interview</h2>
            <p className='text-gray-500 mb-6'>You can rejoin while the interview is still open.</p>
            <button onClick={join} className='bg-black text-white px-8 py-3 rounded-full'>Rejoin</button>
        </CenterCard>
    )

    const when = new Date(interview.scheduledAt)

    if (phase === "lobby") return (
        <div className='min-h-screen bg-[#f3f3f3] flex items-center justify-center px-4 py-10'>
            <div className='w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center'>
                <div>
                    <VideoTile stream={localStream} muted mirrored off={!camOn} className='aspect-video' placeholder={camOn ? "Starting camera..." : "Camera off"} />
                    <div className='flex justify-center gap-3 mt-4'>
                        <button onClick={toggleMic} disabled={!localStream} className={`p-4 rounded-full ${micOn ? "bg-white shadow" : "bg-red-500 text-white"}`}>{micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}</button>
                        <button onClick={toggleCam} disabled={!localStream?.getVideoTracks().length} className={`p-4 rounded-full ${camOn ? "bg-white shadow" : "bg-red-500 text-white"}`}>{camOn ? <FaVideo /> : <FaVideoSlash />}</button>
                    </div>
                    {mediaError && <p className='text-sm text-red-500 text-center mt-3'>{mediaError}</p>}
                </div>

                <div className='bg-white rounded-3xl shadow-xl border border-gray-200 p-8'>
                    <div className='flex items-center gap-3 mb-6'>
                        <div className='bg-black text-white p-2 rounded-lg'><BsRobot size={18} /></div>
                        <h2 className='font-semibold text-lg'>HireLoop.AI</h2>
                    </div>
                    {isPeer && <p className='text-xs font-medium text-emerald-600 mb-1'>PRACTICE SESSION</p>}
                    <h1 className='text-2xl font-semibold'>{interview.title}</h1>
                    {isPeer
                        ? <p className='text-gray-500 mt-1'>{problem && <span className={`text-xs px-2.5 py-0.5 rounded-full mr-2 ${DIFFICULTY_STYLES[problem.difficulty]}`}>{problem.difficulty}</span>}Pair up and solve it together</p>
                        : <p className='text-gray-500 mt-1'>{interview.companyName && `${interview.companyName} • `}{when.toLocaleString()} • {interview.durationMin} min</p>}
                    {interview.description && <p className='text-sm text-gray-600 mt-4 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap'>{interview.description}</p>}

                    {isPeer ? (role === "interviewer"
                        ? <div className='mt-6'>
                            <p className='text-sm text-gray-600 mb-3'>You're the <b>host</b>. Share the link with a friend, or wait for someone to join from the dashboard.</p>
                            <button onClick={copyInvite} className='flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200'><FaRegCopy /> Copy invite link</button>
                        </div>
                        : <p className='text-sm text-gray-600 mt-6'>You're joining <b>{interview.interviewerName}</b>'s practice session as <b>{userData?.name}</b>.</p>)
                    : role === "candidate" ? <>
                        <label className='block text-sm text-gray-600 mt-6 mb-1'>Your name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className='w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black' />
                        <div className='text-xs text-gray-500 mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-3'>
                            This interview opens in full screen. Switching tabs, leaving full screen and pasting large blocks of code are shared with your interviewer.
                        </div>
                    </> :
                        <p className='text-sm text-gray-600 mt-6'>You're joining as the <b>interviewer</b> with {interview.candidateName}.</p>}

                    <button onClick={join} disabled={proctored && !name.trim()} className='w-full mt-6 bg-black text-white py-3 rounded-full hover:opacity-90 disabled:opacity-50'>
                        {isPeer ? (role === "interviewer" ? "Start Session" : "Join Session") : "Join Interview"}
                    </button>
                </div>
            </div>
        </div>
    )

    // phase === "room"
    const peerLabel = peer ? `${peer.name}${peerMedia.mic ? "" : " (muted)"}` : ""
    const tabs = role === "interviewer" && !isPeer ? ["chat", "scorecard", "alerts"] : ["chat"]
    const waitingFor = isPeer ? "partner" : role === "interviewer" ? "candidate" : "interviewer"
    const hiringProblem = !isPeer && question?.kind === "builtin" && questionDetail?.slug === question.slug ? questionDetail : null
    const editorProblem = isPeer ? problem : hiringProblem && { ...hiringProblem, judgeUrl: `/api/schedule/room/${token}/judge` }
    const editor = joinData && <CodePanel socket={socket} token={token} initialCode={joinData.code} initialLanguage={joinData.language} onPaste={handlePaste} problem={editorProblem} />
    const canPickQuestion = role === "interviewer" && !isPeer
    // Hiring rooms always show the question column, so the editor never remounts when a question appears
    const questionPanel = isPeer
        ? problem && <ProblemPanel problem={problem} />
        : !question
            ? <div className='h-full bg-white rounded-2xl border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-center' data-testid='no-question'>
                <FaListUl className='text-gray-300 mb-3' size={22} />
                {canPickQuestion
                    ? <>
                        <p className='font-medium text-gray-700'>No question on screen</p>
                        <p className='text-sm text-gray-500 mt-1 max-w-xs'>Pick a problem with tests, or write your own. The candidate sees it here.</p>
                        <button onClick={() => setShowPicker(true)} className='mt-4 text-sm px-4 py-2 rounded-full bg-black text-white'>Choose a question</button>
                    </>
                    : <>
                        <p className='font-medium text-gray-700'>Your interviewer will share a question here</p>
                        <p className='text-sm text-gray-500 mt-1 max-w-xs'>Until then, say hello and get comfortable with the editor.</p>
                    </>}
            </div>
            : question.kind === "builtin"
                ? (hiringProblem ? <ProblemPanel problem={hiringProblem} /> : <div className='h-full bg-white rounded-2xl border border-gray-200 p-5 text-sm text-gray-400'>Loading question...</div>)
                : <CustomQuestionPanel question={question} />

    return (
        <div className='h-screen flex flex-col bg-[#f3f3f3]'>
            {remoteRecording &&
                <div className='bg-red-50 text-red-700 text-sm px-4 py-2 flex items-center justify-center gap-2'>
                    <FaCircle size={8} className='animate-pulse' /> {remoteRecording.by} is recording this call
                </div>}
            {proctored && !isFullscreen &&
                <div className='bg-yellow-100 text-yellow-800 text-sm px-4 py-2 flex items-center justify-center gap-3'>
                    <MdWarningAmber size={18} /> Please stay in full screen during the interview.
                    <button onClick={enterFullscreen} className='underline font-medium'>Enter full screen</button>
                </div>}

            <header className='flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200'>
                <div className='flex items-center gap-3 min-w-0'>
                    <div className='bg-black text-white p-2 rounded-lg'><BsRobot size={16} /></div>
                    <div className='min-w-0'>
                        <p className='font-semibold truncate'>{interview.title}{interview.companyName && ` • ${interview.companyName}`}</p>
                        <p className='text-xs text-gray-500 truncate'>
                            {isPeer ? `Practice session${peer ? ` with ${peer.name}` : ""}`
                                : role === "interviewer" ? `Candidate: ${interview.candidateName}` : `Interviewer: ${interview.interviewerName || "Interviewer"}`}
                        </p>
                    </div>
                </div>
                <div className='flex items-center gap-4'>
                    {isPeer && role === "interviewer" && !peer &&
                        <button onClick={copyInvite} className='hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200'><FaRegCopy /> Copy invite link</button>}
                    {recorder.recording &&
                        <span className='flex items-center gap-1.5 text-xs text-red-600 font-medium'><FaCircle size={8} className='animate-pulse' /> REC</span>}
                    <span className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full ${peer ? (rtc.connectionState === "connected" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700") : "bg-gray-100 text-gray-500"}`}>
                        <span className={`w-2 h-2 rounded-full ${peer ? (rtc.connectionState === "connected" ? "bg-emerald-500" : "bg-yellow-500") : "bg-gray-400"}`} />
                        {peer ? (rtc.connectionState === "connected" ? "Connected" : "Connecting...") : `Waiting for ${waitingFor}`}
                    </span>
                    {joinedAt && <ElapsedTimer since={joinedAt} />}
                </div>
            </header>

            <div className='flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0 overflow-y-auto lg:overflow-hidden'>
                <main className='flex-1 min-h-[500px] lg:min-h-0 flex flex-col gap-2'>
                    {(canPickQuestion || (peer && (peerMedia.screen || focusRemote))) &&
                        <div className='flex items-center justify-between gap-2'>
                            {canPickQuestion
                                ? <button onClick={() => setShowPicker(true)} className='flex items-center gap-2 text-xs bg-black text-white px-3 py-1.5 rounded-full min-w-0' data-testid='question-button'>
                                    <FaListUl className='shrink-0' /> <span className='truncate'>{question ? `Q${question.index + 1}: ${question.title} • Change` : "Choose a question"}</span>
                                </button>
                                : <span />}
                            {peer && (peerMedia.screen || focusRemote) &&
                                <button onClick={() => setFocusRemote(!focusRemote)} className='flex items-center gap-2 text-xs bg-white shadow px-3 py-1.5 rounded-full shrink-0'>
                                    {focusRemote ? <><FaCode /> Show code editor</> : <><FaExpand /> Show {peer.name}'s {peerMedia.screen ? "screen" : "video"}</>}
                                </button>}
                        </div>}
                    {focusRemote && peer &&
                        <VideoTile stream={rtc.remoteStream} label={peerLabel} off={!peerMedia.cam && !peerMedia.screen} placeholder={`${peer.name}'s camera is off`} className='flex-1' />}
                    <div className={`flex-1 min-h-0 ${focusRemote && peer ? "hidden" : ""}`}>
                        {questionPanel
                            ? <SplitPane className='h-full' defaultFirst='38%' minFirst='20%' minSecond='35%' mobileFirstClass='h-[50vh]' mobileSecondClass='h-[70vh]'
                                first={questionPanel}
                                second={editor} />
                            : editor}
                    </div>
                </main>

                <aside className='w-full lg:w-[360px] flex flex-col gap-3 min-h-0'>
                    <VideoTile
                        stream={peer ? rtc.remoteStream : null}
                        off={!peerMedia.cam && !peerMedia.screen}
                        label={peer ? peerLabel : ""}
                        placeholder={peer ? (peerMedia.cam || peerMedia.screen ? "Connecting video..." : `${peer.name}'s camera is off`) : "Waiting to join..."}
                        className='aspect-video shrink-0'
                        onClick={peer ? () => setFocusRemote(!focusRemote) : undefined}
                    />
                    <div className='flex gap-3 items-end shrink-0'>
                        <VideoTile stream={localPreview} muted mirrored={!rtc.isScreenSharing} off={!camOn && !rtc.isScreenSharing} label={rtc.isScreenSharing ? "Your screen" : "You"} placeholder='Camera off' className='w-36 aspect-video' />
                        <div className='flex-1 flex flex-wrap gap-2 justify-end'>
                            <button onClick={toggleMic} title='Microphone' className={`p-3 rounded-full ${micOn ? "bg-white shadow" : "bg-red-500 text-white"}`}>{micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}</button>
                            <button onClick={toggleCam} title='Camera' disabled={!localStream?.getVideoTracks().length} className={`p-3 rounded-full ${camOn ? "bg-white shadow" : "bg-red-500 text-white"}`}>{camOn ? <FaVideo /> : <FaVideoSlash />}</button>
                            <button onClick={toggleScreen} title='Share screen' className={`p-3 rounded-full ${rtc.isScreenSharing ? "bg-emerald-600 text-white" : "bg-white shadow"}`}><FaDesktop /></button>
                            {role === "interviewer" &&
                                <button onClick={toggleRecording} disabled={!peer && !recorder.recording} title={recorder.recording ? "Stop recording and download" : "Record the call"}
                                    className={`p-3 rounded-full disabled:opacity-40 ${recorder.recording ? "bg-red-600 text-white" : "bg-white shadow text-red-600"}`}>
                                    {recorder.recording ? <FaStop /> : <FaCircle />}
                                </button>}
                            {role === "interviewer"
                                ? <button onClick={endInterview} title={isPeer ? "End session" : "End interview"} className='p-3 rounded-full bg-red-600 text-white'><FaPhoneSlash /></button>
                                : <button onClick={leave} title='Leave' className='p-3 rounded-full bg-red-600 text-white'><FaSignOutAlt /></button>}
                        </div>
                    </div>
                    {role === "interviewer" && <button onClick={leave} className='text-xs text-gray-500 hover:text-black self-end'>Leave without ending</button>}

                    <div className='flex-1 min-h-[320px] bg-white rounded-2xl border border-gray-200 p-4 flex flex-col'>
                        {tabs.length > 1 &&
                            <div className='flex gap-1 mb-3 bg-gray-100 rounded-full p-1'>
                                {tabs.map(t => (
                                    <button key={t} onClick={() => { setTab(t); if (t === "chat") setUnread(0) }}
                                        className={`flex-1 text-xs py-1.5 rounded-full capitalize ${tab === t ? "bg-white shadow font-medium" : "text-gray-500"}`}>
                                        {t}
                                        {t === "chat" && unread > 0 && ` (${unread})`}
                                        {t === "alerts" && alerts.length > 0 && ` (${alerts.length})`}
                                    </button>
                                ))}
                            </div>}
                        <div className='flex-1 min-h-0'>
                            {tab === "chat" && <ChatPanel messages={messages} myRole={role} onSend={(text) => socket.emit("chat", { text })} />}
                            {tab === "scorecard" && <ScorecardPanel interviewId={interview._id} scorecard={scorecard} onChange={setScorecard} />}
                            {tab === "alerts" &&
                                <div className='h-full overflow-y-auto space-y-2'>
                                    {alerts.length === 0 && <p className='text-sm text-gray-400 text-center mt-6'>No integrity alerts</p>}
                                    {alerts.map((a, i) => (
                                        <div key={i} className='flex items-start gap-2 text-sm bg-yellow-50 border border-yellow-100 rounded-xl p-3'>
                                            <MdWarningAmber className='text-yellow-600 mt-0.5 shrink-0' />
                                            <div>
                                                <p className='text-gray-800'>{a.message}</p>
                                                <p className='text-xs text-gray-400'>{new Date(a.at).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                        </div>
                    </div>
                </aside>
            </div>
            {showPicker && <QuestionPicker socket={socket} current={question} onClose={() => setShowPicker(false)} />}
        </div>
    )
}

export default InterviewRoom
