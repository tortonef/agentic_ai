import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { QueryResult } from '../../lib/duckdb'
import { fmt, type ChartSpec } from './spec'

const COLORS = ['#8b5cf6', '#3b82f6', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#a78bfa', '#60a5fa']

const axis = { stroke: '#64748b', fontSize: 11, tickLine: false, axisLine: false } as const
const tooltip = {
  contentStyle: { background: '#0e111b', border: '1px solid rgb(255 255 255 / 0.1)', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#e2e8f0' },
  formatter: (v: unknown) => fmt(v),
}

export function Chart({ spec, result, height = 240 }: { spec: ChartSpec; result: QueryResult; height?: number }) {
  const { rows } = result
  if (!rows.length) return <p className="grid place-items-center text-sm text-slate-500" style={{ height }}>No rows.</p>

  if (spec.chart === 'kpi') {
    return (
      <div className="flex flex-col justify-center gap-3 py-2" style={{ minHeight: Math.min(height, 140) }}>
        {spec.y.map((y) => (
          <div key={y}>
            <p className="font-display text-4xl font-bold text-gradient">{fmt(rows[0][y])}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-slate-500">{y.replace(/_/g, ' ')}</p>
          </div>
        ))}
      </div>
    )
  }

  if (spec.chart === 'table' || !spec.x) return <DataTable result={result} maxHeight={height} />

  const x = spec.x
  const data = rows.map((r) => ({ ...r, [x]: r[x] === null ? '(empty)' : String(r[x]) }))

  return (
    <div style={{ height }} role="img" aria-label={`${spec.chart} chart: ${spec.title}`}>
      <ResponsiveContainer width="100%" height="100%">
        {spec.chart === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={spec.y[0]} nameKey={x} innerRadius="45%" outerRadius="80%" paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        ) : spec.chart === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
            <XAxis dataKey={x} {...axis} interval="preserveStartEnd" />
            <YAxis {...axis} width={56} tickFormatter={(v) => fmt(v) as string} />
            <Tooltip {...tooltip} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} />
            {spec.y.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {spec.y.map((y, i) => (
              <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} maxBarSize={42} />
            ))}
          </BarChart>
        ) : spec.chart === 'line' ? (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
            <XAxis dataKey={x} {...axis} interval="preserveStartEnd" />
            <YAxis {...axis} width={56} tickFormatter={(v) => fmt(v) as string} />
            <Tooltip {...tooltip} />
            {spec.y.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {spec.y.map((y, i) => (
              <Line key={y} dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} type="monotone" />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {spec.y.map((y, i) => (
                <linearGradient key={y} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                  <stop offset="1" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
            <XAxis dataKey={x} {...axis} interval="preserveStartEnd" />
            <YAxis {...axis} width={56} tickFormatter={(v) => fmt(v) as string} />
            <Tooltip {...tooltip} />
            {spec.y.map((y, i) => (
              <Area key={y} dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} fill={`url(#area-${i})`} type="monotone" />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export function DataTable({ result, maxHeight = 280 }: { result: QueryResult; maxHeight?: number }) {
  return (
    <div className="scroll-thin overflow-auto rounded-xl border border-white/[0.06]" style={{ maxHeight }}>
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-ink-850">
          <tr>
            {result.columns.map((c) => (
              <th key={c.name} scope="col" className="whitespace-nowrap px-3 py-2 font-mono font-medium text-slate-400">{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 200).map((r, i) => (
            <tr key={i} className="border-t border-white/[0.04]">
              {result.columns.map((c) => (
                <td key={c.name} className="whitespace-nowrap px-3 py-1.5 text-slate-300">{fmt(r[c.name])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.rows.length > 200 && <p className="px-3 py-2 text-[11px] text-slate-500">Showing 200 of {result.rows.length} rows.</p>}
    </div>
  )
}
