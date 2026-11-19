/** A chart is a small JSON spec over a query result, never generated code. */
export type ChartKind = 'bar' | 'line' | 'area' | 'pie' | 'kpi' | 'table'

export interface ChartSpec {
  title: string
  chart: ChartKind
  x?: string
  y: string[]
}

export const CHART_KINDS: ChartKind[] = ['bar', 'line', 'area', 'pie', 'kpi', 'table']

/** Checks an LLM-proposed spec against the columns the query actually returned. */
export function validateSpec(spec: Partial<ChartSpec>, columns: string[]): string | null {
  if (!spec.chart || !CHART_KINDS.includes(spec.chart)) return `chart must be one of ${CHART_KINDS.join(', ')}`
  if (spec.chart === 'table') return null
  const y = Array.isArray(spec.y) ? spec.y : []
  if (!y.length) return 'y must list at least one numeric result column'
  const missing = [...y, ...(spec.chart === 'kpi' ? [] : [spec.x ?? ''])].filter((c) => !columns.includes(c))
  if (missing.length) return `columns not in the result: ${missing.join(', ')}. Result columns are: ${columns.join(', ')}`
  return null
}

export const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`

export const fmt = (v: unknown) =>
  typeof v === 'number' ? new Intl.NumberFormat('en', { maximumFractionDigits: Math.abs(v) < 10 ? 2 : 0, notation: Math.abs(v) >= 1e6 ? 'compact' : 'standard' }).format(v) : v === null || v === undefined ? '—' : String(v)
