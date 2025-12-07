'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, ArrowRight, Loader2, Mail, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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
        // --- 登录逻辑 ---
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // 登录成功，直接飞回主页
        router.push('/') 
      } else {
        // --- 注册逻辑 (丝滑版) ---
        // 因为我们在后台关闭了"Confirm Email"，这里注册成功会直接返回 session
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            // 这里可以存一些额外的用户数据
            data: { full_name: email.split('@')[0] } 
          }
        })
        
        if (error) throw error

        if (data.session) {
          // 🎉 注册即登录！直接跳转，不需要用户再输一遍密码
          router.push('/')
        } else {
          // 防御性代码：万一后台没关邮箱验证，提示用户
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

  // 动画变体配置
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    }),
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden relative z-10"
      >
        <div className="p-8">
          {/* Logo 区域 */}
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="bg-slate-900 p-3 rounded-xl mb-4 shadow-lg shadow-slate-900/20"
            >
              <Scale className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
              LawLens
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              您的 AI 法律文书智能顾问
            </p>
          </div>

          {/* 错误提示 */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">邮箱地址</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl text-sm font-medium shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isLogin ? '立即登录' : '创建新账号'
              )}
            </Button>
          </form>

          {/* 底部切换 */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {isLogin ? "还没有账号？" : "已有账号？"}
            </span>
            <button 
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              {isLogin ? "免费注册" : "直接登录"}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* 底部装饰条 */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
      </motion.div>

      <div className="absolute bottom-6 text-center w-full">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          暂不登录，先去逛逛
        </Link>
      </div>
    </div>
  )
}