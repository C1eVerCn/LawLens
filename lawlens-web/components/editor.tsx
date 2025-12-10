'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// ✅ 核心修复：全部改为命名导入 (花括号)
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

import { useEffect } from 'react'
import { cn } from "@/lib/utils"
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, 
  Undo, Redo, Eraser, Highlighter, Link as LinkIcon,
  Table as TableIcon, Minus, Quote, Indent, Outdent
} from 'lucide-react'

interface EditorProps {
  content: string
  onChange: (value: string) => void
  className?: string
}

// --- 自定义工具栏组件 ---
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
    if (url === null) return // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-col border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
      
      {/* 第一行工具栏：常用操作 */}
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-slate-200/50">
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btn(false, !editor.can().undo())} title="撤销"><Undo className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btn(false, !editor.can().redo())} title="重做"><Redo className="w-4 h-4" /></button>
        
        {separator}
        
        {/* 字体选择 (模拟下拉框，这里简化为点击切换) */}
        <button 
            onClick={() => editor.chain().focus().setFontFamily('SimSun').run()} 
            className={cn(btn(editor.isActive('textStyle', { fontFamily: 'SimSun' })), "w-auto px-2 text-xs font-serif")}
        >宋体</button>
         <button 
            onClick={() => editor.chain().focus().setFontFamily('SimHei').run()} 
            className={cn(btn(editor.isActive('textStyle', { fontFamily: 'SimHei' })), "w-auto px-2 text-xs font-sans")}
        >黑体</button>

        {separator}

        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))} title="一级标题"><Heading1 className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} title="二级标题"><Heading2 className="w-4 h-4" /></button>
        
        {separator}

        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="加粗"><Bold className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="斜体"><Italic className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="下划线"><UnderlineIcon className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} title="删除线"><Strikethrough className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btn(editor.isActive('highlight'))} title="高亮"><Highlighter className="w-4 h-4 text-yellow-500" /></button>

        {separator}
        
        {/* 颜色选择器 */}
        <div className="flex items-center gap-1 mx-1">
          <button onClick={() => editor.chain().focus().setColor('#000000').run()} className="w-4 h-4 rounded-full bg-black border border-slate-300 hover:scale-110" title="黑色" />
          <button onClick={() => editor.chain().focus().setColor('#ef4444').run()} className="w-4 h-4 rounded-full bg-red-600 border border-slate-300 hover:scale-110" title="红色" />
          <button onClick={() => editor.chain().focus().setColor('#2563eb').run()} className="w-4 h-4 rounded-full bg-blue-600 border border-slate-300 hover:scale-110" title="蓝色" />
        </div>
      </div>

      {/* 第二行工具栏：段落与插入 */}
      <div className="flex flex-wrap gap-0.5 p-1.5 bg-slate-50/50">
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btn(editor.isActive({ textAlign: 'left' }))}><AlignLeft className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btn(editor.isActive({ textAlign: 'center' }))}><AlignCenter className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btn(editor.isActive({ textAlign: 'right' }))}><AlignRight className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btn(editor.isActive({ textAlign: 'justify' }))}><AlignJustify className="w-4 h-4" /></button>

        {separator}

        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}><List className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}><ListOrdered className="w-4 h-4" /></button>
        
        {/* 缩进操作 */}
        <button onClick={() => editor.chain().focus().sinkListItem('listItem').run()} disabled={!editor.can().sinkListItem('listItem')} className={btn(false, !editor.can().sinkListItem('listItem'))} title="增加缩进"><Indent className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().liftListItem('listItem').run()} disabled={!editor.can().liftListItem('listItem')} className={btn(false, !editor.can().liftListItem('listItem'))} title="减少缩进"><Outdent className="w-4 h-4" /></button>

        {separator}

        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="引用"><Quote className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn()} title="分割线"><Minus className="w-4 h-4" /></button>
        <button onClick={setLink} className={btn(editor.isActive('link'))} title="超链接"><LinkIcon className="w-4 h-4" /></button>
        
        {separator}

        {/* 表格操作 */}
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btn()} title="插入表格"><TableIcon className="w-4 h-4" /></button>
        {editor.isActive('table') && (
            <>
                <button onClick={() => editor.chain().focus().deleteTable().run()} className={cn(btn(), "text-red-500")} title="删除表格"><Eraser className="w-4 h-4" /></button>
            </>
        )}

        <div className="flex-1" />
        <button onClick={() => editor.chain().focus().unsetAllMarks().run()} className={btn()} title="清除格式"><Eraser className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

// --- 主编辑器组件 ---
export default function Editor({ content, onChange, className }: EditorProps) {
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      HorizontalRule,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    editorProps: {
      attributes: {
        // Tailwind 样式模拟 A4 纸
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none min-h-[800px] px-12 py-10 font-serif text-slate-800 leading-loose max-w-none shadow-sm',
      },
    },
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    immediatelyRender: false 
  })

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

  return (
    <div className={cn("flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden relative", className)}>
      <MenuBar editor={editor} />
      
      <div className="flex-1 overflow-y-auto bg-slate-100/50 cursor-text p-4 flex justify-center" onClick={() => editor?.commands.focus()}>
        {/* 模拟 A4 纸居中 */}
        <div className="bg-white w-full max-w-[850px] min-h-[800px] shadow-sm border border-slate-200">
             <EditorContent editor={editor} className="h-full" />
        </div>
      </div>

      <style jsx global>{`
        /* --- 法律文书专用样式 --- */
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