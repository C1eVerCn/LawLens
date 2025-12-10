'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css' 
import { cn } from "@/lib/utils"

// ✅ 终极修复方案
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill");
    
    // 关键步骤 1: 定义一个组件包装器，接收任意 props (any)
    return function ReactQuillWrapper(props: any) {
      // 关键步骤 2: 将导入的 RQ 强制转为 any
      // 这告诉 TypeScript: "别检查这个组件的构造函数类型了，直接渲染它"
      const Quill = RQ as any;
      return <Quill {...props} />;
    };
  },
  { 
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center text-slate-400">编辑器加载中...</div>
  }
)

interface EditorProps {
  content: string
  onChange: (value: string) => void
  className?: string
}

export default function Editor({ content, onChange, className }: EditorProps) {
  
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }], 
      ['bold', 'italic', 'underline'], 
      [{ 'color': [] }, { 'background': [] }], 
      [{ 'align': [] }], 
      [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
      [{ 'indent': '-1'}, { 'indent': '+1' }], 
      ['clean'] 
    ]
  }), [])

  return (
    <div className={cn("flex flex-col h-full bg-white relative", className)}>
      <style jsx global>{`
        .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid #f1f5f9 !important;
          background: #f8fafc;
          border-radius: 8px 8px 0 0;
          padding: 8px !important;
        }
        .ql-container {
          border: none !important;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden; 
        }
        .ql-editor {
          flex: 1;
          overflow-y: auto;
          padding: 32px 40px;
          font-family: "Songti SC", "SimSun", "STSong", serif;
          font-size: 16px;
          line-height: 1.8;
          color: #1e293b;
        }
        .ql-editor strong, .ql-editor b {
          font-weight: 700 !important;
          color: #000;
        }
      `}</style>

      <ReactQuill 
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        className="h-full flex flex-col"
        placeholder="在此输入案情，或点击左侧按钮生成文书..."
      />
    </div>
  )
}