'use client'

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import Placeholder from '@tiptap/extension-placeholder'
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
  List, ListOrdered, Heading1, Heading2, Heading3,
  Undo, Redo, Highlighter, Link as LinkIcon,
  Table as TableIcon, Quote, Sparkles, Loader2, Minus, 
  CheckCircle2, Type, Cloud
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface EditorProps {
  content: string
  onChange: (value: string) => void
  onStatsChange?: (stats: { words: number; chars: number }) => void // ✨ 新增：向上汇报统计数据
  className?: string
}

// --- Pro级 Ribbon 工具栏 ---
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  const btnClass = (isActive: boolean = false) => cn(
    "flex items-center justify-center w-8 h-8 rounded-[6px] transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    isActive ? "bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-200" : ""
  )
  
  const Divider = () => <div className="w-[1px] h-5 bg-slate-200 mx-2 self-center opacity-70" />

  return (
    <div className="flex items-center px-4 py-2.5 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] select-none">
      {/* 历史记录 */}
      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().undo().run()} className={btnClass()} title="撤销 (Ctrl+Z)"><Undo size={15}/></button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btnClass()} title="重做 (Ctrl+Shift+Z)"><Redo size={15}/></button>
      </div>
      
      <Divider />

      {/* 样式 */}
      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="一级标题"><Heading1 size={16}/></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="二级标题"><Heading2 size={16}/></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="三级标题"><Heading3 size={16}/></button>
      </div>

      <Divider />

      {/* 格式化 */}
      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="加粗 (Ctrl+B)"><Bold size={15}/></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="斜体 (Ctrl+I)"><Italic size={15}/></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="下划线 (Ctrl+U)"><UnderlineIcon size={15}/></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="删除线"><Strikethrough size={15}/></button>
        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))} title="高亮"><Highlighter size={15} className="text-amber-500"/></button>
      </div>

      <Divider />

      {/* 对齐 */}
      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))}><AlignLeft size={15}/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))}><AlignCenter size={15}/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))}><AlignRight size={15}/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnClass(editor.isActive({ textAlign: 'justify' }))}><AlignJustify size={15}/></button>
      </div>

      <Divider />

      {/* 列表与插入 */}
      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))}><List size={16}/></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))}><ListOrdered size={16}/></button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))}><Quote size={15}/></button>
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btnClass()}><TableIcon size={15}/></button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass()}><Minus size={15}/></button>
      </div>
    </div>
  )
}

