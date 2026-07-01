'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatMonth, formatHours } from '@/lib/utils'

interface Props {
  months: string[]
  deep: (number | null)[]
  rem: (number | null)[]
  core?: (number | null)[]
}

export default function SleepChart({ months, deep, rem, core }: Props) {
  const data = months.map((m, i) => ({
    month: formatMonth(m),
    deep: deep[i] ?? 0,
    rem: rem[i] ?? 0,
    core: core?.[i] ?? 0,
  }))

  const fmt = (v: number) => formatHours(v / 60)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -4 }}>
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
          tickFormatter={fmt}
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
            fmt(Number(v)),
            name === 'deep' ? 'N3 Deep' : name === 'rem' ? 'REM' : 'Light (N1+N2)',
          ]}
        />
        <ReferenceLine
          y={60}
          stroke="#7C3AED"
          strokeDasharray="5 4"
          label={{ value: 'N3 60m', position: 'insideTopLeft', fill: '#7C3AED', fontSize: 10 }}
        />
        <ReferenceLine
          y={90}
          stroke="#5B21B6"
          strokeDasharray="5 4"
          label={{ value: 'REM 90m', position: 'insideTopLeft', fill: '#5B21B6', fontSize: 10 }}
        />
        <Bar dataKey="deep" stackId="a" fill="#4C1D95" radius={[0, 0, 0, 0]} />
        <Bar dataKey="rem" stackId="a" fill="#7C3AED" />
        <Bar dataKey="core" stackId="a" fill="rgba(124,58,237,0.4)" radius={[4, 4, 0, 0]} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#9AA5B4' }}
          formatter={(v) =>
            v === 'deep' ? 'N3 Deep' : v === 'rem' ? 'REM' : 'Light (N1+N2)'
          }
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
