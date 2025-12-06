// components/ui/typewriter-effect.tsx
'use client'

import { useState, useEffect } from 'react'

interface TypewriterEffectProps {
  text: string
  speed?: number // 可选：自定义速度
}

export const TypewriterEffect = ({ text, speed = 20 }: TypewriterEffectProps) => {
  const [displayedText, setDisplayedText] = useState('')
  
  useEffect(() => {
    let i = 0
    setDisplayedText('')
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i))
        i++
      } else {
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return <div className="whitespace-pre-wrap leading-relaxed">{displayedText}</div>
}