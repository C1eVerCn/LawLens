'use client'

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// ✅ 关键修复 1：Extension 通常是默认导出，去掉花括号 {}
// 同时重命名为 BubbleMenuExtension 以避免与上面的 React 组件 BubbleMenu 冲突
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
  Undo, Redo, Eraser, Highlighter, Link as LinkIcon,
  Table as TableIcon, Minus, Quote, Indent, Outdent,
  Sparkles, Loader2 
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface EditorProps {
  content: string
  onChange: (value: string) => void
  className?: string
}

// --- MenuBar 组件 (工具栏) ---
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  const btn = (isActive: boolean = false, disabled: boolean = false) => cn(
    "p-1.5 rounded-md hover:bg-slate-200 transition-colors text-slate-600 flex items-center justify-center min-w-[32px] min-h-[32px]",
    isActive ? "bg-slate-200 text-black font-bold shadow-sm" : "",
    disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""
  )
  const separator = <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return 
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-col border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-slate-200/50">
        <button onClick={() => editor.chain().focus().undo().run()} className={btn()}><Undo className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btn()}><Redo className="w-4 h-4"/></button>
        {separator}
        <button onClick={() => editor.chain().focus().setFontFamily('SimSun').run()} className={cn(btn(editor.isActive('textStyle', { fontFamily: 'SimSun' })), "w-auto px-2 text-xs font-serif")}>宋体</button>
        <button onClick={() => editor.chain().focus().setFontFamily('SimHei').run()} className={cn(btn(editor.isActive('textStyle', { fontFamily: 'SimHei' })), "w-auto px-2 text-xs font-sans")}>黑体</button>
        {separator}
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))}><Heading1 className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}><Heading2 className="w-4 h-4"/></button>
        {separator}
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}><Bold className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}><Italic className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))}><UnderlineIcon className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))}><Strikethrough className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btn(editor.isActive('highlight'))}><Highlighter className="w-4 h-4 text-yellow-500"/></button>
        <div className="flex items-center gap-1 mx-1 px-1 border-l border-r border-slate-300">
           <button onClick={() => editor.chain().focus().setColor('#000000').run()} className="w-3 h-3 rounded-full bg-black border border-slate-300"/>
           <button onClick={() => editor.chain().focus().setColor('#ef4444').run()} className="w-3 h-3 rounded-full bg-red-600 border border-slate-300"/>
           <button onClick={() => editor.chain().focus().setColor('#2563eb').run()} className="w-3 h-3 rounded-full bg-blue-600 border border-slate-300"/>
        </div>
      </div>
      <div className="flex flex-wrap gap-0.5 p-1.5 bg-slate-50/50">
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btn(editor.isActive({ textAlign: 'left' }))}><AlignLeft className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btn(editor.isActive({ textAlign: 'center' }))}><AlignCenter className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btn(editor.isActive({ textAlign: 'right' }))}><AlignRight className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btn(editor.isActive({ textAlign: 'justify' }))}><AlignJustify className="w-4 h-4"/></button>
        {separator}
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}><List className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}><ListOrdered className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().sinkListItem('listItem').run()} disabled={!editor.can().sinkListItem('listItem')} className={btn(false, !editor.can().sinkListItem('listItem'))}><Indent className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().liftListItem('listItem').run()} disabled={!editor.can().liftListItem('listItem')} className={btn(false, !editor.can().liftListItem('listItem'))}><Outdent className="w-4 h-4"/></button>
        {separator}
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}><Quote className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn()}><Minus className="w-4 h-4"/></button>
        <button onClick={setLink} className={btn(editor.isActive('link'))}><LinkIcon className="w-4 h-4"/></button>
        {separator}
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btn()}><TableIcon className="w-4 h-4"/></button>
        {editor.isActive('table') && (
           <button onClick={() => editor.chain().focus().deleteTable().run()} className={cn(btn(), "text-red-500")}><Eraser className="w-4 h-4"/></button>
        )}
        <div className="flex-1" />
        <button onClick={() => editor.chain().focus().unsetAllMarks().run()} className={btn()}><Eraser className="w-4 h-4"/></button>
      </div>
    </div>
  )
}

