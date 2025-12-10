'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
// ✅ 修复点：加了花括号，改为命名导入
import { TextStyle } from '@tiptap/extension-text-style' 
import { Color } from '@tiptap/extension-color'
import { useEffect } from 'react'
import { cn } from "@/lib/utils"
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Heading1, Heading2, 
  Undo, Redo, Eraser
} from 'lucide-react'

interface EditorProps {
  content: string
  onChange: (value: string) => void
  className?: string
}

// --- 1. 自定义工具栏组件 ---
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  // 按钮样式辅助函数
  const btn = (isActive: boolean = false) => cn(
    "p-2 rounded-md hover:bg-slate-200 transition-colors text-slate-600 flex items-center justify-center",
    isActive ? "bg-slate-200 text-black font-bold" : ""
  )

  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2 sticky top-0 z-10">
      
      {/* 撤销/重做 */}
      <div className="flex gap-1 border-r border-slate-300 pr-2 mr-2">
        <button onClick={() => editor.chain().focus().undo().run()} className={btn()} title="撤销">
          <Undo className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btn()} title="重做">
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* 标题 */}
      <button 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
        className={btn(editor.isActive('heading', { level: 2 }))}
        title="大标题"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
        className={btn(editor.isActive('heading', { level: 3 }))}
        title="小标题"
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />

      {/* 基础格式 */}
      <button 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        className={btn(editor.isActive('bold'))}
        title="加粗"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        className={btn(editor.isActive('italic'))}
        title="斜体"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleUnderline().run()} 
        className={btn(editor.isActive('underline'))}
        title="下划线"
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>

      {/* 颜色选择 (简单版：黑/红/蓝) */}
      <div className="flex items-center gap-1 mx-1 px-1 border-l border-r border-slate-300">
         <button 
           onClick={() => editor.chain().focus().setColor('#000000').run()} 
           className="w-4 h-4 rounded-full bg-black border border-slate-300 hover:scale-110 transition-transform ring-offset-1 hover:ring-2 ring-slate-200"
           title="黑色"
         />
         <button 
           onClick={() => editor.chain().focus().setColor('#ef4444').run()} 
           className="w-4 h-4 rounded-full bg-red-500 border border-slate-300 hover:scale-110 transition-transform ring-offset-1 hover:ring-2 ring-red-200"
           title="红色 (重点)"
         />
         <button 
           onClick={() => editor.chain().focus().setColor('#3b82f6').run()} 
           className="w-4 h-4 rounded-full bg-blue-500 border border-slate-300 hover:scale-110 transition-transform ring-offset-1 hover:ring-2 ring-blue-200"
           title="蓝色"
         />
      </div>

      {/* 对齐方式 */}
      <button 
        onClick={() => editor.chain().focus().setTextAlign('left').run()} 
        className={btn(editor.isActive({ textAlign: 'left' }))}
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button 
        onClick={() => editor.chain().focus().setTextAlign('center').run()} 
        className={btn(editor.isActive({ textAlign: 'center' }))}
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      <button 
        onClick={() => editor.chain().focus().setTextAlign('right').run()} 
        className={btn(editor.isActive({ textAlign: 'right' }))}
      >
        <AlignRight className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />

      {/* 列表 */}
      <button 
        onClick={() => editor.chain().focus().toggleBulletList().run()} 
        className={btn(editor.isActive('bulletList'))}
      >
        <List className="w-4 h-4" />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleOrderedList().run()} 
        className={btn(editor.isActive('orderedList'))}
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      {/* 清除格式 */}
      <button 
        onClick={() => editor.chain().focus().unsetAllMarks().run()} 
        className={btn()}
        title="清除格式"
      >
        <Eraser className="w-4 h-4" />
      </button>
    </div>
  )
}

// --- 2. 主编辑器组件 ---
export default function Editor({ content, onChange, className }: EditorProps) {
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle, // 这里正常使用即可
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    editorProps: {
      attributes: {
        // Tailwind 样式模拟 A4 纸
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none min-h-[600px] px-10 py-8 font-serif text-slate-800 leading-loose max-w-none',
      },
    },
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    immediatelyRender: false 
  })

  // 监听外部 content 变化
  useEffect(() => {
    if (editor && content && content !== editor.getHTML()) {
      if (!editor.isFocused) { 
          editor.commands.setContent(content)
      } else {
           const currentText = editor.getText();
           if (Math.abs(currentText.length - content.length) > 5) {
               editor.commands.setContent(content)
           }
      }
    }
  }, [content, editor])

  return (
    <div className={cn("flex flex-col h-full bg-white border border-slate-200 shadow-sm overflow-hidden relative", className)}>
      <MenuBar editor={editor} />
      
      <div className="flex-1 overflow-y-auto bg-white cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} className="h-full" />
      </div>

      <style jsx global>{`
        /* 列表样式 */
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; }
        
        /* 标题样式 */
        .ProseMirror h2 { font-size: 1.4em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: #1e293b; }
        .ProseMirror h3 { font-size: 1.2em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
        
        /* 段落间距 */
        .ProseMirror p { margin-bottom: 0.8em; text-align: justify; }
        
        /* 引用块 */
        .ProseMirror blockquote { border-left: 4px solid #cbd5e1; padding-left: 1em; color: #64748b; font-style: italic; }
      `}</style>
    </div>
  )
}