// --- 底部状态栏 (Word Style) ---
const StatusBar = ({ editor, wordCount }: { editor: any, wordCount: number }) => {
  if (!editor) return null
  return (
    <div className="h-8 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-4 text-[11px] text-slate-500 select-none">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 min-w-[80px]">
          <Type size={12} />
          <span className="font-medium text-slate-700">{wordCount} 字</span>
        </span>
        <span className="w-[1px] h-3 bg-slate-300" />
        <span>中文(中国)</span>
        <span className="w-[1px] h-3 bg-slate-300" />
        <span>{editor.isFocused ? '正在编辑' : '就绪'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Cloud size={12} className="text-blue-500" />
        <span>已保存到云端</span>
      </div>
    </div>
  )
}

export default function Editor({ content, onChange, onStatsChange, className }: EditorProps) {
  const [isPolishing, setIsPolishing] = useState(false)
  // ✨ 关键修复：本地状态存储实时字数，不再依赖 content.length
  const [wordCount, setWordCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ 
        bulletList: { keepMarks: true }, 
        orderedList: { keepMarks: true },
        history: { depth: 100 }
      }),
      // ✨ 新增：Notion 风格占位符
      Placeholder.configure({
        placeholder: "输入 '/' 唤起命令，或直接开始写作...",
        emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-slate-300 before:float-left before:pointer-events-none',
      }),
      BubbleMenuExtension.configure({ pluginKey: 'bubbleMenu' }),
      Underline, TextStyle, FontFamily, Color, Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      HorizontalRule,
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
    ],
    editorProps: {
      attributes: {
        // ✨ A4 纸张完美复刻 ✨
        class: 'print-content prose prose-slate max-w-none focus:outline-none min-h-[1123px] w-[816px] px-[3rem] py-[3.5rem] bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-200/60 mx-auto font-serif text-slate-800 leading-[1.8] text-[11pt] selection:bg-indigo-100 selection:text-indigo-900',
      },
    },
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      // ✨ 关键修复：直接从 editor 对象获取纯文本长度
      const text = editor.state.doc.textContent
      setWordCount(text.length)
      if (onStatsChange) onStatsChange({ words: text.length, chars: text.length })
    },
    immediatelyRender: false 
  })

  // 内容同步 (防止光标跳动)
  useEffect(() => {
    if (editor && content && content !== editor.getHTML() && !editor.isFocused) {
       editor.commands.setContent(content)
       // 同步后更新字数
       setWordCount(editor.state.doc.textContent.length)
    }
  }, [content, editor])

  // 局部润色
  const handleAiPolishSelection = async () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selection = editor.state.doc.textBetween(from, to, ' ')
    if (!selection || selection.length < 2) return

    setIsPolishing(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: "润色" }], selection, mode: 'selection_polish' }),
      })

      if (!response.ok) throw new Error("API Error")
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if(reader) {
          editor.chain().focus().deleteSelection().run() 
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            editor.commands.insertContent(decoder.decode(value))
          }
      }
    } catch (e) { alert("AI 服务连接中断") } 
    finally { setIsPolishing(false) }
  }

  return (
    <div className={cn("flex flex-col w-full h-full relative rounded-none overflow-hidden bg-[#F2F4F7]", className)}>
      <MenuBar editor={editor} />

      {/* Notion 风格悬浮菜单 */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100, zIndex: 99 }} shouldShow={({ from, to }) => from !== to && !isPolishing}>
            <div className="flex items-center gap-1 p-1 bg-[#1A1A1A] text-white rounded-[8px] shadow-xl border border-white/10 animate-in fade-in zoom-in duration-150">
                <button onClick={handleAiPolishSelection} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold hover:bg-white/10 rounded transition-colors group">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
                    AI 润色
                </button>
                <div className="w-[1px] h-4 bg-white/20 mx-1" />
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 hover:bg-white/10 rounded", editor.isActive('bold') && 'text-indigo-400')}><Bold size={14} /></button>
                <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-1.5 hover:bg-white/10 rounded", editor.isActive('highlight') && 'text-amber-400')}><Highlighter size={14} /></button>
            </div>
        </BubbleMenu>
      )}

      {/* 编辑区容器 */}
      <div className="flex-1 overflow-y-auto cursor-text py-12 scroll-smooth" onClick={() => editor?.commands.focus()}>
             <EditorContent editor={editor} />
             
             {isPolishing && (
                 <div className="fixed bottom-16 right-12 flex items-center gap-3 px-5 py-3 bg-white text-slate-800 text-xs font-bold rounded-full border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 animate-in slide-in-from-bottom-4">
                     <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                     <span>AI 正在思考...</span>
                 </div>
             )}
      </div>

      {/* 底部状态栏 */}
      <StatusBar editor={editor} wordCount={wordCount} />

      <style jsx global>{`
        /* 字体与排版微调 */
        .ProseMirror { outline: none; }
        .ProseMirror h1 { font-size: 24pt; font-weight: 800; text-align: center; margin: 32pt 0 24pt; color: #000; letter-spacing: -0.5px; }
        .ProseMirror h2 { font-size: 16pt; font-weight: 700; margin-top: 24pt; margin-bottom: 12pt; color: #111; }
        .ProseMirror h3 { font-size: 14pt; font-weight: 700; margin-top: 18pt; margin-bottom: 8pt; color: #333; }
        .ProseMirror p { margin-bottom: 12pt; text-align: justify; line-height: 1.8; color: #1e293b; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 1.5em 0; border: 1px solid #000; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #000; padding: 8px 12px; vertical-align: top; }
        .ProseMirror th { background-color: #f8fafc; font-weight: bold; }
        .ProseMirror blockquote { border-left: 3px solid #6366f1; padding-left: 1em; margin-left: 0; color: #475569; font-style: italic; background: #f1f5f9; padding: 0.5rem; border-radius: 0 4px 4px 0; }
        
        /* 打印时隐藏UI */
        @media print {
            .ProseMirror {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
            }
        }
      `}</style>
    </div>
  )
}