'use client'

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts"
import { motion } from "framer-motion"

interface RiskData {
  subject: string
  A: number // 满分 100
  fullMark: number
}

interface RiskRadarProps {
  data: RiskData[]
  score: number
  summary: string
}

export function RiskRadar({ data, score, summary }: RiskRadarProps) {
  // 根据分数决定颜色
  const scoreColor = score > 80 ? "text-green-500" : score > 60 ? "text-yellow-500" : "text-red-500"
  const chartColor = score > 80 ? "#22c55e" : score > 60 ? "#eab308" : "#ef4444"

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI 风险评估模型</h4>
        <span className={`text-xl font-black ${scoreColor}`}>{score}<span className="text-xs text-slate-400 font-normal ml-1">/ 100</span></span>
      </div>
      
      <div className="h-[200px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Contract Health"
              dataKey="A"
              stroke={chartColor}
              fill={chartColor}
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          <span className="text-indigo-600 font-bold">综合评价：</span>
          {summary}
        </p>
      </div>
    </motion.div>
  )
}