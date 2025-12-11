'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import { User } from '@supabase/supabase-js' 
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldCheck, History, Download, Zap, Sparkles, 
  ArrowUp, BookOpen, LayoutDashboard, Settings, 
  User as UserIcon, BrainCircuit, ChevronLeft,
  X, CheckCircle, Lock, Palette
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

// --- 设置弹窗组件 ---
const SettingsModal = ({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: User | null }) => {
  if (!isOpen) return null;
  const tabs = [
    { id: 'general', label: '通用设置', icon: <Settings size={14} /> },
    { id: 'account', label: '账号安全', icon: <Lock size={14} /> },
    { id: 'ai', label: 'AI 偏好', icon: <BrainCircuit size={14} /> },
    { id: 'theme', label: '外观', icon: <Palette size={14} /> },
  ]
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">系统设置</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-slate-50 border-r border-slate-100 p-3 flex flex-col gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-all text-left",
                  activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 border-b pb-2">导出设置</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">默认导出格式</span>
                  <select className="text-xs border rounded p-1"><option>Word (.docx)</option><option>PDF (.pdf)</option></select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">自动保存间隔</span>
                  <select className="text-xs border rounded p-1"><option>30秒</option><option>1分钟</option><option>5分钟</option></select>
                </div>
              </div>
            )}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 border-b pb-2">当前账号</h4>
                {user ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-medium text-slate-700">已登录邮箱</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{user.email}</p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">未登录，请先登录以同步数据。</div>
                )}
              </div>
            )}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 border-b pb-2">模型配置</h4>
                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-md">
                  当前正在使用 <b>LawLens Pro (Qwen-Max)</b> 法律专用模型。
                </div>
                <div className="flex items-center gap-2">
                   <input type="checkbox" checked readOnly className="rounded text-indigo-600" />
                   <span className="text-xs text-slate-700">开启联网检索 (RAG)</span>
                </div>
                <div className="flex items-center gap-2">
                   <input type="checkbox" checked readOnly className="rounded text-indigo-600" />
                   <span className="text-xs text-slate-700">总是显示思维链</span>
                </div>
              </div>
            )}
             {activeTab === 'theme' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 border-b pb-2">界面风格</h4>
                <div className="grid grid-cols-2 gap-3">
                   <div className="border-2 border-indigo-500 rounded-lg p-3 bg-white text-center text-xs font-medium text-indigo-600">默认 (专业白)</div>
                   <div className="border border-slate-200 rounded-lg p-3 bg-slate-900 text-center text-xs font-medium text-white opacity-50 cursor-not-allowed">深色模式 (开发中)</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
           <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50">取消</button>
           <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 shadow-sm">保存更改</button>
        </div>
      </div>
    </div>
  )
}

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
  const [showSettings, setShowSettings] = useState(false)
  const [notification, setNotification] = useState<{msg: string, color: string} | null>(null)
  
  // 状态保留但不再用于渲染，避免重复渲染
  const [stats, setStats] = useState({ words: 0, chars: 0 })

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

  // 模式切换的视觉反馈
  const switchMode = (newMode: 'draft' | 'polish') => {
    setMode(newMode)
    const msg = newMode === 'draft' ? "已切换至【起草模式】：适合从零生成文档" : "已切换至【润色模式】：适合修改现有条款"
    const color = newMode === 'draft' ? "bg-indigo-600" : "bg-purple-600"
    
    // 显示通知
    setNotification({ msg, color })
    setTimeout(() => setNotification(null), 3000)
  }

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
      switchMode('polish') 
      setMessages(prev => [...prev, { role: 'assistant', content: `已加载【${template.title}】，准备就绪。` }])
    }
  }

  const loadHistoryItem = (item: HistoryItem) => {
    setContent(item.content)
    setShowHistory(false)
    setMessages(prev => [...prev, { role: 'assistant', content: `已回溯至：${item.title}` }])
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
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 连接中断，请重试。" }])
    } finally { setIsAnalyzing(false) }
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden">
      
      {/* 1. 侧边栏 */}
      <aside className="w-[60px] bg-[#1C1C1E] flex flex-col items-center py-6 gap-6 z-40 shrink-0 border-r border-white/5">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <ShieldCheck className="w-6 h-6 text-white" />
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
           <NavItem icon={<Settings />} label="设置" onClick={() => setShowSettings(true)} />
        </div>
      </aside>

      {/* 2. AI 面板 */}
      <div className="w-[360px] flex flex-col bg-white border-r border-slate-200 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative">
         
         {/* 模式切换通知条 */}
         <AnimatePresence>
            {notification && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={cn("absolute top-16 inset-x-0 p-2 z-50 pointer-events-none flex justify-center")}
                >
                    <div className={cn("px-4 py-2 rounded-full shadow-lg text-white text-xs font-medium flex items-center gap-2", notification.color)}>
                        <CheckCircle size={14} /> {notification.msg}
                    </div>
                </motion.div>
            )}
         </AnimatePresence>

         <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
               <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <BrainCircuit size={16} />
               </div>
               <span className="font-bold text-slate-800 text-sm">LawLens AI</span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg scale-90 origin-right">
                <button onClick={() => switchMode('draft')} className={cn("px-3 py-1 text-[11px] font-bold rounded-[4px] transition-all", mode === 'draft' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>起草</button>
                <button onClick={() => switchMode('polish')} className={cn("px-3 py-1 text-[11px] font-bold rounded-[4px] transition-all", mode === 'polish' ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>润色</button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAFA] scroll-smooth">
            {messages.length === 0 && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-slate-900 font-bold mb-2 text-sm">AI 法律助理</h3>
                    <p className="text-xs text-slate-500 mb-6 px-8 leading-relaxed">基于 RAG 引擎，引用最新《民法典》案例。</p>
                    <div className="space-y-2.5 px-2">
                        {['起草房屋租赁合同', '生成催款律师函', '优化选中条款'].map((t, i) => (
                            <button key={i} onClick={() => t.includes('优化') ? setInput('优化这段') : fillTemplate('civil-loan')} 
                                className="w-full text-left px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-indigo-400 hover:shadow-md transition-all group flex items-center justify-between">
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
                            "max-w-[88%] px-4 py-3 text-[13px] leading-relaxed shadow-sm",
                            m.role === 'user' 
                                ? "bg-[#1A1A1A] text-white rounded-[16px] rounded-br-[2px]" 
                                : "bg-white border border-slate-200 text-slate-800 rounded-[16px] rounded-bl-[2px]"
                        )}>
                           <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                        </div>
                    </motion.div>
                ))}
                {isAnalyzing && (
                    <div className="flex gap-2 items-center text-xs text-slate-400 px-2 mt-2">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" /> 
                        <span className="animate-pulse">AI 正在检索判例...</span>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
         </div>

         <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative group">
                <textarea 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="输入法律需求..."
                    className="w-full pl-4 pr-12 py-3.5 min-h-[52px] max-h-32 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-xs resize-none outline-none transition-all placeholder:text-slate-400 shadow-sm"
                />
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || isAnalyzing}
                    className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:grayscale transition-all">
                    <ArrowUp className="w-4 h-4" />
                </Button>
            </div>
         </div>
      </div>

      {/* 3. 编辑区 */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#F2F4F7]">
         <header className="h-16 flex items-center justify-between px-8 bg-[#F2F4F7] shrink-0">
             <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700 tracking-tight">未命名法律文书</span>
                <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-medium shadow-sm">自动保存中</span>
             </div>
             <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => content && exportToWord(content, 'LegalDoc.docx')} className="h-8 text-slate-600 border-slate-200 hover:bg-white text-xs shadow-sm bg-white">
                    <Download className="w-3.5 h-3.5 mr-2" /> 导出 Word
                 </Button>
                 <Button size="sm" className="bg-[#1A1A1A] hover:bg-black text-white h-8 px-4 rounded-md shadow-lg shadow-black/10 font-medium text-xs">
                    分享
                 </Button>
             </div>
         </header>

         {/* Editor Container */}
         <div className="flex-1 overflow-y-auto px-4 pb-8 flex justify-center scroll-smooth bg-[#F2F4F7]">
             <div className="w-full flex justify-center my-2 animate-in fade-in zoom-in-95 duration-300">
                <Editor content={content} onChange={setContent} onStatsChange={setStats} />
             </div>
         </div>
      </main>

      {/* History Slide Over */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 350, damping: 35 }} className="fixed inset-y-0 right-0 w-[340px] bg-white shadow-2xl z-[70] flex flex-col border-l border-slate-100">
              <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm">版本历史</h3>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {historyList.map((item) => (
                  <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-3 rounded-lg border border-slate-100 hover:border-indigo-500/50 hover:bg-indigo-50/10 cursor-pointer transition-all">
                    <div className="font-medium text-slate-800 text-xs mb-1 truncate">{item.title}</div>
                    <div className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} />
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: any) {
    return (
        <div className="group relative flex justify-center w-full cursor-pointer" onClick={onClick}>
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300", active ? "bg-white text-black" : "text-slate-500 hover:text-slate-200 hover:bg-white/10")}>
                {icon}
            </div>
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl border border-white/20">
                {label}
            </span>
        </div>
    )
}

export default function Home() {
  return <Suspense fallback={null}><MainContent /></Suspense>
}