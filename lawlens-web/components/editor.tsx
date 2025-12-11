'use client'

import { useEditor, EditorContent, BubbleMenu, Extension, ReactRenderer } from '@tiptap/react'
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
import Suggestion from '@tiptap/suggestion'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'

import { useEffect, useState,  useImperativeHandle, forwardRef, useLayoutEffect } from 'react'
import { cn } from "@/lib/utils"
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo, Redo, Highlighter, 
  Table as TableIcon, Quote, Sparkles, Loader2, Minus, 
  Type, Cloud, ChevronDown, Plus, Minus as MinusIcon,
  Heading1, Heading2, Heading3, FileText
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// --- 1. 斜杠菜单组件 (Command List) ---
const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) props.command(item)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  return (
    <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden min-w-[240px] p-1.5 animate-in fade-in zoom-in-95 duration-150">
      <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider mb-1">基础块</div>
      {props.items.map((item: any, index: number) => (
        <button
          key={index}
          className={cn(
            "flex items-center gap-3 w-full px-2 py-2 text-sm text-slate-700 rounded-[6px] transition-colors text-left",
            index === selectedIndex ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50"
          )}
          onClick={() => selectItem(index)}
        >
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded border bg-white",
            index === selectedIndex ? "border-indigo-200" : "border-slate-200"
          )}>
            {item.icon}
          </div>
          <div className="flex flex-col">
             <span className="font-medium">{item.title}</span>
             <span className="text-[10px] text-slate-400 font-normal">{item.desc}</span>
          </div>
        </button>
      ))}
    </div>
  )
})
CommandList.displayName = 'CommandList'

// --- 2. 配置 Slash Commands ---
const getSuggestionItems = ({ query }: { query: string }) => {
  return [
    {
      title: 'AI 续写',
      desc: '智能分析上下文并续写',
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      command: ({ editor, range }: any) => {
        // 这里触发 AI 续写逻辑，暂时模拟
        editor.chain().focus().deleteRange(range).insertContent('<blockquote>✨ AI 正在根据上下文续写...</blockquote>').run()
        // 你可以在这里调用 props 传入的 handleAiDraft 函数
      },
    },
    {
      title: '一级标题',
      desc: '大标题',
      icon: <Heading1 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
      },
    },
    {
      title: '二级标题',
      desc: '中标题',
      icon: <Heading2 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
      },
    },
    {
      title: '三级标题',
      desc: '小标题',
      icon: <Heading3 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
      },
    },
    {
      title: '无序列表',
      desc: '圆点列表',
      icon: <List className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      title: '有序列表',
      desc: '数字列表',
      icon: <ListOrdered className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
    },
    {
      title: '引用块',
      desc: '引用重点内容',
      icon: <Quote className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
    },
    {
      title: '分割线',
      desc: '视觉分隔',
      icon: <Minus className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run()
      },
    },
  ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
}

const renderSuggestion = () => {
  let component: ReactRenderer
  let popup: any

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      })

      if (!props.clientRect) return

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
        zIndex: 9999, // 确保在最上层
      })
    },
    onUpdate(props: any) {
      component.updateProps(props)
      if (!props.clientRect) return
      popup[0].setProps({ getReferenceClientRect: props.clientRect })
    },
    onKeyDown(props: any) {
      if (props.event.key === 'Escape') {
        popup[0].hide()
        return true
      }
      return (component.ref as any).onKeyDown(props)
    },
    onExit() {
      popup[0].destroy()
      component.destroy()
    },
  }
}

const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        },
      },
    }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

// --- Font Size Extension (保持不变) ---
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
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
    }]
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: { chain: any }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }: { chain: any }) => chain().setMark('textStyle', { fontSize: null }).run(),
    }
  },
})

// --- Editor Interface & Constants ---
interface EditorProps {
  content: string
  onChange: (value: string) => void
  onStatsChange?: (stats: { words: number; chars: number }) => void
  className?: string
}

const FONT_SIZE_MAP = [
  { label: '初号', value: '56' }, { label: '小初', value: '48' },
  { label: '一号', value: '34' }, { label: '小一', value: '32' },
  { label: '二号', value: '29' }, { label: '小二', value: '24' },
  { label: '三号', value: '21' }, { label: '小三', value: '20' },
  { label: '四号', value: '18' }, { label: '小四', value: '16' },
  { label: '五号', value: '14' }, { label: '小五', value: '12' },
  { label: '12', value: '12' }, { label: '14', value: '14' },
  { label: '16', value: '16' }, { label: '18', value: '18' },
  { label: '24', value: '24' }, { label: '36', value: '36' },
  { label: '48', value: '48' }, { label: '72', value: '72' },
];
const SORTED_FONT_SIZES = Array.from(new Set(FONT_SIZE_MAP.map(i => parseInt(i.value)))).sort((a, b) => a - b);

