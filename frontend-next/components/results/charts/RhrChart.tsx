'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatMonth } from '@/lib/utils'

interface Props {
  months: string[]
  values: (number | null)[]
}

export default function RhrChart({ months, values }: Props) {
  const data = months.map((m, i) => ({
    month: formatMonth(m),
    rhr: values[i],
  })).filter((d) => d.rhr !== null)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -4 }}>
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
          unit=" bpm"
          width={44}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E4E7EB',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v) => [`${v} bpm`, 'Resting HR']}
        />
        <ReferenceLine
          y={70}
          stroke="#0D9488"
          strokeDasharray="5 4"
          label={{
            value: '70 bpm',
            position: 'insideTopLeft',
            fill: '#0D9488',
            fontSize: 10,
          }}
        />
        <Line
          type="monotone"
          dataKey="rhr"
          stroke="#0D9488"
          strokeWidth={2}
          dot={{ fill: '#0D9488', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
