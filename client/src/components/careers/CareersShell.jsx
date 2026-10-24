import React from 'react'
import { Link } from 'react-router-dom'
import { FaExternalLinkAlt } from 'react-icons/fa'

// Shared look for the public careers pages: the company is the brand here, HireLoop stays in the footer
function CareersShell({ org, children }) {
    return (
        <div className='min-h-screen bg-[#f6f7f8] flex flex-col'>
            <header className='bg-white border-b border-gray-200'>
                <div className='max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4'>
                    <Link to={`/careers/${org.slug}`} className='flex items-center gap-3 min-w-0'>
                        <span className='w-9 h-9 shrink-0 rounded-xl bg-black text-white grid place-items-center font-bold'>{org.name[0]?.toUpperCase()}</span>
                        <span className='font-semibold truncate'>{org.name}</span>
                    </Link>
                    {org.website &&
                        <a href={org.website} target='_blank' rel='noreferrer' className='flex items-center gap-1.5 text-sm text-gray-600 hover:text-black shrink-0'>Website <FaExternalLinkAlt size={10} /></a>}
                </div>
            </header>
            <main className='flex-1'>{children}</main>
            <footer className='text-center text-xs text-gray-400 py-6'>Hiring with <Link to='/' className='underline'>HireLoop</Link></footer>
        </div>
    )
}

export default CareersShell
