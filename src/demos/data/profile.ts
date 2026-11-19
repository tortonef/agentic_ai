import { query, type QueryResult } from '../../lib/duckdb'
import { quoteIdent, type ChartSpec } from './spec'

export type ColumnKind = 'number' | 'date' | 'text' | 'bool'

export interface ColumnProfile {
  name: string
  type: string
  kind: ColumnKind
  nullPct: number
  distinct: number
  min: string | null
  max: string | null
}

export interface Profile {
  table: string
  rows: number
  columns: ColumnProfile[]
}

const kindOf = (t: string): ColumnKind =>
  /INT|DOUBLE|DECIMAL|FLOAT|REAL|NUMERIC/i.test(t) ? 'number' : /DATE|TIMESTAMP/i.test(t) ? 'date' : /BOOL/i.test(t) ? 'bool' : 'text'

export async function profileTable(table: string): Promise<Profile> {
  const t = quoteIdent(table)
  const [summary, count] = await Promise.all([
    query(
      `SELECT column_name, column_type, CAST(min AS VARCHAR) AS min, CAST(max AS VARCHAR) AS max,
              CAST(approx_unique AS BIGINT) AS distinct_values, CAST(null_percentage AS DOUBLE) AS null_pct
       FROM (SUMMARIZE ${t})`,
    ),
    query(`SELECT COUNT(*) AS n FROM ${t}`),
  ])
  return {
    table,
    rows: Number(count.rows[0].n),
    columns: summary.rows.map((r) => ({
      name: String(r.column_name),
      type: String(r.column_type),
      kind: kindOf(String(r.column_type)),
      nullPct: Number(r.null_pct ?? 0),
      distinct: Number(r.distinct_values ?? 0),
      min: r.min === null ? null : String(r.min),
      max: r.max === null ? null : String(r.max),
    })),
  }
}

export interface QualityIssue {
  severity: 'error' | 'warn' | 'ok'
  check: string
  detail: string
}

/** Rule-based data quality checks: duplicates, missing values, robust z-score outliers. */
export async function qualityChecks(p: Profile): Promise<QualityIssue[]> {
  const t = quoteIdent(p.table)
  const issues: QualityIssue[] = []

  const dup = await query(`SELECT (SELECT COUNT(*) FROM ${t}) - (SELECT COUNT(*) FROM (SELECT DISTINCT * FROM ${t})) AS d`)
  const d = Number(dup.rows[0].d)
  issues.push(d ? { severity: 'error', check: 'Duplicate rows', detail: `${d} rows are exact copies of another row.` } : { severity: 'ok', check: 'Duplicate rows', detail: 'No exact duplicates.' })

  const missing = p.columns.filter((c) => c.nullPct > 0)
  if (missing.length)
    missing.forEach((c) =>
      issues.push({ severity: c.nullPct > 20 ? 'error' : 'warn', check: `Missing values: ${c.name}`, detail: `${c.nullPct.toFixed(1)}% of rows (${Math.round((c.nullPct / 100) * p.rows)}) have no value.` }),
    )
  else issues.push({ severity: 'ok', check: 'Missing values', detail: 'Every column is complete.' })

  // Robust z-score: distance from the median in units of MAD, so outliers don't hide themselves.
  const numeric = p.columns.filter((c) => c.kind === 'number' && c.distinct > 10).slice(0, 6)
  for (const c of numeric) {
    const col = quoteIdent(c.name)
    const r = await query(
      `WITH s AS (SELECT median(${col}) AS m FROM ${t}),
            d AS (SELECT median(abs(${col} - s.m)) AS mad FROM ${t}, s)
       SELECT COUNT(*) FILTER (WHERE d.mad > 0 AND abs(${col} - s.m) / (1.4826 * d.mad) > 4) AS n,
              any_value(s.m) AS m FROM ${t}, s, d`,
    )
    const n = Number(r.rows[0].n)
    if (n) issues.push({ severity: 'warn', check: `Outliers: ${c.name}`, detail: `${n} values are more than 4 robust deviations from the median (${Number(r.rows[0].m).toLocaleString('en')}).` })
  }
  if (numeric.length && !issues.some((i) => i.check.startsWith('Outliers')))
    issues.push({ severity: 'ok', check: 'Outliers', detail: `No extreme values in ${numeric.map((c) => c.name).join(', ')}.` })

  return issues
}

const MEASURE_HINTS = [/revenue|sales|turnover/i, /amount|total|value|profit|cost/i, /qty|quantity|units/i, /price/i]

/** Picks 3–4 useful starter charts from column types alone. */
export function suggestCharts(p: Profile): (ChartSpec & { sql: string })[] {
  const t = quoteIdent(p.table)
  const numeric = p.columns.filter((c) => c.kind === 'number' && !/(^|_)id$/i.test(c.name))
  // Hints are ordered by priority: revenue beats units even if units comes first in the file.
  const hint = MEASURE_HINTS.map((h) => numeric.find((c) => h.test(c.name))).find(Boolean)
  const measure = hint ?? numeric[0]
  const dims = p.columns.filter((c) => (c.kind === 'text' || c.kind === 'bool') && c.distinct >= 2 && c.distinct <= 15)
  const date = p.columns.find((c) => c.kind === 'date')
  const out: (ChartSpec & { sql: string })[] = []
  const agg = measure ? `ROUND(SUM(${quoteIdent(measure.name)}), 2)` : 'COUNT(*)'
  const aggName = measure ? `total_${measure.name}` : 'row_count'

  out.push({ title: measure ? `Total ${measure.name}` : 'Rows', chart: 'kpi', y: [aggName], sql: `SELECT ${agg} AS ${quoteIdent(aggName)} FROM ${t}` })
  if (date)
    out.push({
      title: `${measure ? measure.name : 'Rows'} by month`,
      chart: 'area',
      x: 'month',
      y: [aggName],
      sql: `SELECT strftime(date_trunc('month', ${quoteIdent(date.name)}), '%Y-%m') AS month, ${agg} AS ${quoteIdent(aggName)} FROM ${t} GROUP BY 1 ORDER BY 1`,
    })
  if (dims[0])
    out.push({
      title: `${measure ? measure.name : 'Rows'} by ${dims[0].name}`,
      chart: 'bar',
      x: dims[0].name,
      y: [aggName],
      sql: `SELECT ${quoteIdent(dims[0].name)}, ${agg} AS ${quoteIdent(aggName)} FROM ${t} GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
    })
  const pieDim = dims.find((c, i) => i > 0 && c.distinct <= 6) ?? (dims[0] && dims[0].distinct <= 6 ? dims[0] : undefined)
  if (pieDim)
    out.push({
      title: `Share of rows by ${pieDim.name}`,
      chart: 'pie',
      x: pieDim.name,
      y: ['rows'],
      sql: `SELECT CAST(${quoteIdent(pieDim.name)} AS VARCHAR) AS ${quoteIdent(pieDim.name)}, COUNT(*) AS rows FROM ${t} GROUP BY 1 ORDER BY 2 DESC`,
    })
  return out
}

export type ChartData = ChartSpec & { sql: string; result: QueryResult }

export async function runCharts(specs: (ChartSpec & { sql: string })[]): Promise<ChartData[]> {
  return Promise.all(specs.map(async (s) => ({ ...s, result: await query(s.sql) })))
}
