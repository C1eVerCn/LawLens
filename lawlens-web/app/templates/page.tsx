'use client'

import { motion } from 'framer-motion'
import { FileText, ChevronRight, Search, Scale } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { LEGAL_TEMPLATES } from '@/lib/templates'
import { useState } from 'react'

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')

  // 提取所有分类
  const categories = ['全部', ...Array.from(new Set(LEGAL_TEMPLATES.map(t => t.category)))]

  // 过滤模版
  const filteredTemplates = LEGAL_TEMPLATES.filter(t => {
    const matchesSearch = t.title.includes(searchTerm) || t.description.includes(searchTerm)
    const matchesCategory = activeCategory === '全部' || t.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-800">
      {/* 顶部 Hero 区域 */}
      <section className="bg-slate-900 text-white py-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
            <Scale className="w-4 h-4 mr-2" /> 回到主页
          </Link>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-serif font-bold mb-4"
          >
            法律文书模版库
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl text-lg"
          >
            涵盖民事、商事、劳动、知识产权等15+种常用法律场景，一键引用，智能填充。
          </motion.p>
        </div>
      </section>

      {/* 搜索与筛选 */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
        <Card className="p-2 flex flex-col md:flex-row gap-2 shadow-xl border-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索模版，例如：离婚、借款..." 
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                  activeCategory === cat 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* 模版列表 */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/?template=${template.id}`}>
                <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-slate-200 group cursor-pointer overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FileText className="w-24 h-24 text-blue-600" />
                  </div>
                  <div className="p-6 flex flex-col h-full">
                    <div className="mb-4">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {template.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 flex-1 leading-relaxed">
                      {template.description}
                    </p>
                    <div className="flex items-center text-sm font-medium text-slate-900 group-hover:translate-x-1 transition-transform">
                      使用此模版 <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  )
}