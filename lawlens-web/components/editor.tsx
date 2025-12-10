'use client'

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// Extension 引入
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'

import { useEffect, useState } from 'react'
import { cn } from "@/lib/utils"
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, 
  Undo, Redo, Highlighter, Link as LinkIcon,
  Table as TableIcon, Quote, Sparkles, Loader2, Minus
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface EditorProps {
  content: string
  onChange: (value: string) => void
  className?: string
}

// --- 专业版工具栏 ---
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  const btnClass = (isActive: boolean = false) => cn(
    "flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 transition-colors text-slate-600",
    isActive ? "bg-blue-50 text-blue-600" : ""
  )
  
  const Divider = () => <div className="w-[1px] h-4 bg-slate-200 mx-1.5 self-center" />

  return (
    <div className="flex items-center flex-wrap px-4 py-2 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
      {/* 1. 历史操作 */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().undo().run()} className={btnClass()} title="撤销"><Undo className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btnClass()} title="重做"><Redo className="w-4 h-4"/></button>
      </div>
      
      <Divider />

      {/* 2. 标题与格式 */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="一级标题"><Heading1 className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="二级标题"><Heading2 className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="加粗"><Bold className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="斜体"><Italic className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="下划线"><UnderlineIcon className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))} title="高亮"><Highlighter className="w-4 h-4 text-yellow-500"/></button>
      </div>

      <Divider />

      {/* 3. 段落对齐 */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))}><AlignLeft className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))}><AlignCenter className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))}><AlignRight className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))}><List className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))}><ListOrdered className="w-4 h-4"/></button>
      </div>

      <Divider />

      {/* 4. 插入对象 */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))}><Quote className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btnClass()}><TableIcon className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass()}><Minus className="w-4 h-4"/></button>
      </div>
    </div>
  )
}

export default function Editor({ content, onChange, className }: EditorProps) {
  const [isPolishingSelection, setIsPolishingSelection] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      BubbleMenuExtension.configure({
        pluginKey: 'bubbleMenu',
      }),
      Underline, TextStyle, FontFamily, Color, Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      HorizontalRule,
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
    ],
    editorProps: {
      attributes: {
        // ✨ A4 纸张核心样式 ✨
        // min-h-[1056px]: A4 纸高度模拟
        // px-16 py-14: 页边距
        // shadow-lg: 纸张投影
        class: 'print-content prose prose-slate max-w-none focus:outline-none min-h-[1056px] px-12 py-16 bg-white shadow-lg border border-slate-200 mx-auto font-serif text-slate-800 leading-loose',
      },
    },
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    immediatelyRender: false 
  })

  // 保持内容同步逻辑
  useEffect(() => {
    if (editor && content && content !== editor.getHTML()) {
      if (!editor.isFocused) { 
          editor.commands.setContent(content)
      } else {
           const currentText = editor.getText();
           if (Math.abs(currentText.length - content.length) > 10) {
               editor.commands.setContent(content)
           }
      }
    }
  }, [content, editor])

  // 局部润色逻辑
  const handleAiPolishSelection = async () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selection = editor.state.doc.textBetween(from, to, ' ')
    
    if (!selection || selection.length < 2) return

    setIsPolishingSelection(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: "请优化这段文字，使其更符合法律规范" }], 
          selection: selection, 
          mode: 'selection_polish' 
        }),
      })

      if (!response.ok || !response.body) throw new Error("API Error")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let isFirstChunk = true

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value, { stream: true })
        
        if (chunkValue) {
           if (isFirstChunk) {
               editor.chain().focus().deleteSelection().run()
               isFirstChunk = false
           }
           editor.commands.insertContent(chunkValue)
        }
      }

    } catch (e) {
      console.error(e)
      alert("AI 连接失败")
    } finally {
      setIsPolishingSelection(false)
    }
  }

  return (
    <div className={cn("flex flex-col w-full h-full", className)}>
      
      {/* 顶部工具栏 (Sticky) */}
      <div className="sticky top-0 z-30">
        <MenuBar editor={editor} />
      </div>

      {/* Bubble Menu (浮动菜单) */}
      {editor && (
        <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100, zIndex: 99 }}
            shouldShow={({ from, to }: any) => {
                return from !== to && !isPolishingSelection
            }}
        >
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-sm text-white rounded-lg shadow-xl border border-slate-700 animate-in fade-in zoom-in duration-200">
                <button
                    onClick={handleAiPolishSelection}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium hover:bg-slate-700 rounded transition-colors group"
                >
                    <Sparkles className="w-3 h-3 text-purple-400 group-hover:animate-pulse" />
                    AI 润色
                </button>
                <div className="w-[1px] h-3 bg-slate-700 mx-1" />
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 hover:bg-slate-700 rounded", editor.isActive('bold') && 'text-blue-400')}><Bold className="w-3.5 h-3.5" /></button>
                <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-1.5 hover:bg-slate-700 rounded", editor.isActive('highlight') && 'text-yellow-400')}><Highlighter className="w-3.5 h-3.5" /></button>
            </div>
        </BubbleMenu>
      )}

      {/* 编辑区域 (点击空白处聚焦) */}
      <div className="flex-1 bg-[#F3F4F6] cursor-text py-8" onClick={() => editor?.commands.focus()}>
             <EditorContent editor={editor} />
             
             {isPolishingSelection && (
                 <div className="fixed bottom-10 right-10 flex items-center gap-3 px-4 py-3 bg-white text-slate-700 text-sm font-medium rounded-full border border-slate-200 shadow-2xl animate-bounce z-50">
                     <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                     AI 正在优化选中内容...
                 </div>
             )}
      </div>

      <style jsx global>{`
        /* 强制宋体/衬线体，增强法律文件感 */
        .ProseMirror { font-family: "SimSun", "Songti SC", "Times New Roman", serif; }
        
        /* 标题样式 */
        .ProseMirror h1 { font-size: 24pt; font-weight: 900; text-align: center; margin-bottom: 24pt; margin-top: 12pt; color: #000; }
        .ProseMirror h2 { font-size: 16pt; font-weight: bold; margin-top: 18pt; margin-bottom: 12pt; }
        
        /* 正文样式 */
        .ProseMirror p { margin-bottom: 12pt; text-align: justify; line-height: 1.8; font-size: 12pt; }
        
        /* 表格样式 */
        .ProseMirror table { border-collapse: collapse; margin: 0; overflow: hidden; width: 100%; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #000; padding: 6px 10px; vertical-align: top; }
        .ProseMirror th { font-weight: bold; background-color: #f8f9fa; }
        
        /* 引用样式 */
        .ProseMirror blockquote { border-left: 3px solid #000; padding-left: 1em; margin-left: 0; color: #4b5563; font-style: italic; }
      `}</style>
    </div>
  )
}