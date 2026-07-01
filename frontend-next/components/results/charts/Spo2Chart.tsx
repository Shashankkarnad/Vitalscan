'use client'

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatMonth } from '@/lib/utils'

interface Props {
  months: string[]
  avg: (number | null)[]
  min: (number | null)[]
}

export default function Spo2Chart({ months, avg, min }: Props) {
  const data = months.map((m, i) => ({
    month: formatMonth(m),
    avg: avg[i],
    min: min[i],
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
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
          domain={['auto', 100]}
          unit="%"
          width={44}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E4E7EB',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v, name) => [
            `${typeof v === 'number' ? v.toFixed(1) : v}%`,
            name === 'avg' ? 'Avg SpO₂' : 'Min SpO₂',
          ]}
        />
        <ReferenceLine
          y={95}
          stroke="#D97706"
          strokeDasharray="5 4"
          label={{ value: '95%', position: 'insideTopLeft', fill: '#D97706', fontSize: 10 }}
        />
        <ReferenceLine
          y={88}
          stroke="#DC2626"
          strokeDasharray="5 4"
          label={{ value: '88%', position: 'insideTopLeft', fill: '#DC2626', fontSize: 10 }}
        />
        <Area
          type="monotone"
          dataKey="avg"
          fill="#0D9488"
          fillOpacity={0.08}
          stroke="#0D9488"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="min"
          stroke="#EA580C"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#9AA5B4' }}
          formatter={(v) => (v === 'avg' ? 'Average' : 'Minimum')}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
