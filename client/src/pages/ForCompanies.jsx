import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import toast from 'react-hot-toast'
import { FaColumns, FaAddressBook, FaVideo, FaClipboardCheck, FaCalendarAlt, FaGlobe, FaEnvelope, FaChartBar, FaUsersCog } from 'react-icons/fa'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AuthModel from '../components/AuthModel'
import { AudienceSwitch, CtaBand, FeatureCard, SectionTitle, Spotlight, Steps } from '../components/landing/LandingParts'
import { CalendarMock, CareersMock, FunnelMock, PipelineMock, RecordMock, RoomMock } from '../components/landing/Mockups'

const tint = "bg-violet-50 text-violet-600"
const FEATURES = [
    { icon: <FaColumns />, title: "Drag-and-drop pipeline", text: "Applied, screening, interview, offer, hired. Move candidates between stages and every change is logged." },
    { icon: <FaAddressBook />, title: "Talent pool", text: "Everyone who applies, plus people you add by hand or import from a CSV. Tags, saved lists and duplicate detection." },
    { icon: <FaVideo />, title: "Live coding interviews", text: "Video, screen share, a shared editor that runs code in 4 languages, chat, recording and tab-switch alerts." },
    { icon: <FaClipboardCheck />, title: "Scorecards + AI summary", text: "Rate problem solving, coding, communication and fundamentals, then get an AI-written summary of the interview." },
    { icon: <FaCalendarAlt />, title: "Team calendar", text: "Interviews, calls and debriefs in one place, with clash warnings and Google Calendar / .ics export." },
    { icon: <FaGlobe />, title: "Your own careers page", text: "A public page with your open roles. Anyone can apply without an account, and screening questions flag mismatches." },
    { icon: <FaEnvelope />, title: "Automatic emails", text: "Application received, stage updates and interview invites with the room link, in your own wording." },
    { icon: <FaChartBar />, title: "Reports", text: "Funnel, time to hire, best sources, per-job and per-recruiter numbers, and a CSV export of every application." },
    { icon: <FaUsersCog />, title: "Team roles", text: "Invite teammates as admin, recruiter or read-only viewer. Everyone works in the same shared workspace." }
]

