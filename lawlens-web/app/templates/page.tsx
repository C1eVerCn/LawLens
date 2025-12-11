'use client'

import { motion } from 'framer-motion'
import { FileText, Search, ChevronRight, Scale, Tag, BookOpen, PenTool } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { LEGAL_TEMPLATES } from '@/lib/templates'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')

  // 提取分类并去重
  const categories = ['全部', ...Array.from(new Set(LEGAL_TEMPLATES.map(t => t.category)))]

  // 过滤逻辑
  const filteredTemplates = LEGAL_TEMPLATES.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.tags?.some(tag => tag.includes(searchTerm))
    const matchesCategory = activeCategory === '全部' || t.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* --- 顶部 Hero 区域 --- */}
      <section className="bg-[#1e1e2e] text-white pt-24 pb-32 px-6 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors text-sm font-medium bg-white/5 px-4 py-1.5 rounded-full border border-white/10 hover:bg-white/10">
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> 返回编辑器
          </Link>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-6 tracking-tight"
          >
            专业法律文书模版库
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed"
          >
            汇集资深律师起草的 {LEGAL_TEMPLATES.length}+ 款标准文书，涵盖民商事、劳动、知产等核心领域。
            <br className="hidden md:block" />
            一键引用，AI 智能填充，让专业触手可及。
          </motion.p>
        </div>
      </section>

      {/* --- 搜索与内容区域 --- */}
      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-20 pb-20">
        
        {/* 搜索框卡片 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row items-center gap-2 mb-10"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索模版 (如：借款、离婚、股权...)" 
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-slate-50 transition-all text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-auto overflow-x-auto flex gap-1 p-1 md:p-0 scrollbar-hide">
             {/* 移动端横向滚动分类 */}
          </div>
        </motion.div>

        {/* 分类 Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat, idx) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border",
                activeCategory === cat 
                  ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 模版 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.3 }}
            >
              <Link href={`/?template=${template.id}`}>
                <div className="group h-full bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer flex flex-col relative overflow-hidden">
                  
                  {/* 背景装饰图标 */}
                  <FileText className="absolute -right-6 -bottom-6 w-32 h-32 text-slate-50 group-hover:text-indigo-50/50 transition-colors pointer-events-none transform rotate-12" />

                  {/* 头部：分类与标题 */}
                  <div className="mb-4 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase">
                        {template.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {template.title}
                    </h3>
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1 relative z-10 line-clamp-3">
                    {template.description}
                  </p>

                  {/* 底部：Tags 与 动作 */}
                  <div className="relative z-10 pt-4 border-t border-slate-50 flex items-center justify-between mt-auto">
                    <div className="flex gap-2">
                      {template.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {tag}
                        </span>
                      ))}
                    </div>
                    <span className="flex items-center text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      立即使用 <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* 空状态 */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">未找到相关模版</h3>
            <p className="text-slate-500 mt-2">换个关键词试试，例如“合同”、“起诉”</p>
            <button 
              onClick={() => {setSearchTerm(''); setActiveCategory('全部')}}
              className="mt-6 text-indigo-600 font-medium hover:underline"
            >
              清空筛选条件
            </button>
          </div>
        )}

      </div>
    </main>
  )
}