// --- MenuBar ---
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
      className={cn("w-3.5 h-3.5 rounded-full border border-slate-200 hover:scale-110 transition-transform", editor.isActive('textStyle', { color }) && "ring-2 ring-offset-1 ring-slate-400")}
      style={{ backgroundColor: color }}
      title={color}
    />
  )
  const currentSizeVal = editor.getAttributes('textStyle').fontSize || '16';
  const adjustFontSize = (step: number) => {
    const current = parseInt(currentSizeVal);
    const currentIndex = SORTED_FONT_SIZES.indexOf(current);
    let nextIndex = currentIndex + step;
    if (currentIndex === -1) {
        const nearest = SORTED_FONT_SIZES.reduce((prev, curr) => Math.abs(curr - current) < Math.abs(prev - current) ? curr : prev);
        nextIndex = SORTED_FONT_SIZES.indexOf(nearest) + step;
    }
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= SORTED_FONT_SIZES.length) nextIndex = SORTED_FONT_SIZES.length - 1;
    editor.chain().focus().setFontSize(String(SORTED_FONT_SIZES[nextIndex])).run();
  }

  return (
    <div className="flex flex-wrap items-center px-4 py-2 bg-[#F9FAFB] border-b border-slate-200 sticky top-0 z-30 shadow-sm select-none">
      <div className="flex gap-0.5">
        <button onClick={() => editor.chain().focus().undo().run()} className={btnClass()}><Undo size={14}/></button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btnClass()}><Redo size={14}/></button>
      </div>
      <Divider />
      <div className="flex items-center gap-2 mr-2">
         <div className="relative group">
             <select className="h-7 text-xs font-medium border border-slate-300 rounded px-2 bg-white text-slate-700 focus:outline-none focus:border-indigo-500 hover:bg-slate-50 cursor-pointer appearance-none pr-6 min-w-[80px]" onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} value={editor.getAttributes('textStyle').fontFamily || ''}>
                <option value="" disabled>字体</option><option value="SimSun">宋体</option><option value="SimHei">黑体</option><option value="KaiTi">楷体</option><option value="FangSong">仿宋</option><option value="Arial">Arial</option><option value="Times New Roman">Times New Roman</option>
             </select>
             <ChevronDown className="absolute right-1.5 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
         </div>
         <div className="relative group">
             <select className="h-7 text-xs font-medium border border-slate-300 rounded px-1 bg-white text-slate-700 focus:outline-none focus:border-indigo-500 hover:bg-slate-50 cursor-pointer appearance-none pr-5 min-w-[60px] text-center" onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()} value={currentSizeVal}>
                <optgroup label="中文字号">{FONT_SIZE_MAP.filter(i => !/^\d+$/.test(i.label)).map(item => (<option key={item.label} value={item.value}>{item.label}</option>))}</optgroup>
                <optgroup label="数字字号">{FONT_SIZE_MAP.filter(i => /^\d+$/.test(i.label)).map(item => (<option key={item.label} value={item.value}>{item.label}</option>))}</optgroup>
             </select>
             <ChevronDown className="absolute right-1 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
         </div>
         <div className="flex border border-slate-300 rounded overflow-hidden h-7 bg-white">
            <button onClick={() => adjustFontSize(1)} className="px-2 hover:bg-slate-100 text-slate-600 border-r border-slate-200 flex items-center justify-center active:bg-slate-200"><span className="text-[14px] font-bold">A</span><Plus size={8} className="-mt-1 -ml-0.5"/></button>
            <button onClick={() => adjustFontSize(-1)} className="px-2 hover:bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200"><span className="text-[10px] font-bold">A</span><MinusIcon size={8} className="-mt-1 -ml-0.5"/></button>
         </div>
      </div>
      <div className="flex items-center gap-1.5 mr-2 px-2 py-1.5 bg-white border border-slate-200 rounded-md">
         <ColorButton color="#000000" /><ColorButton color="#DC2626" /><ColorButton color="#2563EB" /><ColorButton color="#16A34A" />
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

// --- StatusBar ---
const StatusBar = ({ editor, wordCount }: { editor: any, wordCount: number }) => {
  if (!editor) return null
  return (
    <div className="h-7 bg-[#F9FAFB] border-t border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 select-none z-40 relative">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 min-w-[60px]"><Type size={11} /><span className="font-medium text-slate-700">{wordCount} 字</span></span>
        <span className="w-[1px] h-3 bg-slate-300" /><span>中文(简体)</span>
      </div>
      <div className="flex items-center gap-1.5"><Cloud size={11} className="text-green-600" /><span className="text-green-600 font-medium">已保存</span></div>
    </div>
  )
}

// --- Main Editor ---
export default function Editor({ content, onChange, onStatsChange, className }: EditorProps) {
  const [isPolishing, setIsPolishing] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: { keepMarks: true }, orderedList: { keepMarks: true }, history: { depth: 100 } }),
      // ✨ 关键修复：确保 Placeholder 不会挡住光标
      Placeholder.configure({
        placeholder: ({ node }) => {
            if (node.type.name === 'heading') return '输入标题...'
            return "在此输入内容，或输入 '/' 唤起菜单..." 
        },
        emptyEditorClass: 'is-editor-empty relative before:content-[attr(data-placeholder)] before:text-slate-300 before:absolute before:left-0 before:top-0 before:pointer-events-none before:h-full',
      }),
      // ✨ 关键修复：配置 Slash Command
      SlashCommand.configure({
        suggestion: {
          items: getSuggestionItems,
          render: renderSuggestion,
        },
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
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />AI 润色
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
                     <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /><span>AI 正在思考...</span>
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
        /* Slash Menu Animation */
        .tippy-box[data-animation=fade] { opacity: 0; transition-property: opacity; }
        .tippy-box[data-animation=fade][data-state=visible] { opacity: 1; }
      `}</style>
    </div>
  )
}