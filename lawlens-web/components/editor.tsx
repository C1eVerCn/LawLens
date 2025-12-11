'use client'

import { useEditor, EditorContent, BubbleMenu, Extension } from '@tiptap/react'
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
  List, ListOrdered, Undo, Redo, Highlighter, 
  Table as TableIcon, Quote, Sparkles, Loader2, Minus, 
  Type, Cloud, ChevronDown, Plus, Minus as MinusIcon
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// --- 修复 1: 扩展 Tiptap 命令类型定义 ---
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

// --- 修复 2: 完善 Extension 类型注解 ---
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace('px', ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}px` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: { chain: any }) => {
        return chain().setMark('textStyle', { fontSize }).run()
      },
      unsetFontSize: () => ({ chain }: { chain: any }) => {
        return chain().setMark('textStyle', { fontSize: null }).run()
      },
    }
  },
})

interface EditorProps {
  content: string
  onChange: (value: string) => void
  onStatsChange?: (stats: { words: number; chars: number }) => void
  className?: string
}

// --- Word 标准中文字号对照表 (像素近似值) ---
// 顺序：从大到小，或者按照 Word 下拉框的习惯
const FONT_SIZE_MAP = [
  { label: '初号', value: '56' }, // 42pt
  { label: '小初', value: '48' }, // 36pt
  { label: '一号', value: '34' }, // 26pt
  { label: '小一', value: '32' }, // 24pt
  { label: '二号', value: '29' }, // 22pt
  { label: '小二', value: '24' }, // 18pt
  { label: '三号', value: '21' }, // 16pt
  { label: '小三', value: '20' }, // 15pt
  { label: '四号', value: '18' }, // 14pt
  { label: '小四', value: '16' }, // 12pt
  { label: '五号', value: '14' }, // 10.5pt
  { label: '小五', value: '12' }, // 9pt
  // 补充常用数字字号，防止断层
  { label: '10', value: '10' },
  { label: '11', value: '11' },
  { label: '12', value: '12' },
  { label: '14', value: '14' },
  { label: '16', value: '16' },
  { label: '18', value: '18' },
  { label: '20', value: '20' },
  { label: '24', value: '24' },
  { label: '30', value: '30' },
  { label: '36', value: '36' },
  { label: '48', value: '48' },
  { label: '60', value: '60' },
  { label: '72', value: '72' },
];

// 去重并排序，方便计算上一档/下一档
const SORTED_FONT_SIZES = Array.from(new Set(FONT_SIZE_MAP.map(i => parseInt(i.value)))).sort((a, b) => a - b);

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  const btnClass = (isActive: boolean = false) => cn(
    "flex items-center justify-center w-7 h-7 rounded-[4px] transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    isActive ? "bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-200" : ""
  )
  
  const Divider = () => <div className="w-[1px] h-4 bg-slate-200 mx-1.5 self-center opacity-60" />

  const ColorButton = ({ color }: { color: string }) => (
    <button
      onClick={() => editor.chain().focus().setColor(color).run()}
      className={cn(
        "w-3.5 h-3.5 rounded-full border border-slate-200 hover:scale-110 transition-transform",
        editor.isActive('textStyle', { color }) && "ring-2 ring-offset-1 ring-slate-400"
      )}
      style={{ backgroundColor: color }}
      title={color}
    />
  )

  // 获取当前字号
  const currentSizeVal = editor.getAttributes('textStyle').fontSize || '16';
  
  // 查找对应的显示标签（优先显示中文名，如 "小四"）
  const displayLabel = FONT_SIZE_MAP.find(i => i.value === currentSizeVal)?.label || currentSizeVal;

  const adjustFontSize = (step: number) => {
    const current = parseInt(currentSizeVal);
    const currentIndex = SORTED_FONT_SIZES.indexOf(current);
    
    let nextIndex = currentIndex + step;
    if (currentIndex === -1) {
        // 如果当前是自定义字号，找个最近的
        const nearest = SORTED_FONT_SIZES.reduce((prev, curr) => 
            Math.abs(curr - current) < Math.abs(prev - current) ? curr : prev
        );
        nextIndex = SORTED_FONT_SIZES.indexOf(nearest) + step;
    }

    // 边界检查
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= SORTED_FONT_SIZES.length) nextIndex = SORTED_FONT_SIZES.length - 1;

    editor.chain().focus().setFontSize(String(SORTED_FONT_SIZES[nextIndex])).run();
  }

  return (
    <div className="flex flex-wrap items-center px-4 py-2 bg-[#F9FAFB] border-b border-slate-200 sticky top-0 z-30 shadow-sm select-none">
      {/* 撤销重做 */}
      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().undo().run()} className={btnClass()}><Undo size={14}/></button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btnClass()}><Redo size={14}/></button>
      </div>
      
      <Divider />

      {/* Word 风格字体与字号控制区 */}
      <div className="flex items-center gap-2 mr-2">
         {/* 字体下拉框 */}
         <div className="relative group">
             <select 
                className="h-7 text-xs font-medium border border-slate-300 rounded px-2 bg-white text-slate-700 focus:outline-none focus:border-indigo-500 hover:bg-slate-50 cursor-pointer appearance-none pr-6 min-w-[80px]"
                onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                value={editor.getAttributes('textStyle').fontFamily || ''}
             >
                <option value="" disabled>字体</option>
                <option value="SimSun">宋体</option>
                <option value="SimHei">黑体</option>
                <option value="KaiTi">楷体</option>
                <option value="FangSong">仿宋</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
             </select>
             <ChevronDown className="absolute right-1.5 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
         </div>

         {/* 字号下拉框 (Word 风格) */}
         <div className="relative group">
             <select 
                className="h-7 text-xs font-medium border border-slate-300 rounded px-1 bg-white text-slate-700 focus:outline-none focus:border-indigo-500 hover:bg-slate-50 cursor-pointer appearance-none pr-5 min-w-[60px] text-center"
                onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
                value={currentSizeVal}
             >
                {/* 1. 先渲染中文字号 */}
                <optgroup label="中文字号">
                    {FONT_SIZE_MAP.filter(i => !/^\d+$/.test(i.label)).map(item => (
                        <option key={item.label} value={item.value}>{item.label}</option>
                    ))}
                </optgroup>
                {/* 2. 再渲染数字字号 */}
                <optgroup label="数字字号">
                    {FONT_SIZE_MAP.filter(i => /^\d+$/.test(i.label)).map(item => (
                        <option key={item.label} value={item.value}>{item.label}</option>
                    ))}
                </optgroup>
             </select>
             <ChevronDown className="absolute right-1 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
         </div>

         {/* 增大/缩小按钮 */}
         <div className="flex border border-slate-300 rounded overflow-hidden h-7 bg-white">
            <button 
                onClick={() => adjustFontSize(1)} 
                className="px-2 hover:bg-slate-100 text-slate-600 border-r border-slate-200 flex items-center justify-center active:bg-slate-200" title="增大字号 (Ctrl+])">
                <span className="text-[14px] font-bold">A</span><Plus size={8} className="-mt-1 -ml-0.5"/>
            </button>
            <button 
                onClick={() => adjustFontSize(-1)} 
                className="px-2 hover:bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200" title="减小字号 (Ctrl+[)">
                <span className="text-[10px] font-bold">A</span><MinusIcon size={8} className="-mt-1 -ml-0.5"/>
            </button>
         </div>
      </div>

      <div className="flex items-center gap-1.5 mr-2 px-2 py-1.5 bg-white border border-slate-200 rounded-md">
         <ColorButton color="#000000" />
         <ColorButton color="#DC2626" />
         <ColorButton color="#2563EB" />
         <ColorButton color="#16A34A" />
      </div>

      <Divider />

      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))}><Bold size={14}/></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))}><Italic size={14}/></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))}><UnderlineIcon size={14}/></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))}><Strikethrough size={14}/></button>
        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))}><Highlighter size={14} className="text-amber-500"/></button>
      </div>

      <Divider />

      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))}><AlignLeft size={14}/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))}><AlignCenter size={14}/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))}><AlignRight size={14}/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnClass(editor.isActive({ textAlign: 'justify' }))}><AlignJustify size={14}/></button>
      </div>

      <Divider />

      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))}><List size={15}/></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))}><ListOrdered size={15}/></button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))}><Quote size={14}/></button>
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btnClass()}><TableIcon size={14}/></button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass()}><Minus size={14}/></button>
      </div>
    </div>
  )
}

const StatusBar = ({ editor, wordCount }: { editor: any, wordCount: number }) => {
  if (!editor) return null
  return (
    <div className="h-7 bg-[#F9FAFB] border-t border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 select-none z-40 relative">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 min-w-[60px]">
          <Type size={11} />
          <span className="font-medium text-slate-700">{wordCount} 字</span>
        </span>
        <span className="w-[1px] h-3 bg-slate-300" />
        <span>中文(简体)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Cloud size={11} className="text-green-600" />
        <span className="text-green-600 font-medium">已保存</span>
      </div>
    </div>
  )
}

export default function Editor({ content, onChange, onStatsChange, className }: EditorProps) {
  const [isPolishing, setIsPolishing] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ 
        bulletList: { keepMarks: true }, 
        orderedList: { keepMarks: true },
        history: { depth: 100 }
      }),
      Placeholder.configure({
        placeholder: "在此输入内容，或使用 '/' 唤起 AI 助手...",
        emptyEditorClass: 'is-editor-empty relative before:content-[attr(data-placeholder)] before:text-slate-300 before:absolute before:left-0 before:top-0 before:pointer-events-none before:h-full',
      }),
      BubbleMenuExtension.configure({ pluginKey: 'bubbleMenu' }),
      Underline, TextStyle, FontFamily, FontSize, Color, Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      HorizontalRule,
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
    ],
    editorProps: {
      attributes: {
        // Word 风格：初始字号设为 16px (小四)
        class: 'print-content prose prose-slate max-w-none focus:outline-none min-h-[1000px] w-full md:max-w-[900px] px-[4rem] py-[4rem] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200/50 mx-auto font-serif text-slate-800 leading-[1.8] text-[16px] selection:bg-indigo-100 selection:text-indigo-900',
      },
    },
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      const text = editor.state.doc.textContent
      setWordCount(text.length)
      if (onStatsChange) onStatsChange({ words: text.length, chars: text.length })
    },
    immediatelyRender: false 
  })

  useEffect(() => {
    if (editor && content && content !== editor.getHTML() && !editor.isFocused) {
       editor.commands.setContent(content)
       setWordCount(editor.state.doc.textContent.length)
    }
  }, [content, editor])

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

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100, zIndex: 99 }} shouldShow={({ from, to }) => from !== to && !isPolishing}>
            <div className="flex items-center gap-1 p-1 bg-[#1A1A1A] text-white rounded-[6px] shadow-xl border border-white/10 animate-in fade-in zoom-in duration-150">
                <button onClick={handleAiPolishSelection} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold hover:bg-white/10 rounded transition-colors group">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
                    AI 润色
                </button>
                <div className="w-[1px] h-3 bg-white/20 mx-1" />
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 hover:bg-white/10 rounded", editor.isActive('bold') && 'text-indigo-400')}><Bold size={14} /></button>
                <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-1.5 hover:bg-white/10 rounded", editor.isActive('highlight') && 'text-amber-400')}><Highlighter size={14} /></button>
            </div>
        </BubbleMenu>
      )}

      <div className="flex-1 overflow-y-auto cursor-text py-8 px-4 md:px-6 scroll-smooth bg-[#F2F4F7]" onClick={() => editor?.commands.focus()}>
             <EditorContent editor={editor} />
             
             {isPolishing && (
                 <div className="fixed bottom-16 right-12 flex items-center gap-3 px-4 py-2.5 bg-white text-slate-800 text-xs font-bold rounded-lg border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 animate-in slide-in-from-bottom-4">
                     <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                     <span>AI 正在思考...</span>
                 </div>
             )}
      </div>

      <StatusBar editor={editor} wordCount={wordCount} />

      <style jsx global>{`
        .ProseMirror { font-family: "SimSun", "Songti SC", "Times New Roman", serif; outline: none; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  )
}