'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, ArrowRight, Loader2, Mail, Lock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // --- 登录 ---
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/') 
      } else {
        // --- 注册 ---
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: email.split('@')[0] } }
        })
        if (error) throw error
        if (data.session) router.push('/')
        else {
          alert('注册成功！请查收邮件激活账号。')
          setIsLogin(true)
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message === 'Invalid login credentials' ? '账号或密码错误' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      
      {/* --- 左侧：品牌展示区 (深色沉浸) --- */}
      <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative flex-col justify-between p-12 overflow-hidden text-white">
        {/* 背景装饰：极光效果 */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse-slow pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
        
        {/* 顶部 Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">LawLens</span>
        </div>

        {/* 中间 Slogan */}
        <div className="relative z-10 max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl font-bold leading-tight mb-6">
              专业的法律文书<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">AI 智能起草平台</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              依托 RAG 检索增强技术，引用千万级真实判例与最新法条。让每一份合同都严谨合规，让每一次起草都如虎添翼。
            </p>
            
            <div className="flex gap-4">
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium">真实案例引用</span>
               </div>
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium">法言法语润色</span>
               </div>
            </div>
          </motion.div>
        </div>

        {/* 底部版权 */}
        <div className="relative z-10 text-sm text-slate-500">
          &copy; 2024 LawLens Inc. All rights reserved.
        </div>
      </div>

      {/* --- 右侧：登录表单区 (极简白) --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#FAFAFA] relative">
        {/* 右上角返回 */}
        <Link href="/" className="absolute top-8 right-8 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          暂不登录
        </Link>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px] bg-white p-10 rounded-2xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] border border-slate-100"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isLogin ? "欢迎回来" : "创建新账号"}
            </h2>
            <p className="text-sm text-slate-500">
              {isLogin ? "请输入您的账号以继续使用" : "注册即享 AI 智能法律助手"}
            </p>
          </div>

          {/* 错误提示 */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 表单 */}
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">邮箱地址</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between ml-1">
                <label className="text-xs font-bold text-slate-700">密码</label>
                {isLogin && <a href="#" className="text-xs text-indigo-600 hover:underline font-medium">忘记密码？</a>}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className={cn(
                "w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4",
                "bg-slate-900 hover:bg-slate-800 text-white"
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? '立即登录' : '创建账号'} 
                  {!isLogin && <Sparkles className="w-3.5 h-3.5" />}
                </span>
              )}
            </Button>
          </form>

          {/* 切换模式 */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              {isLogin ? "还没有账号？" : "已有账号？"}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                }}
                className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors ml-1"
              >
                {isLogin ? "免费注册" : "立即登录"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}