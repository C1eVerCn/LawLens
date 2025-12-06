'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Gavel, Sparkles, FileText, Scale, 
  History, Download, ChevronRight, X, Clock
} from 'lucide-react'

import { exportToWord } from '@/lib/export'
import Editor from '@/components/editor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'
import { LEGAL_TEMPLATES } from '@/lib/templates'

// 定义历史记录的数据结构
interface HistoryItem {
  id: number
  title: string
  content: string
  created_at: string
}

export default function Home() {
  const [content, setContent] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState('')
  
  // 历史记录相关状态
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // 1. 获取历史记录
  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/history')
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

  // 监听侧边栏打开，自动刷新列表
  useEffect(() => {
    if (showHistory) {
      fetchHistory()
    }
  }, [showHistory])

  // 2. 核心：分析 + 自动保存
  const handleAnalyze = async () => {
    if (!content.trim()) return
    setIsAnalyzing(true)
    setAiResult('') 

    try {
      // 步骤 A: 自动保存 (Fire and Forget，不需要等它完成再分析)
      saveDocument()

      // 步骤 B: 发送分析请求
      console.log("🚀 开始发送请求给后端...")
      const response = await fetch('http://127.0.0.1:8000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })

      if (!response.ok) throw new Error(`服务器错误: ${response.status}`)

      const data = await response.json()
      setAiResult(data.result)

    } catch (error) {
      console.error("❌ 请求失败:", error)
      setAiResult("⚠️ 分析失败：请确保您的 Python 后端服务 (server.py) 正在运行！")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 保存文档辅助函数
  const saveDocument = async () => {
    try {
      // 取前20个字作为标题
      const title = content.slice(0, 20) + (content.length > 20 ? '...' : '')
      await fetch('http://127.0.0.1:8000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      console.log("✅ 文档已自动保存")
    } catch (e) {
      console.error("保存失败", e)
    }
  }

  const fillTemplate = (type: string) => {
    if (LEGAL_TEMPLATES[type]) {
      setContent(LEGAL_TEMPLATES[type])
    }
  }

  // 加载历史文档到编辑器
  const loadHistoryItem = (item: HistoryItem) => {
    setContent(item.content)
    setShowHistory(false) // 关闭侧边栏
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-800 overflow-x-hidden relative">
      
      {/* 1. 顶部导航栏 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-serif tracking-tight text-slate-900">LawLens</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHistory(true)} // 👈 点击打开历史侧边栏
              className="text-slate-500 hover:text-slate-900"
            >
              <History className="w-4 h-4 mr-2"/> 历史记录
            </Button>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-500 hover:text-slate-900"
              onClick={() => {
                // 如果没有内容，就别导出
                if (!content) return; 
                // 取前10个字做文件名，或者默认“法律文书”
                const fileName = (content.slice(0, 10).replace(/\n/g, '') || '法律文书') + '.docx'
                exportToWord(content, fileName)
            }}
            >
              <Download className="w-4 h-4 mr-2"/> 
              导出文书
            </Button>
          </div>
        </div>
      </nav>

      {/* 2. 主体内容 */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        
        {/* 左侧：文书编辑器 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-8 space-y-4"
        >
          {/* 模版快捷栏 */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { label: '催款律师函', type: 'letter' },
              { label: '民事起诉状', type: 'lawsuit' },
              { label: '解除合同通知', type: 'termination' },
              { label: '借款合同', type: 'loan' }
            ].map((item, i) => (
              <Button 
                key={i} 
                variant="outline" 
                size="sm" 
                className="rounded-full border-slate-200 hover:border-blue-600 hover:text-blue-600 bg-white transition-all whitespace-nowrap"
                onClick={() => fillTemplate(item.type)}
              >
                <FileText className="w-3 h-3 mr-1.5" />
                {item.label}
              </Button>
            ))}
          </div>

          <Card className="min-h-[700px] border-slate-200 shadow-sm bg-white flex flex-col overflow-hidden">
            <div className="h-10 border-b border-slate-100 bg-slate-50/50 flex items-center px-4 gap-2 text-slate-400">
              <div className="w-3 h-3 rounded-full bg-red-400/20"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400/20"></div>
              <div className="w-3 h-3 rounded-full bg-green-400/20"></div>
              <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
              <span className="text-xs font-medium">智能编辑器 Ready</span>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 w-full">
              <Editor content={content} onChange={setContent} />
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
              <span className="text-xs text-slate-400">字数统计: {content.length}</span>
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !content}
                className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-105 active:scale-95"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" /> 
                    深度分析中...
                  </>
                ) : (
                  <>
                    <Gavel className="w-4 h-4 mr-2" /> 
                    开始法律审查
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>

      {/* 右侧：AI 分析面板 */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="lg:col-span-4"
      >
        {/* 👇 关键修改：把 h-full 改成了 h-[700px] */}
        <Card className="h-[700px] border-0 shadow-xl shadow-slate-200/50 bg-white ring-1 ring-slate-100 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10 opacity-50"></div>

          <div className="p-5 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
            <h2 className="font-serif font-semibold text-lg flex items-center gap-2 text-slate-800">
              <Sparkles className="w-4 h-4 text-blue-600" />
              AI 法律顾问
            </h2>
          </div>

          {/* flex-1 和 overflow-y-auto 配合父级固定高度，会让长文本在这里面滚动 */}
          <div className="flex-1 p-5 overflow-y-auto bg-slate-50/30">
            <AnimatePresence mode="wait">
              {aiResult ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-sm prose-slate bg-white p-4 rounded-xl border border-blue-100 shadow-sm"
                >
                  <TypewriterEffect text={aiResult} />
                </motion.div>
             ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-4"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                    <Scale className="w-8 h-8 text-slate-200" />
                  </div>
                  <div className="max-w-[200px]">
                    <p className="text-sm">在左侧输入案情，点击分析，我将为您检索法条并提供建议。</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
    
          {aiResult && (
            <div className="p-4 border-t border-slate-100 bg-white">
              <p className="text-xs text-slate-400 mb-2">猜你想问：</p>
              <div className="flex flex-col gap-2">
                <button className="text-xs text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-md text-slate-600 transition-colors flex justify-between items-center group">
                  如何收集相关证据？
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"/>
                </button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
      </div>

      {/* 3. 历史记录侧边栏 (Slide-over) */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* 遮罩层 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            {/* 侧边栏内容 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600" />
                  <h3 className="font-semibold text-slate-800">历史文书</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingHistory ? (
                  <div className="text-center py-10 text-slate-400 text-sm">加载中...</div>
                ) : historyList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">暂无历史记录</div>
                ) : (
                  historyList.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => loadHistoryItem(item)}
                      className="p-3 rounded-lg border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-slate-700 text-sm line-clamp-1 group-hover:text-blue-700">
                          {item.title || "无标题文书"}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-slate-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(item.created_at).toLocaleString('zh-CN')}
                      </div>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  )
}