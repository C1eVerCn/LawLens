// components/editor.tsx
'use client'

interface EditorProps {
  content: string
  onChange: (value: string) => void
}

export default function Editor({ content, onChange }: EditorProps) {
  return (
    <textarea
      // ✅ 核心修改：添加 flex-1，这会强制它填满上面的 div
      className="flex-1 w-full h-full p-6 resize-none focus:outline-none text-slate-700 leading-8 font-sans bg-transparent text-base"
      placeholder="在此输入案情经过，或点击上方按钮快速填入模版..."
      value={content} 
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  )
}