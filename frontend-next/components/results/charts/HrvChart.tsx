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
  dates: string[]
  values: number[]
}

export default function HrvChart({ dates, values }: Props) {
  const data = dates.map((d, i) => ({ date: d, hrv: values[i] }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => {
            const parts = (d as string).split('-')
            return `${parts[1]}/${parts[2]?.slice(0, 2) ?? ''}`
          }}
          tick={{ fontSize: 10, fill: '#9AA5B4' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9AA5B4' }}
          tickLine={false}
          axisLine={false}
          unit=" ms"
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E4E7EB',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v) => [`${v} ms`, 'HRV']}
          labelFormatter={(l: unknown) => {
            const parts = String(l).split('-')
            return `${parts[1]}/${parts[2]}`
          }}
        />
        <ReferenceLine
          y={35}
          stroke="#EA580C"
          strokeDasharray="5 4"
          label={{
            value: '35 ms',
            position: 'insideTopLeft',
            fill: '#EA580C',
            fontSize: 10,
          }}
        />
        <Line
          type="monotone"
          dataKey="hrv"
          stroke="#E8553E"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#E8553E' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
