'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import { User } from '@supabase/supabase-js' 
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone' 
import { 
  ShieldCheck, History, Download, Zap, Sparkles, 
  ArrowUp, BookOpen, LayoutDashboard, Settings, 
  User as UserIcon, BrainCircuit, ChevronLeft,
  CheckCircle2, Loader2, Share2, AlertCircle, X, Lock, Palette, UploadCloud, Activity
} from 'lucide-react'

import { exportToWord } from '@/lib/export'
import Editor from '@/components/editor'
import { RiskRadar } from '@/components/risk-radar' 
import { Button } from '@/components/ui/button'
import { LEGAL_TEMPLATES } from '@/lib/templates' 
import Link from 'next/link'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface HistoryItem { id: number; title: string; content: string; created_at: string; }
interface Message { role: 'user' | 'assistant'; content: string; }

// --- 完整的 Settings Modal 组件 (无删减) ---
const SettingsModal = ({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: User | null }) => {
  if (!isOpen) return null;
  
  // 内部状态
  const [activeTab, setActiveTab] = useState('general')
  const tabs = [
    { id: 'general', label: '通用设置', icon: <Settings size={14} /> },
    { id: 'account', label: '账号安全', icon: <Lock size={14} /> },
    { id: 'ai', label: 'AI 偏好', icon: <BrainCircuit size={14} /> },
    { id: 'theme', label: '界面外观', icon: <Palette size={14} /> },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[640px] h-[480px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-slate-800">设置</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="text-slate-500" /></button>
        </div>
        
        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-slate-50/50 border-r border-slate-100 p-3 flex flex-col gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-all text-left",
                  activeTab === tab.id 
                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          
          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4">导出与保存</h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">默认导出格式</span>
                            <select className="text-xs border border-slate-200 rounded p-1.5 bg-slate-50 outline-none focus:border-indigo-500">
                                <option>Word 文档 (.docx)</option>
                                <option>PDF 文件 (.pdf)</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">自动保存间隔</span>
                            <select className="text-xs border border-slate-200 rounded p-1.5 bg-slate-50 outline-none focus:border-indigo-500">
                                <option>实时</option>
                                <option>每 30 秒</option>
                                <option>每 5 分钟</option>
                            </select>
                        </div>
                    </div>
                </div>
              </div>
            )}
            
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4">个人资料</h4>
                    {user ? (
                        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {user.email?.[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{user.email}</p>
                                    <p className="text-xs text-slate-500">LawLens 普通用户</p>
                                </div>
                            </div>
                            <button className="text-xs text-indigo-600 hover:underline font-medium ml-13">管理订阅</button>
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 mb-3">您尚未登录</p>
                            <Link href="/auth">
                                <Button size="sm" className="bg-slate-900 text-white h-8 text-xs">去登录</Button>
                            </Link>
                        </div>
                    )}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4">模型配置</h4>
                    <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100 mb-4 leading-relaxed">
                        当前正在使用 <b>LawLens Pro (Qwen-Max)</b> 法律专用大模型，已开启 RAG 联网检索增强。
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked readOnly className="rounded text-indigo-600 focus:ring-indigo-500" />
                           <span className="text-xs text-slate-700">总是显示思维链 (Chain of Thought)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked readOnly className="rounded text-indigo-600 focus:ring-indigo-500" />
                           <span className="text-xs text-slate-700">允许 AI 学习我的修改习惯 (Agent Memory)</span>
                        </label>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4">界面风格</h4>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="border-2 border-indigo-600 rounded-lg p-3 bg-white text-center cursor-pointer relative overflow-hidden">
                           <div className="text-xs font-bold text-indigo-700">专业白 (默认)</div>
                           <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-bl">当前</div>
                       </div>
                       <div className="border border-slate-200 rounded-lg p-3 bg-slate-900 text-center cursor-not-allowed opacity-60">
                           <div className="text-xs font-bold text-white">深邃黑</div>
                           <div className="text-[8px] text-slate-400 mt-1">即将推出</div>
                       </div>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
           <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">取消</button>
           <button onClick={() => { onClose(); alert("设置已保存！") }} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 shadow-sm transition-colors">保存更改</button>
        </div>
      </div>
    </div>
  )
}

function MainContent() {
  const searchParams = useSearchParams()
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'draft' | 'polish'>('draft')
  
  // 对话历史分离
  const [draftMessages, setDraftMessages] = useState<Message[]>([])
  const [polishMessages, setPolishMessages] = useState<Message[]>([])
  const messages = mode === 'draft' ? draftMessages : polishMessages
  const setMessages = (fn: (prev: Message[]) => Message[]) => {
    if (mode === 'draft') setDraftMessages(fn)
    else setPolishMessages(fn)
  }

  const [input, setInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // 历史 & 用户
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [user, setUser] = useState<User | null>(null)
  
  // UI 交互
  const [showSettings, setShowSettings] = useState(false)
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info' | 'error'} | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isExporting, setIsExporting] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ✨ Risk Radar State
  const [riskData, setRiskData] = useState<any>(null)
  const [isRiskScanning, setIsRiskScanning] = useState(false)

  // ✨ Upload State
  const [isUploading, setIsUploading] = useState(false)

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
  
  // ✨ 修复：未登录时不拉取历史，防止显示无关记录
  useEffect(() => { 
      if (showHistory) {
          if (user) {
              fetchHistory() 
          } else {
              setHistoryList([]) // 未登录清空列表
          }
      }
  }, [showHistory, user])

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleEditorChange = (newContent: string) => {
    if (newContent === content) return
    setContent(newContent)
    setSaveStatus('unsaved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('saving')
        await saveDocument(newContent)
        setSaveStatus('saved')
    }, 2000)
  }

  const forceSave = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus('saving')
    await saveDocument(content)
    setSaveStatus('saved')
  }

  const switchMode = (newMode: 'draft' | 'polish') => { setMode(newMode) }

  const fetchHistory = async () => {
    if (!user) return
    try {
      const url = new URL(`${API_BASE_URL}/api/history`)
      url.searchParams.append('user_id', user.id)
      const res = await fetch(url.toString())
      if (res.ok) setHistoryList(await res.json())
    } catch (error) { console.error(error) }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null) }

  const saveDocument = async (currentContent: string) => {
    if (!currentContent || currentContent.trim() === '<p></p>') return 
    try {
      const title = currentContent.replace(/<[^>]+>/g, '').slice(0, 20) || "未命名文档"
      await fetch(`${API_BASE_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: currentContent, user_id: user?.id || null }),
      })
    } catch (e) { console.error(e); setSaveStatus('unsaved') }
  }

  const handleExport = async () => {
    if (!content || content.replace(/<[^>]+>/g, '').trim().length === 0) {
        showToast("文档内容为空，无法导出", "error")
        return
    }
    if (saveStatus === 'unsaved') await forceSave()
    setIsExporting(true)
    const fileName = `LawLens_Doc_${new Date().toISOString().slice(0,10)}.docx`
    const success = await exportToWord(content, fileName)
    setIsExporting(false)
    if (success) showToast("导出成功！下载已开始", "success")
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => showToast("链接已复制", "success")).catch(() => showToast("复制失败", "error"))
  }

  const fillTemplate = (id: string) => {
    const template = LEGAL_TEMPLATES.find(t => t.id === id)
    if (template) {
      handleEditorChange(template.content)
      setSaveStatus('saved')
      setMode('polish') 
      setPolishMessages(prev => [...prev, { role: 'assistant', content: `已加载【${template.title}】。您可以让我审查风险或修改具体条款。` }])
      showToast("模版加载成功", "success")
    }
  }

  const loadHistoryItem = (item: HistoryItem) => {
    handleEditorChange(item.content)
    setSaveStatus('saved')
    setShowHistory(false)
    setMode('polish')
    setPolishMessages(prev => [...prev, { role: 'assistant', content: `已恢复历史版本：${item.title}` }])
  }

  // ✨ P0: 上传逻辑
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      
      if (data.status === 'success') {
        handleEditorChange(data.content)
        setSaveStatus('saved')
        setMode('polish')
        showToast("文档解析成功！", "success")
        // 自动触发一条欢迎语
        setPolishMessages(prev => [...prev, { role: 'assistant', content: "文档已导入。您可以点击上方的「体检」按钮进行风险分析。" }])
      } else {
        showToast("解析失败，请检查文件格式", "error")
      }
    } catch (e) {
      showToast("上传出错", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1
  })

  // ✨ P2: 风险体检逻辑
  const handleRiskScan = async () => {
    if (!content || content.length < 50) {
        showToast("文档内容太少，无法分析", "error")
        return
    }
    
    setIsRiskScanning(true)
    setMode('polish') // 强制切换到润色模式展示结果
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_doc: content, mode: 'risk_score', messages: [] })
        })
        const data = await res.json()
        setRiskData(data) // 保存数据，渲染 Radar
        
        // 在对话框里也加一条记录
        setPolishMessages(prev => [...prev, { role: 'assistant', content: "✅ 风险体检已完成，结果如上图所示。" }])
        
    } catch (e) {
        showToast("分析失败，请重试", "error")
    } finally {
        setIsRiskScanning(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isAnalyzing) return
    const newMsg: Message = { role: 'user', content: input }
    const setCurrentMessages = mode === 'draft' ? setDraftMessages : setPolishMessages
    const currentMessages = mode === 'draft' ? draftMessages : polishMessages
    
    setCurrentMessages(prev => [...prev, newMsg])
    setInput('')
    setIsAnalyzing(true)
    setCurrentMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            messages: [...currentMessages, newMsg], 
            current_doc: content, 
            mode: mode, 
            user_id: user?.id 
        }),
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
        setCurrentMessages(prev => {
            const newArr = [...prev]
            newArr[newArr.length - 1] = { role: 'assistant', content: fullText }
            return newArr
        })
      }
      if (mode === 'draft') handleEditorChange(fullText) 
    } catch (error) {
        setCurrentMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 网络请求失败。" }])
    } finally { setIsAnalyzing(false) }
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden">
      
      {/* 1. 侧边栏 (带上传) */}
      <aside className="w-[60px] bg-[#1C1C1E] flex flex-col items-center py-6 gap-6 z-40 shrink-0 border-r border-white/5">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <nav className="flex-1 flex flex-col gap-6 w-full items-center pt-6">
           <NavItem icon={<LayoutDashboard />} label="工作台" active />
           
           {/* ✨ Upload Button */}
           <div {...getRootProps()} className="cursor-pointer group relative flex justify-center w-full outline-none">
                <input {...getInputProps()} />
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300", isDragActive ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white hover:bg-white/10")}>
                    {isUploading ? <Loader2 className="animate-spin w-5 h-5"/> : <UploadCloud className="w-5 h-5"/>}
                </div>
                <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl border border-white/20">
                    导入 Word
                </span>
           </div>

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

      {/* 2. AI 面板 (带雷达图) */}
      <div className="w-[360px] flex flex-col bg-white border-r border-slate-200 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative">
         
         <AnimatePresence>
            {notification && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-4 inset-x-0 p-2 z-50 pointer-events-none flex justify-center"
                >
                    <div className={cn(
                        "px-4 py-2 rounded-full shadow-xl text-white text-xs font-medium flex items-center gap-2 backdrop-blur-md",
                        notification.type === 'success' ? "bg-green-600/90" : 
                        notification.type === 'error' ? "bg-red-600/90" : "bg-indigo-600/90"
                    )}>
                        {notification.type === 'success' ? <CheckCircle2 size={14} /> : 
                         notification.type === 'error' ? <AlertCircle size={14} /> : <Zap size={14} />} 
                        {notification.msg}
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
            {/* ✨ Risk Scan Button (Small) */}
            <button 
                onClick={handleRiskScan} 
                disabled={isRiskScanning}
                className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                title="全身体检"
            >
                {isRiskScanning ? <Loader2 className="animate-spin w-3 h-3"/> : <Activity className="w-3 h-3" />}
                体检
            </button>
            <div className="flex bg-slate-100 p-1 rounded-lg scale-90 origin-right">
                <button onClick={() => switchMode('draft')} className={cn("px-3 py-1 text-[11px] font-bold rounded-[4px] transition-all", mode === 'draft' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>起草</button>
                <button onClick={() => switchMode('polish')} className={cn("px-3 py-1 text-[11px] font-bold rounded-[4px] transition-all", mode === 'polish' ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>润色</button>
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAFA] scroll-smooth relative">
            
            {/* ✨ 雷达图展示区 */}
            {riskData && (
                <RiskRadar 
                    data={riskData.dimensions} 
                    score={riskData.total_score} 
                    summary={riskData.summary} 
                />
            )}

            {messages.length === 0 && !riskData && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-slate-900 font-bold mb-2 text-sm">
                        {mode === 'draft' ? 'AI 智能起草' : 'AI 审查润色'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 px-8 leading-relaxed">
                        {mode === 'draft' 
                            ? '描述需求，AI 将引用案例为您从零起草。' 
                            : '已加载文档。尝试点击上方「体检」按钮进行风险分析。'}
                    </p>
                    <div className="space-y-2.5 px-2">
                        {(mode === 'draft' ? ['起草一份房屋租赁合同', '生成催款律师函'] : ['优化当前选中的条款', '将“违约金”调整为合法范围']).map((t, i) => (
                            <button key={i} onClick={() => setInput(t)} 
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
                           <div className="whitespace-pre-wrap font-sans" dangerouslySetInnerHTML={{ __html: m.content }} />
                        </div>
                    </motion.div>
                ))}
                {isAnalyzing && (
                    <div className="flex gap-2 items-center text-xs text-slate-400 px-2 mt-2">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" /> 
                        <span className="animate-pulse">AI 正在思考...</span>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
         </div>

         {/* Input */}
         <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative group">
                <textarea 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder={mode === 'draft' ? "描述案情以起草..." : "输入修改指令..."}
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
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all duration-300",
                    saveStatus === 'saved' ? "bg-green-50 border-green-100 text-green-600" :
                    saveStatus === 'saving' ? "bg-blue-50 border-blue-100 text-blue-600" :
                    "bg-amber-50 border-amber-100 text-amber-600"
                )}>
                    {saveStatus === 'saved' && <CheckCircle2 size={10} />}
                    {saveStatus === 'saving' && <Loader2 size={10} className="animate-spin" />}
                    {saveStatus === 'unsaved' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                    {saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中...' : '输入中...'}
                </div>
             </div>
             <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="h-8 text-slate-600 border-slate-200 hover:bg-white text-xs shadow-sm bg-white">
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2"/> : <Download className="w-3.5 h-3.5 mr-2" />} 导出 Word
                 </Button>
                 <Button size="sm" onClick={handleShare} className="bg-[#1A1A1A] hover:bg-black text-white h-8 px-4 rounded-md shadow-lg shadow-black/10 font-medium text-xs flex items-center gap-2">
                    <Share2 size={12} /> 分享
                 </Button>
             </div>
         </header>

         <div className="flex-1 overflow-y-auto px-4 pb-8 flex justify-center scroll-smooth bg-[#F2F4F7]">
             <div className="w-full flex justify-center my-2 animate-in fade-in zoom-in-95 duration-300">
                <Editor content={content} onChange={handleEditorChange} />
             </div>
         </div>
      </main>

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
                {!user ? (
                    <div className="text-center py-10">
                        <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 mb-4">请登录后查看云端历史</p>
                        <Link href="/auth"><Button size="sm" variant="outline" className="text-xs">去登录</Button></Link>
                    </div>
                ) : historyList.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">暂无历史记录</div>
                ) : (
                    historyList.map((item) => (
                      <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-3 rounded-lg border border-slate-100 hover:border-indigo-500/50 hover:bg-indigo-50/10 cursor-pointer transition-all">
                        <div className="font-medium text-slate-800 text-xs mb-1 truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString()}</div>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} />
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: any) {
    return (
        <div className="group relative flex justify-center w-full cursor-pointer" onClick={onClick}>
            {/* Input 容器占满 */}
            {onClick ? <div onClick={onClick} className="absolute inset-0 z-10" /> : null}
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