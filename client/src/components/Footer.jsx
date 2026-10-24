import React from 'react'
import { Link } from 'react-router-dom'
import { BsRobot } from 'react-icons/bs'

const COLUMNS = [
  { title: "For students", links: [["DSA practice", "/practice"], ["DSA sheets", "/practice?tab=sheets"], ["AI mock interview", "/interview"], ["Jobs", "/jobs"]] },
  { title: "For companies", links: [["Why HireLoop", "/for-companies"], ["Create a workspace", "/for-companies"], ["Company login", "/auth"]] }
]

function Footer() {
  return (
    <div className='bg-[#f3f3f3] flex justify-center px-4 pb-10 pt-10'>
      <div className='w-full max-w-6xl bg-white rounded-[24px] shadow-sm border border-gray-200 p-8 md:p-10'>
        <div className='grid md:grid-cols-4 gap-8'>
          <div className='md:col-span-2'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='bg-black text-white p-2 rounded-lg'><BsRobot size={16} /></div>
              <h2 className='font-semibold'>HireLoop.AI</h2>
            </div>
            <p className='text-gray-500 text-sm max-w-sm'>
              Students practise and get hired. Companies find, interview and hire them. One platform for both sides of the tech interview.
            </p>
          </div>
          {COLUMNS.map(col => (
            <div key={col.title}>
              <p className='text-sm font-semibold mb-3'>{col.title}</p>
              <ul className='space-y-2'>
                {col.links.map(([label, to]) => <li key={label}><Link to={to} className='text-sm text-gray-500 hover:text-black'>{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className='text-xs text-gray-400 border-t border-gray-100 mt-8 pt-6'>© {new Date().getFullYear()} HireLoop.AI</p>
      </div>
    </div>
  )
}

export default Footer
