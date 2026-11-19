/**
 * Guards SQL written by an LLM (or a visitor) before it runs in the in-browser DuckDB.
 * Only one read-only SELECT/WITH statement, no file or network access, capped rows.
 */

export const MAX_ROWS = 1000

const FORBIDDEN =
  /\b(insert|update|delete|drop|create|alter|attach|detach|copy|export|import|install|load|pragma|set|reset|call|checkpoint|vacuum|truncate|grant)\b|\b(read_\w+|glob|sniff_csv|parquet_\w+|httpfs)\s*\(|https?:|s3:/i

/** Strips comments and string literals so keyword checks don't trip on data values. */
function skeleton(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
}

export type GuardResult = { ok: true; sql: string } | { ok: false; reason: string }

export function guardSql(input: string): GuardResult {
  const sql = input.trim().replace(/;\s*$/, '')
  if (!sql) return { ok: false, reason: 'The query is empty.' }
  const sk = skeleton(sql)
  if (sk.includes(';')) return { ok: false, reason: 'Only one statement can run at a time.' }
  if (!/^\s*(select|with)\b/i.test(sk)) return { ok: false, reason: 'Only SELECT or WITH queries can run.' }
  const bad = sk.match(FORBIDDEN)
  if (bad) return { ok: false, reason: `"${bad[0].replace(/\s*\($/, '')}" is not allowed: queries are read-only and cannot access files or the network.` }
  return { ok: true, sql: `SELECT * FROM (${sql}) AS q LIMIT ${MAX_ROWS}` }
}

/** Safe identifier for a table created from an uploaded file name. */
export function tableName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  return /^[a-z_]/.test(base) ? base.slice(0, 40) : `t_${base}`.slice(0, 40)
}
