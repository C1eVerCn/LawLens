'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Scale, ArrowRight, Loader2 } from 'lucide-react'
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
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/') // 登录成功跳回主页
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('注册成功！请直接登录。')
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || '发生错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-slate-200 shadow-xl bg-white">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 p-3 rounded-xl mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            {isLogin ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            LawLens - 您的 AI 法律文书智能顾问
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">邮箱</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">密码</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? '登录' : '注册')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {isLogin ? "还没有账号？" : "已有账号？"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-medium hover:underline ml-1"
          >
            {isLogin ? "去注册" : "去登录"}
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1">
            暂不登录，试用一下 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </Card>
    </div>
  )
}