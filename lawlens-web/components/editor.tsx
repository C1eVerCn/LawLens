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
// ✨ P3: 引入 Diff 算法库
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from 'diff-match-patch'

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { cn } from "@/lib/utils"
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo, Redo, Highlighter, 
  Table as TableIcon, Quote, Sparkles, Loader2, Minus, 
  Type, Cloud, ChevronDown, Plus, Minus as MinusIcon,
  Heading1, Heading2, Heading3, Check, X, Copy, Wand2,
  GitCompare, // ✨ P3 图标
  BookTemplate // ✨ P6 图标
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// ✨ P6: 定义常用法律条款库 (为了方便直接定义在这里，也可以放在 lib/templates.ts)
const STANDARD_CLAUSES = [
  {
    title: '不可抗力条款',
    desc: '标准免责声明',
    content: '<p><strong>第X条 不可抗力</strong></p><p>1. “不可抗力”是指所有非受不可抗力影响的一方无法控制的、不可预见、不能避免并无法克服的事件。该事件包括但不限于政府行为、自然灾害、战争、敌对行为或动乱、流行病等。</p><p>2. 出现不可抗力事件时，知情方应及时、充分地以书面形式通知对方，并告知该类事件对本协议可能产生的影响。</p>'
  },
  {
    title: '保密义务条款',
    desc: '严格保密约定',
    content: '<p><strong>第X条 保密义务</strong></p><p>双方确认，在签署、履行本协议过程中知悉的对方的商业秘密（包括但不限于财务数据、客户名单、技术资料等）均属于保密信息。未经对方书面同意，任何一方不得向第三方披露。保密期限不受本协议效力终止的影响。</p>'
  },
  {
    title: '争议解决条款',
    desc: '诉讼管辖约定',
    content: '<p><strong>第X条 争议解决</strong></p><p>因履行本合同所发生的或与本合同有关的一切争议，双方应首先通过友好协商解决。协商不成的，任何一方均有权向<strong>原告住所地人民法院</strong>提起诉讼。</p>'
  },
  {
    title: '违约责任条款',
    desc: '通用赔偿规则',
    content: '<p><strong>第X条 违约责任</strong></p><p>任何一方违反本合同约定的，应赔偿因此给守约方造成的全部损失，包括但不限于直接经济损失、预期利益损失以及守约方为维权支付的律师费、诉讼费、公证费、差旅费等。</p>'
  }
]

// ✨ P3: Diff 生成工具函数
const generateDiffHtml = (oldText: string, newText: string) => {
  const dmp = new diff_match_patch()
  const diffs = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diffs)

  let html = ''
  diffs.forEach(([type, text]) => {
    // 简单的 HTML 转义，防止注入
    const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (type === DIFF_DELETE) {
      // 红色删除线
      html += `<span style="background-color: #fee2e2; color: #dc2626; text-decoration: line-through; padding: 0 2px; border-radius: 2px;">${safeText}</span>`
    } else if (type === DIFF_INSERT) {
      // 绿色新增
      html += `<span style="background-color: #dcfce7; color: #166534; font-weight: bold; padding: 0 2px; border-radius: 2px;">${safeText}</span>`
    } else {
      // 原文
      html += `<span style="opacity: 0.7;">${safeText}</span>`
    }
  })
  return html
}

// ==========================================
// 1. Slash Command 配置 (完整保留 + P6 升级)
// ==========================================
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
    <div className="bg-black/70 backdrop-blur-2xl rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden min-w-[280px] p-2 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/5">
      <div className="text-[10px] font-bold text-white/40 px-3 py-1.5 uppercase tracking-widest mb-1 select-none flex items-center justify-between">
        <span>AI & 法律条款</span>
        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">TAB 切换</span>
      </div>
      
      <div className="max-h-[320px] overflow-y-auto pr-1 scrollbar-none">
        {props.items.map((item: any, index: number) => (
          <button
            key={index}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-left group",
              index === selectedIndex 
                ? "bg-white/20 text-white shadow-sm backdrop-brightness-150" 
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-[8px] border shadow-sm transition-all duration-200",
              index === selectedIndex 
                ? "bg-white text-black border-white scale-105" 
                : "bg-white/5 border-white/10 text-white/60 group-hover:bg-white/10 group-hover:text-white"
            )}>
              {item.icon}
            </div>
            
            <div className="flex flex-col gap-0.5">
               <span className={cn("font-medium tracking-wide", index === selectedIndex ? "text-white" : "text-white/90")}>
                 {item.title}
               </span>
               <span className={cn("text-[10px] line-clamp-1", index === selectedIndex ? "text-white/80" : "text-white/40")}>
                 {item.desc}
               </span>
            </div>
            
            {index === selectedIndex && (
                <div className="ml-auto text-[10px] text-white/50 bg-black/20 px-1.5 py-0.5 rounded">↵</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
})
CommandList.displayName = 'CommandList'

const getSuggestionItems = ({ query }: { query: string }) => {
  // 1. 基础命令
  const basicCommands = [
    {
      title: 'AI 智能续写',
      desc: '基于上下文自动生成后续内容',
      icon: <Sparkles className="w-4 h-4" />, 
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run()
        if (editor.storage.aiHandler?.continue) {
            editor.storage.aiHandler.continue()
        }
      },
    },
    { title: '一级标题', desc: '大标题', icon: <Heading1 className="w-4 h-4" />, command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() },
    { title: '二级标题', desc: '中标题', icon: <Heading2 className="w-4 h-4" />, command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() },
    { title: '三级标题', desc: '小标题', icon: <Heading3 className="w-4 h-4" />, command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run() },
    { title: '引用块', desc: '引用重点内容', icon: <Quote className="w-4 h-4" />, command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
    { title: '无序列表', desc: '圆点项目符号', icon: <List className="w-4 h-4" />, command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
    { title: '有序列表', desc: '数字编号列表', icon: <ListOrdered className="w-4 h-4" />, command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
    { title: '分割线', desc: '视觉分隔符', icon: <Minus className="w-4 h-4" />, command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  ]

  // 2. ✨ P6: 智能条款命令
  const clauseCommands = STANDARD_CLAUSES.map(clause => ({
    title: clause.title,
    desc: clause.desc,
    icon: <BookTemplate className="w-4 h-4" />, 
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertContent(clause.content).run()
    }
  }))

  return [...basicCommands, ...clauseCommands].filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
}

const renderSuggestion = () => {
  let component: ReactRenderer
  let popup: any

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(CommandList, { props, editor: props.editor })
      if (!props.clientRect) return
      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
        zIndex: 9999,
        arrow: false, 
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
      suggestion: { char: '/', command: ({ editor, range, props }: any) => props.command({ editor, range }) },
    }
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })]
  },
})

