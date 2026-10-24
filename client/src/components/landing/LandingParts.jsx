import React from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'

// "For students | For companies" switch at the top of both landing pages
export function AudienceSwitch({ active }) {
    const item = (key, label, to) => (
        <Link to={to} aria-current={active === key ? "page" : undefined}
            className={`px-4 sm:px-5 py-2 rounded-full text-sm transition ${active === key ? "bg-black text-white shadow" : "text-gray-600 hover:text-black"}`}>
            {label}
        </Link>
    )
    return (
        <div className='flex justify-center'>
            <div className='inline-flex bg-white border border-gray-200 rounded-full p-1 shadow-sm'>
                {item("students", "For students", "/")}
                {item("companies", "For companies", "/for-companies")}
            </div>
        </div>
    )
}

export function Reveal({ children, delay = 0, className = "" }) {
    return (
        <Motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay }} className={className}>
            {children}
        </Motion.div>
    )
}

export function SectionTitle({ eyebrow, title, sub, accent = "text-emerald-600" }) {
    return (
        <Reveal className='text-center max-w-2xl mx-auto mb-12'>
            {eyebrow && <p className={`text-sm font-medium ${accent}`}>{eyebrow}</p>}
            <h2 className='text-3xl md:text-4xl font-semibold mt-2 leading-tight'>{title}</h2>
            {sub && <p className='text-gray-500 mt-4'>{sub}</p>}
        </Reveal>
    )
}

export function FeatureCard({ icon, title, text, tint = "bg-emerald-50 text-emerald-600", delay = 0 }) {
    return (
        <Reveal delay={delay} className='h-full'>
            <div className='h-full bg-white rounded-3xl border border-gray-200 p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all'>
                <div className={`w-11 h-11 rounded-xl grid place-items-center mb-5 ${tint}`}>{icon}</div>
                <h3 className='font-semibold text-lg'>{title}</h3>
                <p className='text-sm text-gray-500 mt-2 leading-relaxed'>{text}</p>
            </div>
        </Reveal>
    )
}

// Text on one side, a product mockup on the other
export function Spotlight({ eyebrow, title, text, points = [], mock, flip, accent = "text-emerald-600", check = "bg-emerald-100 text-emerald-700" }) {
    return (
        <div className='grid lg:grid-cols-2 gap-10 lg:gap-16 items-center'>
            <Reveal className={flip ? "lg:order-2" : ""}>
                <p className={`text-sm font-medium ${accent}`}>{eyebrow}</p>
                <h3 className='text-2xl md:text-3xl font-semibold mt-2 leading-snug'>{title}</h3>
                <p className='text-gray-500 mt-4 leading-relaxed'>{text}</p>
                <ul className='mt-6 space-y-3'>
                    {points.map(p => (
                        <li key={p} className='flex items-start gap-3 text-sm text-gray-700'>
                            <span className={`w-5 h-5 shrink-0 rounded-full grid place-items-center text-[11px] mt-0.5 ${check}`}>✓</span>{p}
                        </li>
                    ))}
                </ul>
            </Reveal>
            <Reveal delay={0.1} className={flip ? "lg:order-1" : ""}>{mock}</Reveal>
        </div>
    )
}

export function Steps({ steps, dot = "bg-emerald-600" }) {
    return (
        <div className='grid md:grid-cols-3 gap-6'>
            {steps.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.1}>
                    <div className='relative bg-white rounded-3xl border border-gray-200 p-7 h-full'>
                        <span className={`w-9 h-9 rounded-full text-white grid place-items-center text-sm font-semibold ${dot}`}>{i + 1}</span>
                        <h3 className='font-semibold text-lg mt-5'>{s.title}</h3>
                        <p className='text-sm text-gray-500 mt-2 leading-relaxed'>{s.text}</p>
                    </div>
                </Reveal>
            ))}
        </div>
    )
}

export function CtaBand({ title, text, primary, secondary }) {
    return (
        <Reveal>
            <div className='bg-gray-950 text-white rounded-[32px] px-6 py-14 md:p-16 text-center relative overflow-hidden'>
                <div className='absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl' />
                <div className='absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl' />
                <h2 className='relative text-3xl md:text-4xl font-semibold'>{title}</h2>
                <p className='relative text-gray-400 mt-4 max-w-xl mx-auto'>{text}</p>
                <div className='relative flex flex-wrap justify-center gap-3 mt-8'>
                    <button onClick={primary.onClick} className='bg-white text-black px-8 py-3 rounded-full font-medium hover:bg-gray-100'>{primary.label}</button>
                    {secondary && <Link to={secondary.to} className='px-6 py-3 rounded-full border border-white/20 hover:bg-white/10'>{secondary.label}</Link>}
                </div>
            </div>
        </Reveal>
    )
}
