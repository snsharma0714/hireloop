import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { FaCode, FaListUl, FaRobot, FaUserFriends, FaBriefcase, FaChartLine } from 'react-icons/fa'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AuthModel from '../components/AuthModel'
import { AudienceSwitch, CtaBand, FeatureCard, SectionTitle, Spotlight, Steps } from '../components/landing/LandingParts'
import { AiMock, CodeMock, RecordMock, RoomMock, SheetsMock } from '../components/landing/Mockups'

const FEATURES = [
    { icon: <FaCode />, title: "LeetCode-style practice", text: "21 hand-picked problems with hidden tests. Write JavaScript, Python, Java or C++ and get Accepted or Wrong Answer in seconds." },
    { icon: <FaListUl />, title: "Famous DSA sheets", text: "Striver's SDE Sheet, NeetCode 150 and Blind 75 with progress tracking. Solve a problem once and it's ticked on every sheet." },
    { icon: <FaRobot />, title: "AI mock interviews", text: "Pick a role, upload your resume and answer out loud. Get scored on confidence, communication and correctness." },
    { icon: <FaUserFriends />, title: "Mock with a friend", text: "Open a live room with video, screen share and a shared code editor, and take turns interviewing each other." },
    { icon: <FaBriefcase />, title: "Jobs that see your effort", text: "Apply to companies hiring on HireLoop and choose to share your practice record along with your resume." },
    { icon: <FaChartLine />, title: "Track your progress", text: "Streaks, solved counts by difficulty, past mock reports and every submission, all in your dashboard." }
]

