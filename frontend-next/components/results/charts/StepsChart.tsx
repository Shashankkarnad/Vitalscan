'use client'

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMonth, formatK } from '@/lib/utils'

interface Props {
  months: string[]
  values: number[]
}

export default function StepsChart({ months, values }: Props) {
  const maxVal = Math.max(...values)
  const data = months.map((m, i) => ({ month: formatMonth(m), steps: values[i] }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: '#9AA5B4' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9AA5B4' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatK}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E4E7EB',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v) => [formatK(Number(v)), 'Steps']}
        />
        <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.steps === maxVal ? '#0D9488' : '#CBD5E1'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