function ForCompanies() {
    const { userData } = useSelector((state) => state.user)
    const navigate = useNavigate()
    const [showAuth, setShowAuth] = useState(false)

    const getStarted = () => {
        if (!userData) {
            // the role picker after sign-up opens with "Company" already selected
            try { sessionStorage.setItem("iq:intent", "company") } catch { /* private mode */ }
            return setShowAuth(true)
        }
        if (!userData.role) return navigate("/onboarding")
        if (userData.role === "company") return navigate("/company")
        toast("You're signed in with a student account. Log out and sign in with your work email to create a company workspace.", { icon: "ℹ️", duration: 6000 })
    }
    const primaryLabel = userData?.role === "company" ? "Open your workspace" : "Create a free workspace"

    return (
        <div className='min-h-screen bg-[#f3f3f3] flex flex-col'>
            <Navbar />

            <main className='flex-1 px-4 sm:px-6 overflow-x-clip'>
                <section className='max-w-6xl mx-auto pt-10 pb-16'>
                    <AudienceSwitch active='companies' />
                    <div className='mt-12 bg-gray-950 text-white rounded-[32px] p-6 sm:p-10 lg:p-14 relative overflow-hidden'>
                        <div className='absolute -top-32 -right-20 w-96 h-96 rounded-full bg-violet-600/30 blur-3xl' />
                        <div className='absolute -bottom-40 -left-20 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl' />
                        <div className='relative grid lg:grid-cols-2 gap-12 items-center'>
                            <div>
                                <p className='inline-flex items-center gap-2 text-sm bg-white/10 rounded-full px-4 py-1.5 text-gray-300'>
                                    <span className='w-2 h-2 rounded-full bg-violet-400' /> Free hiring workspace for your team
                                </p>
                                <Motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                                    className='text-4xl sm:text-5xl font-semibold leading-[1.1] mt-6'>
                                    Hire engineers with <span className='text-violet-300'>real coding interviews</span>
                                </Motion.h1>
                                <p className='text-gray-400 text-lg mt-6'>
                                    Post a job, collect applicants from your careers page, interview them live on video with a shared code editor, and decide with scorecards and reports. One workspace for the whole team.
                                </p>
                                <div className='flex flex-wrap gap-3 mt-9'>
                                    <button onClick={getStarted} className='bg-white text-black px-8 py-3.5 rounded-full font-medium hover:bg-gray-100'>{primaryLabel}</button>
                                    <a href='#how' className='px-7 py-3.5 rounded-full border border-white/20 hover:bg-white/10'>See how it works</a>
                                </div>
                                <div className='flex flex-wrap gap-x-6 gap-y-2 mt-9 text-sm text-gray-400'>
                                    {["No credit card", "Unlimited jobs", "Invite your whole team"].map(t => <span key={t} className='flex items-center gap-2'><span className='text-violet-300'>✓</span>{t}</span>)}
                                </div>
                            </div>
                            <Motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className='text-gray-900'>
                                <PipelineMock />
                            </Motion.div>
                        </div>
                    </div>
                </section>

                <section id='how' className='max-w-6xl mx-auto py-16 scroll-mt-6'>
                    <SectionTitle accent='text-violet-600' eyebrow='How it works' title='From job post to offer in one flow' />
                    <Steps dot='bg-violet-600' steps={[
                        { title: "Post and share", text: "Publish a role with optional screening questions. It shows on your careers page and on the HireLoop jobs board for students." },
                        { title: "Screen and schedule", text: "Applicants land in your pipeline and talent pool. Drag them forward, log calls, and schedule interviews that email the room link." },
                        { title: "Interview and decide", text: "Run the interview in the live room, fill the scorecard, read the AI summary, and compare candidates in reports." }
                    ]} />
                </section>

                <section className='max-w-6xl mx-auto py-16'>
                    <SectionTitle accent='text-violet-600' eyebrow='Everything included' title='The hiring tools a small team actually uses' sub='Built for startups, college placement cells and teams hiring their first engineers.' />
                    <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-5'>
                        {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} tint={tint} delay={(i % 3) * 0.08} />)}
                    </div>
                </section>

                <section className='max-w-6xl mx-auto py-16 space-y-24'>
                    <Spotlight accent='text-violet-600' check='bg-violet-100 text-violet-700' eyebrow='Live interview room' title='See how they code, not just what they say'
                        text="Every interview gets a private link. The candidate joins from the browser with no install. You both see the same editor, run the same code, and the room flags tab switches and pasted code."
                        points={["Video, audio and screen share, peer to peer", "Run JavaScript, Python, Java and C++ against test cases", "Record the session and keep notes in the scorecard"]}
                        mock={<RoomMock />} />
                    <Spotlight flip accent='text-violet-600' check='bg-violet-100 text-violet-700' eyebrow='Unique to HireLoop' title='Candidates who arrive with a track record'
                        text="Students practise DSA and mock interviews on HireLoop. When they apply to your job they can choose to share their practice record, so you see their solved count, difficulty mix and streak before the first call."
                        points={["Shared only with the candidate's consent", "Shown right on the pipeline card", "Candidates from your careers page and CSV imports sit alongside them"]}
                        mock={<RecordMock company='your company' />} />
                    <Spotlight accent='text-violet-600' check='bg-violet-100 text-violet-700' eyebrow='Careers page' title='A careers page that sets itself up'
                        text="Your workspace comes with a public page listing your open roles. Add yes/no, multiple-choice or short-answer questions to any job, and answers that don't match get flagged for you."
                        points={["No account needed to apply", "Spam protection built in", "Applicants get an automatic confirmation email"]}
                        mock={<CareersMock />} />
                    <Spotlight flip accent='text-violet-600' check='bg-violet-100 text-violet-700' eyebrow='Calendar and reports' title='Know what is happening today, and what is working overall'
                        text="The calendar shows every interview and call for the team. Reports show where candidates drop off, how long hiring takes and which sources bring the people you hire."
                        points={["Clash warnings when someone's double-booked", "Funnel, time to hire, sources, team activity", "Export everything to CSV"]}
                        mock={<div className='space-y-5'><CalendarMock /><FunnelMock /></div>} />
                </section>

                <section className='max-w-6xl mx-auto py-16'>
                    <CtaBand title='Run your next hire on HireLoop'
                        text='Create a workspace in under a minute, post a job and share your careers page today.'
                        primary={{ label: primaryLabel, onClick: getStarted }}
                        secondary={{ label: "Preparing for interviews? For students →", to: "/" }} />
                </section>
            </main>

            <Footer />
            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </div>
    )
}

export default ForCompanies
