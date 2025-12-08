'use client'

import { cn } from "@/lib/utils" // 👈 如果你有 utils.ts (shadcn默认有)，没有的话去掉这个，直接用字符串拼接

interface EditorProps {
  content: string
  onChange: (value: string) => void
  className?: string // 👈 新增：允许外部传入样式
}

export default function Editor({ content, onChange, className }: EditorProps) {
  return (
    <textarea
      // ✅ 核心修改：保留了你的 flex-1 和 w-full，但允许外部覆盖样式
      className={cn(
        "flex-1 w-full h-full p-6 resize-none focus:outline-none text-slate-700 leading-8 font-sans bg-transparent text-base",
        className
      )}
      // 如果没有 cn 函数，就用下面这一行代替上面的 className：
      // className={`flex-1 w-full h-full p-6 resize-none focus:outline-none text-slate-700 leading-8 font-sans bg-transparent text-base ${className || ''}`}
      
      placeholder="在此输入案情经过，或点击上方按钮快速填入模版..."
      value={content} 
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  )
}