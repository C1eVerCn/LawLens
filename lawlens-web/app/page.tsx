'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase' // 👈 引入 Supabase
import { User } from '@supabase/supabase-js' // 类型
import { motion, AnimatePresence } from 'framer-motion'
// ... (其他 import 保持不变) ...
import { 
  Gavel, Sparkles, FileText, Scale, 
  History, Download, ChevronRight, X, Clock,
  PenTool, BookOpen, User as UserIcon, LogOut
} from 'lucide-react'
import { exportToWord } from '@/lib/export'
import Editor from '@/components/editor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'
import { LEGAL_TEMPLATES } from '@/lib/templates'
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

interface HistoryItem {
  id: number; title: string; content: string; created_at: string;
}

function MainContent() {
  const searchParams = useSearchParams()
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'draft' | 'review'>('draft')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([]) 
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  
  // 👤 用户状态
  const [user, setUser] = useState<User | null>(null)

  // 1. 初始化：监听 Auth 状态
  useEffect(() => {
    // 获取当前用户
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // 监听登录/登出变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // 用户变化时清空历史记录列表，触发重新加载
      setHistoryList([]) 
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. 初始化：模版参数
  useEffect(() => {
    const templateId = searchParams.get('template')
    if (templateId) {
      const template = LEGAL_TEMPLATES.find(t => t.id === templateId)
      if (template) {
        setContent(template.content)
        setMode('review') 
      }
    }
  }, [searchParams])

  // 3. 获取历史记录 (带 user_id)
  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      // 👈 构造 URL 参数
      const url = new URL(`${API_BASE_URL}/api/history`)
      if (user) url.searchParams.append('user_id', user.id)
      
      const res = await fetch(url.toString())
      if (res.ok) {
        const data = await res.json()
        setHistoryList(data)
      }
    } catch (error) {
      console.error("获取历史失败", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (showHistory) fetchHistory()
  }, [showHistory, user]) // 当 user 变化时也会刷新

  // 4. 退出登录
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleAnalyze = async () => {
    if (!content.trim()) return
    setIsAnalyzing(true)
    setAiResult('') 
    setSuggestions([]) 

    try {
      saveDocument()
      console.log(`🚀 发送请求: 模式=${mode}`)
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, mode: mode }),
      })

      if (!response.ok) throw new Error(`服务器错误: ${response.status}`)
      const data = await response.json()
      setAiResult(data.result)
      setSuggestions(data.suggestions || []) 

    } catch (error) {
      console.error("❌ 请求失败:", error)
      setAiResult("⚠️ 分析失败：请确保您的 Python 后端服务正在运行！")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 5. 保存文档 (带 user_id)
  const saveDocument = async () => {
    try {
      const title = content.slice(0, 20) + (content.length > 20 ? '...' : '')
      await fetch(`${API_BASE_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          content, 
          user_id: user?.id || null // 👈 传 user_id
        }),
      })
    } catch (e) { console.error("保存失败", e) }
  }

  const fillTemplate = (type: string) => {
    // ... 简单模版逻辑保留，或者也可以去掉用新的模版库 ...
    if (LEGAL_TEMPLATES.find(t => t.id === type)) {
       // ...
    }
  }
  
  const loadHistoryItem = (item: HistoryItem) => {
    setContent(item.content)
    setShowHistory(false)
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-800 overflow-x-hidden relative">
      
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-serif tracking-tight text-slate-900">LawLens</span>
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

            {/* 👤 用户登录状态显示 */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                  {user.email?.split('@')[0]}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth">
                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                  登录 / 注册
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ... 主体 Grid 布局保持不变 ... */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
         {/* ... 直接复制之前的 UI 代码，不需要修改 ... */}
         {/* ... (Motion Divs for Editor and AI Panel) ... */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-7 space-y-4">
          
          {/* 模式切换器 */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
            <button
              onClick={() => setMode('draft')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                mode === 'draft' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <PenTool className="w-4 h-4" /> 案情起草模式
            </button>
            <button
              onClick={() => setMode('review')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                mode === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Gavel className="w-4 h-4" /> 润色合规模式
            </button>
          </div>

          <Card className="min-h-[700px] border-slate-200 shadow-sm bg-white flex flex-col overflow-hidden ring-4 ring-slate-50/50">
            <div className="h-12 border-b border-slate-100 bg-slate-50/80 flex items-center px-4 justify-between">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${mode === 'draft' ? 'bg-slate-900' : 'bg-blue-600'}`}></div>
                {mode === 'draft' ? '请输入案情经过...' : '请输入文书初稿...'}
              </span>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 w-full">
              <Editor content={content} onChange={setContent} />
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
              <span className="text-xs text-slate-400">字数: {content.length}</span>
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !content}
                className={`${mode === 'draft' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-lg transition-all hover:scale-105 active:scale-95`}
              >
                {isAnalyzing ? (
                  <> <Sparkles className="w-4 h-4 mr-2 animate-spin" /> {mode === 'draft' ? '生成中...' : '润色中...'} </>
                ) : (
                  <> {mode === 'draft' ? '生成专业文书' : '开始合规润色'} <ChevronRight className="w-4 h-4 ml-1" /> </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* 右侧：AI 结果 */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5">
          <Card className="h-[700px] border-0 shadow-xl shadow-slate-200/50 bg-white ring-1 ring-slate-100 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -z-10 opacity-60"></div>

            <div className="p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <h2 className="font-serif font-semibold text-lg flex items-center gap-2 text-slate-800">
                <Sparkles className="w-4 h-4 text-blue-600" />
                AI 法律意见
              </h2>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30 custom-scrollbar">
              <AnimatePresence mode="wait">
                {aiResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-sm prose-slate max-w-none"
                  >
                    {/* 简单的 Markdown 渲染逻辑，特别处理修改理由 */}
                    {aiResult.split('\n').map((line, i) => {
                      // 识别修改理由的引用块
                      if (line.trim().startsWith('> 修改理由')) {
                        return (
                          <div key={i} className="my-2 p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-700 text-xs rounded-r-md">
                            {line.replace('>', '').trim()}
                          </div>
                        )
                      }
                      if (line.trim().startsWith('【') && line.trim().endsWith('】')) {
                         return <h3 key={i} className="text-center font-bold text-lg mt-4 mb-2 text-slate-900">{line}</h3>
                      }
                      return <p key={i} className="mb-2 leading-7">{line}</p>
                    })}
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-4 opacity-50">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                      <Scale className="w-10 h-10 text-slate-200" />
                    </div>
                    <p className="text-sm">在左侧选择模式并输入内容<br/>AI 将为您生成或润色文书</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
            
            {aiResult && suggestions.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-white">
                <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">后续建议</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((question, index) => (
                    <button 
                      key={index}
                      onClick={() => setContent(content + "\n\n【追问】" + question)}
                      className="text-xs text-left px-3 py-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-slate-600 transition-all flex justify-between items-center group border border-transparent hover:border-blue-100"
                    >
                      {question}
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400"/>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* 历史记录侧边栏 */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4" /> 
                  {user ? '我的历史文书' : '游客历史 (仅本次)'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* 登录提示 */}
                {!user && historyList.length === 0 && (
                  <div className="p-4 bg-blue-50 text-blue-700 text-xs rounded-lg mb-4">
                    提示：登录后您的历史记录将永久保存并在多端同步。
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <MainContent />
    </Suspense>
  )
}