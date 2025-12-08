'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import { User } from '@supabase/supabase-js' 
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Scale, History, Download, ChevronRight, X, Clock,
  LogOut, Zap, Sparkles, Send, FileText, ArrowRightCircle, BookOpen
} from 'lucide-react'

import { exportToWord } from '@/lib/export'
import Editor from '@/components/editor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
// ❌ 删除: import { ScrollArea } from '@/components/ui/scroll-area'
// ✅ 替换: 直接用 div 实现滚动
import { LEGAL_TEMPLATES } from '@/lib/templates' 
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_BASE_URL) console.error("⚠️ 警告: 未检测到后端 API 地址！");

interface HistoryItem {
  id: number; title: string; content: string; created_at: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function MainContent() {
  const searchParams = useSearchParams()
  
  // --- 核心状态 ---
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'draft' | 'polish'>('draft')
  
  // 聊天相关
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 历史记录与用户相关
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [user, setUser] = useState<User | null>(null)

  // --- 1. Auth & History 初始化逻辑 ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setHistoryList([]) 
    })
    return () => subscription.unsubscribe()
  }, [])

  // 加载模版参数
  useEffect(() => {
    const templateId = searchParams.get('template')
    if (templateId) {
      fillTemplate(templateId)
    }
  }, [searchParams])

  // 滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 获取历史记录
  const fetchHistory = async () => {
    try {
      const url = new URL(`${API_BASE_URL}/api/history`)
      if (user) url.searchParams.append('user_id', user.id)
      const res = await fetch(url.toString())
      if (res.ok) {
        const data = await res.json()
        setHistoryList(data)
      }
    } catch (error) {
      console.error("获取历史失败", error)
    }
  }

  // 监听 sidebar 打开
  useEffect(() => {
    if (showHistory) fetchHistory()
  }, [showHistory, user])

  // 退出登录
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // --- 2. 业务逻辑 ---

  // 保存文档
  const saveDocument = async (currentContent: string) => {
    try {
      const title = currentContent.slice(0, 20) + (currentContent.length > 20 ? '...' : '')
      await fetch(`${API_BASE_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          content: currentContent, 
          user_id: user?.id || null 
        }),
      })
    } catch (e) { console.error("保存失败", e) }
  }

  // 填充模版
  const fillTemplate = (id: string) => {
    const template = LEGAL_TEMPLATES.find(t => t.id === id)
    if (template) {
      setContent(template.content)
      setMode('polish') 
      setMessages(prev => [...prev, { role: 'assistant', content: `已为您加载【${template.title}】模版，请告诉我需要修改什么？` }])
    }
  }

  // 加载历史记录
  const loadHistoryItem = (item: HistoryItem) => {
    setContent(item.content)
    setShowHistory(false)
    setMessages(prev => [...prev, { role: 'assistant', content: `已加载历史文档：${item.title}` }])
  }

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isAnalyzing) return
    
    const newMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    setIsAnalyzing(true)

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

      if (!response.ok) throw new Error("API Error")
      const data = await response.json()
      
      const aiMsg: Message = { role: 'assistant', content: data.result }
      setMessages(prev => [...prev, aiMsg])
      
      if (data.result && !data.result.includes("抱歉")) {
          setContent(data.result)
          saveDocument(data.result) 
      }

    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 服务器连接失败，请检查 Python 后端。" }])
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ✅ 修复 2: 添加 `as const` 解决 TS 类型报错
  const springAnim = { type: "spring" as const, stiffness: 300, damping: 30 }

  return (
    <main className="h-screen bg-[#F0F2F5] text-slate-800 flex flex-col overflow-hidden relative font-sans">
      
      {/* --- 顶部导航 --- */}
      <nav className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-2">
           <div className="bg-slate-900 p-2 rounded-xl">
             <Scale className="w-5 h-5 text-white" />
           </div>
           <span className="font-bold text-xl tracking-tight text-slate-900 font-serif">LawLens</span>
        </div>
        
        <div className="flex items-center gap-4">
            <Link href="/templates">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
                <BookOpen className="w-4 h-4 mr-2"/> 模版库
              </Button>
            </Link>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="text-slate-500 hover:text-slate-900">
              <History className="w-4 h-4 mr-2"/> 历史记录
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={() => content && exportToWord(content, '法律文书.docx')}>
              <Download className="w-4 h-4 mr-2"/> 导出
            </Button>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-400 hover:bg-red-50">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth">
                <Button size="sm" className="bg-slate-900 text-white">登录</Button>
              </Link>
            )}
        </div>
      </nav>

      {/* --- 主布局 --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 左侧：AI 控制台 */}
        <motion.div 
            initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="w-[380px] flex flex-col border-r border-slate-200 bg-white z-10 shadow-xl"
        >
            {/* 模式切换 */}
            <div className="p-4 pb-2">
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 relative">
                    <motion.div 
                        className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm z-0"
                        layoutId="activeTab"
                        animate={{ left: mode === 'draft' ? 4 : '50%', width: 'calc(50% - 6px)' }}
                        transition={springAnim}
                    />
                    <button onClick={() => setMode('draft')} className={`flex-1 relative z-10 py-2 text-sm font-medium transition-colors ${mode === 'draft' ? 'text-slate-900' : 'text-slate-500'}`}>
                        <Zap className="w-4 h-4 inline mr-2" /> 生成模式
                    </button>
                    <button onClick={() => setMode('polish')} className={`flex-1 relative z-10 py-2 text-sm font-medium transition-colors ${mode === 'polish' ? 'text-slate-900' : 'text-slate-500'}`}>
                        <Sparkles className="w-4 h-4 inline mr-2" /> 润色模式
                    </button>
                </div>
            </div>

            {/* 聊天区域 (✅ 修复 1: 替换 ScrollArea 为原生 div) */}
            <div className="flex-1 px-4 py-2 bg-slate-50/50 overflow-y-auto">
                <div className="space-y-4 pb-4">
                    {messages.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 space-y-4">
                            <p className="text-center text-sm text-slate-400 mb-4">快速开始或输入您的案情：</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                  { label: '催款律师函', id: 'biz-letter' },
                                  { label: '民事起诉状', id: 'civil-lawsuit' },
                                  { label: '解除合同', id: 'biz-termination' },
                                  { label: '借款合同', id: 'civil-loan' }
                                ].map((t) => (
                                    <Button key={t.id} variant="outline" size="sm" onClick={() => fillTemplate(t.id)} className="justify-start h-auto py-2 px-3 bg-white border-slate-200 hover:border-blue-500 hover:text-blue-600">
                                        <FileText className="w-3 h-3 mr-2 shrink-0"/> {t.label}
                                    </Button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                    
                    {messages.map((m, i) => (
                        <motion.div 
                            key={i}
                            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[90%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                m.role === 'user' 
                                ? 'bg-slate-900 text-white rounded-br-sm' 
                                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
                            }`}>
                                {m.content}
                            </div>
                        </motion.div>
                    ))}
                    
                    {isAnalyzing && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                            <Sparkles className="w-4 h-4 animate-spin" /> AI 正在思考与检索案例...
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* 输入框 */}
            <div className="p-4 border-t border-slate-100 bg-white">
                <div className="relative">
                    <Input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder={mode === 'draft' ? "描述案情经过..." : "输入修改指令 (如: 增加违约金条款)..."}
                        className="pr-12 py-6 rounded-xl border-slate-200 focus-visible:ring-slate-900 shadow-sm bg-slate-50 focus:bg-white transition-all"
                    />
                    <Button 
                        size="icon" 
                        onClick={handleSend}
                        disabled={isAnalyzing}
                        className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-slate-900 hover:bg-slate-800"
                    >
                        <ArrowRightCircle className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </motion.div>

        {/* 右侧：编辑器 */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="flex-1 bg-[#F8F9FA] p-6 lg:p-10 overflow-y-auto flex justify-center"
        >
            <div className="w-full max-w-[850px] h-full flex flex-col gap-3">
                <div className="flex justify-between items-end px-2">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Document Preview</span>
                    <span className="text-xs text-slate-400">{content.length} 字</span>
                </div>
                
                <Card className="flex-1 shadow-2xl shadow-slate-200 border-0 min-h-[800px] relative overflow-hidden bg-white ring-1 ring-slate-100">
                     <div className={`absolute top-0 inset-x-0 h-1.5 opacity-80 ${mode === 'draft' ? 'bg-slate-900' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`} />
                     <div className="h-full">
                        <Editor 
                            content={content} 
                            onChange={setContent}
                            className="h-full"
                        />
                     </div>
                </Card>
            </div>
        </motion.div>

      </div>

      {/* --- 历史记录侧边栏 --- */}
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
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4" /> 历史文档
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!user && historyList.length === 0 && (
                  <div className="p-4 bg-blue-50 text-blue-700 text-xs rounded-lg mb-4">
                    提示：登录后您的历史记录将永久保存。
                    <Link href="/auth" className="underline ml-1 font-bold">去登录</Link>
                  </div>
                )}
                {historyList.map((item) => (
                  <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group">
                    <div className="font-medium text-slate-700 mb-1 line-clamp-1 group-hover:text-blue-600">{item.title}</div>
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
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainContent />
    </Suspense>
  )
}