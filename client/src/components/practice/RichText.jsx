import React from 'react'

// Renders problem text: blank lines split paragraphs, `backticks` become inline code
function RichText({ text, className = "" }) {
    return (
        <div className={className}>
            {(text || "").split(/\n{2,}/).map((para, i) => (
                <p key={i} className='mb-3 leading-relaxed'>
                    {para.split(/(`[^`]+`)/g).map((part, j) => part.startsWith("`") && part.endsWith("`")
                        ? <code key={j} className='px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[0.9em] font-mono'>{part.slice(1, -1)}</code>
                        : <React.Fragment key={j}>{part}</React.Fragment>)}
                </p>
            ))}
        </div>
    )
}

export default RichText
