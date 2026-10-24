import React, { useEffect, useRef, useState } from 'react'
import { IoSend } from 'react-icons/io5'

function ChatPanel({ messages, onSend, myRole }) {
    const [text, setText] = useState("")
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const submit = (e) => {
        e.preventDefault()
        if (!text.trim()) return
        onSend(text)
        setText("")
    }

    return (
        <div className='flex flex-col h-full'>
            <div className='flex-1 overflow-y-auto space-y-3 p-1'>
                {messages.length === 0 && <p className='text-sm text-gray-400 text-center mt-6'>No messages yet</p>}
                {messages.map((m, i) => {
                    const mine = m.role === myRole
                    return (
                        <div key={i} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                            <span className='text-[11px] text-gray-400 mb-0.5'>{mine ? "You" : m.name} • {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <p className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words ${mine ? "bg-black text-white" : "bg-gray-100 text-gray-800"}`}>{m.text}</p>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>
            <form onSubmit={submit} className='flex items-center gap-2 pt-3'>
                <input value={text} onChange={e => setText(e.target.value)} placeholder='Type a message...'
                    className='flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-black' />
                <button className='p-2.5 rounded-full bg-black text-white'><IoSend size={14} /></button>
            </form>
        </div>
    )
}

export default ChatPanel