// --- 2. Font Size Extension (完整保留) ---
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

// --- 3. Constants & Helpers (完整保留) ---
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

// --- 4. MenuBar (完整保留) ---
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

// ==========================================
// 5. Main Editor Component (Vision Pro Edition)
// ==========================================
export default function Editor({ content, onChange, onStatsChange, className }: EditorProps) {
  // 核心状态：aiResult (生成的文字), isStreaming (是否在生成), showResult (是否展示结果页)
  const [aiResult, setAiResult] = useState('') 
  const [isStreaming, setIsStreaming] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  
  // ✨ P3: 红黑文对比状态
  const [diffHtml, setDiffHtml] = useState('')
  const [originalText, setOriginalText] = useState('')
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: { keepMarks: true }, orderedList: { keepMarks: true }, history: { depth: 100 } }),
      Placeholder.configure({
        placeholder: "在此输入内容，或输入 '/' 唤起 AI 助手...",
        emptyEditorClass: 'is-editor-empty relative before:content-[attr(data-placeholder)] before:text-slate-300 before:absolute before:left-0 before:top-0 before:pointer-events-none before:h-full',
      }),
      SlashCommand.configure({ suggestion: { items: getSuggestionItems, render: renderSuggestion } }),
      BubbleMenuExtension.configure({ 
        pluginKey: 'bubbleMenu',
        shouldShow: ({ from, to }) => {
            // 只要有选区，或者正在生成/展示结果，都保持显示
            return (from !== to) || isStreaming || showResult
        }
      }),
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

  // --- AI 续写逻辑 (Slash Command 调用) ---
  const handleAiContinuation = async () => {
    if (!editor) return
    const { from } = editor.state.selection
    const contextText = editor.state.doc.textBetween(Math.max(0, from - 2000), from, '\n')
    
    // 插入一个带有动画的占位符
    editor.chain().insertContent(`<span class="text-slate-400 italic animate-pulse">✨ AI 正在构思...</span>`).run()

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            messages: [{ role: 'user', content: `请续写：\n${contextText}` }], 
            mode: 'draft' 
        }),
      })

      if (!response.ok) throw new Error("API Error")
      
      // 删除占位符 (粗略估计长度)
      editor.commands.deleteRange({ from: editor.state.selection.from - 20, to: editor.state.selection.from }) 

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if(reader) {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value)
            if (!chunk.includes('<blockquote>')) {
                editor.commands.insertContent(chunk)
            }
          }
      }
    } catch (e) { alert("AI 服务异常") }
  }

  if (editor) { editor.storage.aiHandler = { continue: handleAiContinuation } }

  // --- AI 润色逻辑 (Bubble Menu 调用 - P3升级版) ---
  const handleAiPolishSelection = async () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selection = editor.state.doc.textBetween(from, to, ' ')
    if (!selection) return

    setOriginalText(selection) // ✨ 保存原文，用于 Diff
    setIsStreaming(true)
    setShowResult(false)
    setAiResult('') 

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: "润色" }], selection, mode: 'selection_polish' }),
      })

      if (!response.ok) throw new Error("API Error")
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      let fullText = ''
      if(reader) {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value)
            fullText += chunk
            setAiResult(prev => prev + chunk)
          }
      }
      
      // ✨ P3: 生成 Diff HTML
      const diff = generateDiffHtml(selection, fullText)
      setDiffHtml(diff)

      setIsStreaming(false)
      setShowResult(true)

    } catch (e) { 
        alert("AI 连接失败")
        setIsStreaming(false)
    } 
  }

  // 确认替换
  const applyAiResult = () => {
      editor?.chain().focus().deleteSelection().insertContent(aiResult).run()
      setShowResult(false)
      setAiResult('')
  }

  // 放弃修改
  const discardAiResult = () => {
      setShowResult(false)
      setAiResult('')
      editor?.commands.focus()
  }

  return (
    <div className={cn("flex flex-col w-full h-full relative rounded-none overflow-hidden bg-[#F2F4F7]", className)}>
      <MenuBar editor={editor} />

      {/* --- ✨ Vision Pro Style Bubble Menu ✨ --- */}
      {editor && (
        <BubbleMenu 
            editor={editor} 
            tippyOptions={{ 
                duration: 200, 
                zIndex: 999, 
                maxWidth: 600,
                placement: 'bottom-start',
                offset: [0, 10]
            }} 
            shouldShow={({ from, to }) => {
                return (from !== to) || isStreaming || showResult
            }}
        >
            <div className={cn(
                "flex flex-col overflow-hidden transition-all duration-300 ease-out origin-top-left",
                // 核心样式：黑色磨砂玻璃 + 深度阴影 + 细腻边框
                "bg-black/70 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] rounded-2xl text-white/90 ring-1 ring-white/5",
                isStreaming || showResult ? "min-w-[450px]" : "min-w-fit"
            )}>
                
                {/* 1. 生成态：流式打字机 */}
                {isStreaming && (
                    <div className="p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2.5 text-indigo-300 text-[11px] font-bold uppercase tracking-widest opacity-80">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            AI 正在润色...
                        </div>
                        <div className="text-[15px] leading-relaxed text-white/90 min-h-[40px] max-h-[300px] overflow-y-auto font-serif">
                            {aiResult}
                            <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse align-middle rounded-full" />
                        </div>
                    </div>
                )}

                {/* 2. 结果态：Diff 对比决策 (✨ P3) */}
                {!isStreaming && showResult && (
                    <div className="flex flex-col">
                        <div className="p-5 bg-white/5 border-b border-white/5 max-h-[300px] overflow-y-auto">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <GitCompare size={12} /> 修订对比视图
                                </span>
                                <div className="flex gap-2 text-[10px]">
                                    <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 bg-red-500/20 border border-red-500 rounded-sm line-through decoration-red-500">A</span> 删除</span>
                                    <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-2 bg-green-500/20 border border-green-500 rounded-sm">B</span> 新增</span>
                                </div>
                            </div>
                            {/* ✨ 渲染 Diff 结果 */}
                            <div 
                                className="text-[15px] leading-relaxed text-slate-300 font-serif whitespace-pre-wrap bg-black/20 p-3 rounded-lg border border-white/5" 
                                dangerouslySetInnerHTML={{ __html: diffHtml }} 
                            />
                        </div>
                        <div className="flex items-center p-2 gap-2 bg-black/40">
                            <button onClick={applyAiResult} className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl hover:bg-green-500/20 active:bg-green-500/30 text-green-400 text-xs font-bold transition-all shadow-sm">
                                <Check size={14} /> 采纳
                            </button>
                            <button onClick={() => navigator.clipboard.writeText(aiResult)} className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl hover:bg-white/10 active:bg-white/20 text-white/70 text-xs font-bold transition-all">
                                <Copy size={14} /> 复制
                            </button>
                            <button onClick={discardAiResult} className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl hover:bg-red-500/20 active:bg-red-500/30 text-red-300 hover:text-red-200 text-xs font-bold transition-all">
                                <X size={14} /> 放弃
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. 默认态：工具栏 */}
                {!isStreaming && !showResult && (
                    <div className="flex items-center gap-1 p-1.5">
                        <button onClick={handleAiPolishSelection} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all shadow-sm group border border-white/5">
                            <Wand2 className="w-3.5 h-3.5 text-indigo-300 group-hover:text-white transition-colors" />
                            AI 润色
                        </button>
                        <div className="w-[1px] h-4 bg-white/10 mx-1.5" />
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors", editor.isActive('bold') && 'text-indigo-300 bg-white/10')}><Bold size={15} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors", editor.isActive('italic') && 'text-indigo-300 bg-white/10')}><Italic size={15} /></button>
                        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors", editor.isActive('strike') && 'text-indigo-300 bg-white/10')}><Strikethrough size={15} /></button>
                        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors", editor.isActive('highlight') && 'text-amber-300 bg-white/10')}><Highlighter size={15} /></button>
                    </div>
                )}
            </div>
        </BubbleMenu>
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto cursor-text py-8 px-4 md:px-6 scroll-smooth bg-[#F2F4F7]" onClick={() => editor?.commands.focus()}>
             <EditorContent editor={editor} />
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
        /* AI 光标占位符样式 */
        .ai-cursor { display: inline-block; width: 2px; height: 1em; background-color: #6366f1; animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        /* 气泡菜单滚动条 */
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: transparent; } 
        ::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
      `}</style>
    </div>
  )
}