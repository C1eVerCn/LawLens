'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import { User } from '@supabase/supabase-js' 
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Scale, History, Download, ChevronRight, X, Clock,
  LogOut, Zap, Sparkles, Send, FileText, ArrowRightCircle, BookOpen,
  LayoutDashboard, Settings, User as UserIcon
} from 'lucide-react'

import { exportToWord } from '@/lib/export'
import Editor from '@/components/editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LEGAL_TEMPLATES } from '@/lib/templates' 
import Link from 'next/link'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface HistoryItem {
  id: number; title: string; content: string; created_at: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function MainContent() {
  const searchParams = useSearchParams()
  
  // --- 核心状态 (保持不变) ---
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'draft' | 'polish'>('draft')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [user, setUser] = useState<User | null>(null)

  // --- Auth & History 初始化逻辑 (保持不变) ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setHistoryList([]) 
    })
    return () => subscription.unsubscribe()
  }, [])

  // 加载模版参数 (保持不变)
  useEffect(() => {
    const templateId = searchParams.get('template')
    if (templateId) fillTemplate(templateId)
  }, [searchParams])

  // 滚动到底部 (保持不变)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 监听 sidebar 打开 (保持不变)
  useEffect(() => {
    if (showHistory) fetchHistory()
  }, [showHistory, user])

  // --- 业务逻辑函数 (保持不变) ---
  const fetchHistory = async () => {
    try {
      const url = new URL(`${API_BASE_URL}/api/history`)
      if (user) url.searchParams.append('user_id', user.id)
      const res = await fetch(url.toString())
      if (res.ok) {
        const data = await res.json()
        setHistoryList(data)
      }
    } catch (error) { console.error("获取历史失败", error) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const saveDocument = async (currentContent: string) => {
    try {
      const title = currentContent.slice(0, 20) + (currentContent.length > 20 ? '...' : '')
      await fetch(`${API_BASE_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: currentContent, user_id: user?.id || null }),
      })
    } catch (e) { console.error("保存失败", e) }
  }

  const fillTemplate = (id: string) => {
    const template = LEGAL_TEMPLATES.find(t => t.id === id)
    if (template) {
      setContent(template.content)
      setMode('polish') 
      setMessages(prev => [...prev, { role: 'assistant', content: `已为您加载【${template.title}】模版，请告诉我需要修改什么？` }])
    }
  }

  const loadHistoryItem = (item: HistoryItem) => {
    setContent(item.content)
    setShowHistory(false)
    setMessages(prev => [...prev, { role: 'assistant', content: `已加载历史文档：${item.title}` }])
  }

  const handleSend = async () => {
    if (!input.trim() || isAnalyzing) return
    const newMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    setIsAnalyzing(true)
    const aiMsgPlaceholder: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, aiMsgPlaceholder])

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMsg],
          current_doc: content,
          mode: mode
        }),
      })

      if (!response.ok) throw new Error("API Connection Error")
      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let fullText = ''

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value, { stream: true })
        fullText += chunkValue
        setMessages(prev => {
            const newArr = [...prev]
            newArr[newArr.length - 1] = { role: 'assistant', content: fullText }
            return newArr
        })
        setContent(fullText)
      }
      if (fullText.length > 10) saveDocument(fullText)
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 网络连接中断或服务器错误。" }])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const springAnim = { type: "spring" as const, stiffness: 300, damping: 30 }

  // --- 新的 JSX 布局结构 ---
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F3F4F6] text-slate-800 font-sans">
      
      {/* 1. 最左侧导航栏 (Slim Sidebar) */}
      <aside className="w-16 bg-slate-900 flex flex-col items-center py-6 gap-6 z-30 shrink-0">
        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/50">
          <Scale className="w-5 h-5 text-white" />
        </div>
        
        <nav className="flex-1 flex flex-col gap-4 w-full px-2">
           <NavItem icon={<LayoutDashboard />} label="工作台" active />
           <Link href="/templates" className="w-full"><NavItem icon={<BookOpen />} label="模版" /></Link>
           <NavItem icon={<History />} label="历史" onClick={() => setShowHistory(true)} />
        </nav>

        <div className="flex flex-col gap-4 w-full px-2 pb-2">
          {user ? (
            <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex justify-center" title="退出">
               <LogOut className="w-5 h-5" />
            </button>
          ) : (
             <Link href="/auth" className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex justify-center">
               <UserIcon className="w-5 h-5" />
             </Link>
          )}
        </div>
      </aside>

      {/* 2. 左侧面板：AI 助手 (Fixed Width) */}
      <div className="w-[360px] flex flex-col bg-white border-r border-slate-200 z-20 shadow-sm relative">
         {/* 顶部模式切换 */}
         <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-blue-600" /> AI 法律助手
            </h2>
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1 relative">
                <motion.div 
                    className="absolute top-1 bottom-1 bg-white rounded-md shadow-sm z-0"
                    layoutId="activeTab"
                    animate={{ left: mode === 'draft' ? 4 : '50%', width: 'calc(50% - 6px)' }}
                    transition={springAnim}
                />
                <button onClick={() => setMode('draft')} className={`flex-1 relative z-10 py-1.5 text-xs font-medium transition-colors ${mode === 'draft' ? 'text-slate-900' : 'text-slate-500'}`}>
                    起草
                </button>
                <button onClick={() => setMode('polish')} className={`flex-1 relative z-10 py-1.5 text-xs font-medium transition-colors ${mode === 'polish' ? 'text-slate-900' : 'text-slate-500'}`}>
                    润色
                </button>
            </div>
         </div>

         {/* 聊天内容区 */}
         <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
            <div className="space-y-4">
                {messages.length === 0 && (
                    <div className="mt-4 space-y-3">
                        <p className="text-xs text-slate-400 mb-2">常用指令：</p>
                        {[
                            { label: '起草一份借款合同', id: 'civil-loan' },
                            { label: '生成催款律师函', id: 'biz-letter' },
                            { label: '优化当前条款', id: 'polish-opt' }
                        ].map((t, i) => (
                            <button key={i} onClick={() => t.id === 'polish-opt' ? setInput('请优化这段内容') : fillTemplate(t.id)} className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg text-xs hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm">
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}
                
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed ${
                            m.role === 'user' 
                            ? 'bg-slate-900 text-white rounded-br-none' 
                            : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-sm'
                        }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                
                {isAnalyzing && messages.length > 0 && messages[messages.length-1].role === 'user' && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                        <Sparkles className="w-3 h-3 animate-spin" /> 正在思考...
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
         </div>

         {/* 底部输入框 */}
         <div className="p-3 border-t border-slate-200 bg-white">
            <div className="relative">
                <Input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="输入指令..."
                    className="pr-10 py-5 rounded-lg border-slate-200 bg-slate-50 text-sm focus:bg-white"
                />
                <Button size="icon" onClick={handleSend} disabled={isAnalyzing} className="absolute right-1 top-1 h-8 w-8 rounded-md bg-slate-900 hover:bg-slate-800">
                    <ArrowRightCircle className="w-4 h-4" />
                </Button>
            </div>
         </div>
      </div>

      {/* 3. 右侧工作区：编辑器 (Flexible Width) */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#F3F4F6]">
         {/* 顶部文档工具栏 */}
         <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
             <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="font-medium text-slate-800">未命名文档</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs">{content.length} 字</span>
             </div>
             <div className="flex items-center gap-3">
                 <Button variant="ghost" size="sm" onClick={() => content && exportToWord(content, 'LegalDoc.docx')} className="text-slate-600 hover:bg-slate-100 h-8">
                    <Download className="w-4 h-4 mr-2" /> 导出 Word
                 </Button>
                 <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 rounded-full shadow-sm shadow-blue-200">
                    分享
                 </Button>
             </div>
         </header>

         {/* 编辑器滚动容器 */}
         <div className="flex-1 overflow-y-auto p-8 flex justify-center scroll-smooth">
             {/* A4 纸容器 wrapper */}
             <div className="w-full max-w-[850px] pb-20">
                <Editor content={content} onChange={setContent} />
             </div>
         </div>
      </main>

      {/* 历史记录侧边栏 (Overlay) */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-[320px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4" /> 历史版本
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {!user && (
                   <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded mb-2">登录后可保存历史。</div>
                )}
                {historyList.map((item) => (
                  <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-3 rounded-lg border border-slate-100 bg-white hover:border-blue-500 hover:shadow-md cursor-pointer group transition-all">
                    <div className="font-medium text-slate-700 text-sm mb-1 truncate">{item.title}</div>
                    <div className="text-xs text-slate-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// 简单的侧边栏按钮组件
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label?: string, active?: boolean, onClick?: () => void }) {
    return (
        <button onClick={onClick} className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative",
            active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
        )}>
            {icon}
            {/* Tooltip 效果 */}
            {label && (
                <span className="absolute left-12 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {label}
                </span>
            )}
        </button>
    )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50">Loading LawLens...</div>}>
      <MainContent />
    </Suspense>
  )
}