// --- 主编辑器组件 ---
export default function Editor({ content, onChange, className }: EditorProps) {
  
  const [isPolishingSelection, setIsPolishingSelection] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      // ✅ 关键修复 2：配置 Extension
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
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none min-h-[800px] px-12 py-10 font-serif text-slate-800 leading-loose max-w-none shadow-sm',
      },
    },
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    // Next.js hydration fix
    immediatelyRender: false 
  })

  // 监听外部 content 变化
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
          messages: [{ role: 'user', content: "请优化这段文字" }], 
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
      alert("AI 连接失败，请检查后端服务")
    } finally {
      setIsPolishingSelection(false)
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden relative", className)}>
      <MenuBar editor={editor} />

      {/* Bubble Menu 组件 */}
      {editor && (
        <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100 }}
            shouldShow={({ from, to }: any) => {
                // 只有当有选中内容且不在 AI 处理中时显示
                return from !== to && !isPolishingSelection
            }}
        >
            <div className="flex items-center gap-1 p-1 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700 animate-in fade-in zoom-in duration-200">
                <button
                    onClick={handleAiPolishSelection}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium hover:bg-slate-700 rounded transition-colors group"
                >
                    <Sparkles className="w-3 h-3 text-yellow-400 group-hover:animate-pulse" />
                    AI 润色
                </button>
                <div className="w-[1px] h-3 bg-slate-700 mx-1" />
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1 hover:bg-slate-700 rounded", editor.isActive('bold') && 'text-blue-400')}><Bold className="w-3 h-3" /></button>
                <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-1 hover:bg-slate-700 rounded", editor.isActive('highlight') && 'text-yellow-400')}><Highlighter className="w-3 h-3" /></button>
            </div>
        </BubbleMenu>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-100/50 cursor-text p-4 flex justify-center" onClick={() => editor?.commands.focus()}>
        <div className="bg-white w-full max-w-[850px] min-h-[800px] shadow-sm border border-slate-200 relative">
             <EditorContent editor={editor} className="h-full" />
             
             {isPolishingSelection && (
                 <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100 shadow-sm animate-pulse z-50">
                     <Loader2 className="w-3 h-3 animate-spin" />
                     AI 正在重写...
                 </div>
             )}
        </div>
      </div>

      <style jsx global>{`
        .ProseMirror { font-family: "SimSun", "Songti SC", serif; }
        .ProseMirror h1 { font-size: 1.8em; font-weight: 900; text-align: center; margin-top: 0.5em; }
        .ProseMirror h2 { font-size: 1.4em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
        .ProseMirror p { margin-bottom: 0.8em; text-align: justify; line-height: 1.8; }
        .ProseMirror blockquote { border-left: 4px solid #cbd5e1; padding-left: 1em; color: #64748b; font-style: italic; background: #f8fafc; padding: 0.5rem; }
        .ProseMirror table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 0; overflow: hidden; }
        .ProseMirror td, .ProseMirror th { min-width: 1em; border: 1px solid #ced4da; padding: 8px 12px; vertical-align: top; box-sizing: border-box; position: relative; }
        .ProseMirror th { font-weight: bold; text-align: left; background-color: #f1f3f5; }
        .ProseMirror .selectedCell:after { z-index: 2; position: absolute; content: ""; left: 0; right: 0; top: 0; bottom: 0; background: rgba(200, 200, 255, 0.4); pointer-events: none; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; }
        .ProseMirror a { text-decoration: underline; color: #2563eb; cursor: pointer; }
        .ProseMirror hr { border-top: 2px solid #e2e8f0; margin: 2rem 0; }
      `}</style>
    </div>
  )
}