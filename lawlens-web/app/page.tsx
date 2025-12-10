'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import { User } from '@supabase/supabase-js' 
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Scale, History, Download, LogOut, Zap, Sparkles, 
  ArrowUp, BookOpen, LayoutDashboard, Settings, 
  User as UserIcon, Bot, ChevronLeft, Search, FileText
} from 'lucide-react'

import { exportToWord } from '@/lib/export'
import Editor from '@/components/editor'
import { Button } from '@/components/ui/button'
import { LEGAL_TEMPLATES } from '@/lib/templates' 
import Link from 'next/link'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface HistoryItem { id: number; title: string; content: string; created_at: string; }
interface Message { role: 'user' | 'assistant'; content: string; }

function MainContent() {
  const searchParams = useSearchParams()
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'draft' | 'polish'>('draft')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [user, setUser] = useState<User | null>(null)
  
  // ✨ 新增：从 Editor 接收精准字数
  const [stats, setStats] = useState({ words: 0, chars: 0 })

  // Auth & Init
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const templateId = searchParams.get('template')
    if (templateId) fillTemplate(templateId)
  }, [searchParams])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isAnalyzing])
  useEffect(() => { if (showHistory) fetchHistory() }, [showHistory, user])

  const fetchHistory = async () => {
    try {
      const url = new URL(`${API_BASE_URL}/api/history`)
      if (user) url.searchParams.append('user_id', user.id)
      const res = await fetch(url.toString())
      if (res.ok) setHistoryList(await res.json())
    } catch (error) { console.error(error) }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null) }

  const saveDocument = async (currentContent: string) => {
    try {
      const title = currentContent.slice(0, 20).replace(/<[^>]+>/g, '') || "未命名文档"
      await fetch(`${API_BASE_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: currentContent, user_id: user?.id || null }),
      })
    } catch (e) { console.error(e) }
  }

  const fillTemplate = (id: string) => {
    const template = LEGAL_TEMPLATES.find(t => t.id === id)
    if (template) {
      setContent(template.content)
      setMode('polish') 
      setMessages(prev => [...prev, { role: 'assistant', content: `已加载【${template.title}】模版，准备就绪。` }])
    }
  }

  const loadHistoryItem = (item: HistoryItem) => {
    setContent(item.content)
    setShowHistory(false)
    setMessages(prev => [...prev, { role: 'assistant', content: `已恢复历史版本：${item.title}` }])
  }

  const handleSend = async () => {
    if (!input.trim() || isAnalyzing) return
    const newMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    setIsAnalyzing(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], current_doc: content, mode: mode }),
      })

      if (!response.ok) throw new Error("API Error")
      const reader = response.body!.getReader()
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
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 网络请求失败，请检查服务状态。" }])
    } finally { setIsAnalyzing(false) }
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden">
      
      {/* 1. 极简侧边栏 (Dark) */}
      <aside className="w-[64px] bg-[#1C1C1E] flex flex-col items-center py-6 gap-6 z-40 shrink-0 border-r border-white/5">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
          <Scale className="w-5 h-5 text-white" />
        </div>
        <nav className="flex-1 flex flex-col gap-6 w-full items-center pt-6">
           <NavItem icon={<LayoutDashboard />} label="工作台" active />
           <Link href="/templates"><NavItem icon={<BookOpen />} label="模版" /></Link>
           <NavItem icon={<History />} label="历史" onClick={() => setShowHistory(true)} />
        </nav>
        <div className="flex flex-col gap-5 pb-6">
           {user ? (
             <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold ring-2 ring-white/10 hover:ring-white/30 transition-all">{user.email?.[0].toUpperCase()}</button>
           ) : (
             <Link href="/auth"><NavItem icon={<UserIcon />} label="登录" /></Link>
           )}
           <NavItem icon={<Settings />} label="设置" />
        </div>
      </aside>

      {/* 2. AI 助手面板 (Pro Design) */}
      <div className="w-[380px] flex flex-col bg-white border-r border-slate-200 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
         {/* Header */}
         <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Bot size={18} />
               </div>
               <span className="font-bold text-slate-800 text-sm tracking-tight">LawLens AI</span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setMode('draft')} className={cn("px-3 py-1 text-[11px] font-bold rounded-[4px] transition-all", mode === 'draft' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>起草</button>
                <button onClick={() => setMode('polish')} className={cn("px-3 py-1 text-[11px] font-bold rounded-[4px] transition-all", mode === 'polish' ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>润色</button>
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAFA] scroll-smooth">
            {messages.length === 0 && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-slate-900 font-bold mb-2">有什么可以帮您？</h3>
                    <p className="text-xs text-slate-500 mb-6 px-8 leading-relaxed">基于 RAG 检索增强技术，为您引用最新法条与真实案例。</p>
                    <div className="space-y-2.5 px-2">
                        {['起草一份房屋租赁合同', '生成催款律师函', '优化当前条款风险'].map((t, i) => (
                            <button key={i} onClick={() => t.includes('优化') ? setInput('优化这段') : fillTemplate('civil-loan')} 
                                className="w-full text-left px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:border-indigo-400 hover:shadow-md transition-all group flex items-center justify-between">
                                <span>{t}</span>
                                <ArrowUp className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-500" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="space-y-6">
                {messages.map((m, i) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={cn(
                            "max-w-[88%] px-4 py-3 text-sm leading-relaxed shadow-sm",
                            m.role === 'user' 
                                ? "bg-[#1A1A1A] text-white rounded-[18px] rounded-br-[4px]" 
                                : "bg-white border border-slate-200 text-slate-800 rounded-[18px] rounded-bl-[4px]"
                        )}>
                           <div className="whitespace-pre-wrap font-sans text-[13px]">{m.content}</div>
                        </div>
                    </motion.div>
                ))}
                {isAnalyzing && (
                    <div className="flex gap-2 items-center text-xs text-slate-400 px-2 mt-2">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" /> 
                        <span className="animate-pulse">正在检索民法典...</span>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
         </div>

         {/* Input Area */}
         <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative group">
                <textarea 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="输入法律需求..."
                    className="w-full pl-4 pr-12 py-3.5 min-h-[52px] max-h-32 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm resize-none outline-none transition-all placeholder:text-slate-400 shadow-sm"
                />
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || isAnalyzing}
                    className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:grayscale transition-all">
                    <ArrowUp className="w-4 h-4" />
                </Button>
            </div>
         </div>
      </div>

      {/* 3. 主工作区 (Word Canvas) */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#F2F4F7]">
         {/* Top Bar */}
         <header className="h-16 flex items-center justify-between px-8 bg-[#F2F4F7] shrink-0">
             <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 tracking-tight">未命名法律文书</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">草稿</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                    {stats.words} 字 · {stats.chars} 字符 · 自动保存
                </span>
             </div>
             <div className="flex items-center gap-3">
                 <Button variant="ghost" size="sm" onClick={() => content && exportToWord(content, 'LegalDoc.docx')} 
                    className="text-slate-600 hover:bg-white hover:shadow-sm transition-all h-9 px-4 rounded-lg bg-white/50 border border-transparent hover:border-slate-200">
                    <Download className="w-4 h-4 mr-2" /> 导出 Word
                 </Button>
                 <Button size="sm" className="bg-[#1A1A1A] hover:bg-black text-white h-9 px-5 rounded-lg shadow-lg shadow-black/10 transition-all font-bold tracking-wide">
                    分享
                 </Button>
             </div>
         </header>

         {/* Editor Wrapper - 这里的 padding 配合 Editor 的阴影实现悬浮感 */}
         <div className="flex-1 overflow-y-auto px-8 pb-8 flex justify-center scroll-smooth">
             <div className="w-fit my-2 animate-in fade-in zoom-in-95 duration-500">
                <Editor 
                    content={content} 
                    onChange={setContent} 
                    onStatsChange={setStats} // ✨ 传递统计数据
                />
             </div>
         </div>
      </main>

      {/* History Slide Over */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 350, damping: 35 }} className="fixed inset-y-0 right-0 w-[340px] bg-white shadow-2xl z-[70] flex flex-col border-l border-slate-100">
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-lg">版本历史</h3>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {historyList.map((item) => (
                  <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-500/50 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="font-bold text-slate-800 text-sm mb-1.5 line-clamp-1">{item.title}</div>
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>{new Date(item.created_at).toLocaleString()}</span>
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

function NavItem({ icon, label, active, onClick }: any) {
    return (
        <div className="group relative flex justify-center w-full cursor-pointer" onClick={onClick}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300", active ? "bg-white text-black" : "text-slate-500 hover:text-slate-200 hover:bg-white/10")}>
                {icon}
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl border border-white/20">
                {label}
            </span>
        </div>
    )
}

export default function Home() {
  return <Suspense fallback={null}><MainContent /></Suspense>
}