function Home() {
    const { userData } = useSelector((state) => state.user)
    const navigate = useNavigate()
    const [showAuth, setShowAuth] = useState(false)

    // send each kind of visitor to the right place
    const start = (studentPath) => {
        if (!userData) return setShowAuth(true)
        if (!userData.role) return navigate("/onboarding")
        navigate(userData.role === "company" ? "/company" : studentPath)
    }
    const primaryLabel = userData?.role === "company" ? "Open your workspace" : userData ? "Go to dashboard" : "Start practising free"

    return (
        <div className='min-h-screen bg-[#f3f3f3] flex flex-col'>
            <Navbar />

            <main className='flex-1 px-4 sm:px-6 overflow-x-clip'>
                {/* hero */}
                <section className='max-w-6xl mx-auto pt-10 pb-20'>
                    <AudienceSwitch active='students' />
                    <div className='grid lg:grid-cols-2 gap-12 items-center mt-12'>
                        <div>
                            <Motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='inline-flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-full px-4 py-1.5 text-gray-600'>
                                <span className='w-2 h-2 rounded-full bg-emerald-500' /> Free for students • 100 AI credits on sign-up
                            </Motion.p>
                            <Motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                                className='text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] mt-6'>
                                Crack your next <span className='bg-emerald-100 text-emerald-700 px-3 rounded-2xl'>tech interview</span>
                            </Motion.h1>
                            <Motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className='text-gray-500 text-lg mt-6 max-w-xl'>
                                Practise DSA with a real code runner, follow the sheets everyone uses, rehearse with an AI interviewer or a friend, then apply to jobs that can see the work you've put in.
                            </Motion.p>
                            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className='flex flex-wrap gap-3 mt-9'>
                                <button onClick={() => (userData ? start("/dashboard") : navigate("/practice"))} className='bg-black text-white px-8 py-3.5 rounded-full shadow-md hover:opacity-90'>{primaryLabel}</button>
                                <button onClick={() => start("/interview")} className='bg-white border border-gray-300 px-8 py-3.5 rounded-full hover:bg-gray-50'>Try an AI mock interview</button>
                            </Motion.div>
                            <div className='flex flex-wrap gap-x-6 gap-y-2 mt-9 text-sm text-gray-500'>
                                {["4 languages", "3 DSA sheets", "Live peer rooms", "Real job openings"].map(t => <span key={t} className='flex items-center gap-2'><span className='text-emerald-600'>✓</span>{t}</span>)}
                            </div>
                        </div>

                        <Motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className='relative'>
                            <div className='absolute -inset-6 bg-linear-to-br from-emerald-200/60 via-transparent to-violet-200/50 blur-2xl rounded-full' />
                            <div className='relative'><CodeMock /></div>
                            <div className='absolute -left-3 sm:-left-8 -bottom-6 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 text-sm'>
                                <p className='font-semibold'>🔥 12-day streak</p><p className='text-xs text-gray-500'>3 problems solved today</p>
                            </div>
                            <div className='absolute -right-2 sm:-right-6 -top-6 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 text-sm hidden sm:block'>
                                <p className='font-semibold'>Blind 75</p>
                                <div className='w-32 h-2 bg-gray-100 rounded-full mt-1.5'><div className='h-full w-2/3 bg-violet-500 rounded-full' /></div>
                            </div>
                        </Motion.div>
                    </div>
                </section>

                {/* everything */}
                <section className='max-w-6xl mx-auto py-16'>
                    <SectionTitle eyebrow='One place to prepare' title='Everything between "I should start prep" and the offer letter' />
                    <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-5'>
                        {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} delay={(i % 3) * 0.08} />)}
                    </div>
                </section>

                {/* how it works */}
                <section className='max-w-6xl mx-auto py-16'>
                    <SectionTitle eyebrow='How it works' title='Practise. Rehearse. Get hired.' />
                    <Steps steps={[
                        { title: "Build the basics", text: "Work through a sheet topic by topic. Run your code against tests and see exactly which case fails." },
                        { title: "Rehearse out loud", text: "Do an AI mock for your target role, or pair up with a friend in a live room and take turns asking." },
                        { title: "Apply with proof", text: "Apply to open roles. Companies can see your solved count and streak if you choose to share them." }
                    ]} />
                </section>

                {/* spotlights */}
                <section className='max-w-6xl mx-auto py-16 space-y-24'>
                    <Spotlight eyebrow='DSA sheets' title='Follow the sheets you already trust, and never lose track'
                        text="Striver's SDE Sheet, NeetCode 150 and Blind 75 are built in, grouped by topic. Your progress syncs across sheets, so a problem solved for one counts for all."
                        points={["183 + 150 + 75 problems, grouped by topic", "Solve built-in problems right here, or jump to LeetCode", "Progress saved to your account, not your browser"]}
                        mock={<SheetsMock />} />
                    <Spotlight flip eyebrow='AI mock interviews' title='An interviewer that has read your resume'
                        text="Choose a role and HR or Technical mode. The AI asks questions out loud based on your experience and projects, listens to your answers and writes a report you can download as a PDF."
                        points={["Voice in, voice out, with a timer like the real thing", "Questions get harder as you go", "Scores and feedback for every answer"]}
                        mock={<AiMock />} />
                    <Spotlight eyebrow='Peer practice' title='Interview each other in a real interview room'
                        text="Start a session on any problem and share the link, or join someone else's open session. You get video, screen sharing, a shared editor and the same code runner."
                        points={["Run code against the problem's tests together", "Chat and record the session", "Exactly what a company interview on HireLoop feels like"]}
                        mock={<RoomMock />} />
                    <Spotlight flip eyebrow='Jobs' title='Let your practice speak for you'
                        text="Browse internships and jobs from companies hiring on HireLoop. When you apply, you can attach your practice record so recruiters see consistency, not just keywords."
                        points={["You choose, per application, whether to share", "Recruiters see stats, never your code", "Track every application's stage in one list"]}
                        mock={<RecordMock />} />
                </section>

                <section className='max-w-6xl mx-auto py-16'>
                    <CtaBand title='Your next interview is closer than you think'
                        text='Create a free account and solve your first problem in under a minute.'
                        primary={{ label: userData ? primaryLabel : "Create free account", onClick: () => (userData ? start("/dashboard") : setShowAuth(true)) }}
                        secondary={{ label: "Hiring? See HireLoop for companies →", to: "/for-companies" }} />
                </section>
            </main>

            <Footer />
            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </div>
    )
}

export default Home
