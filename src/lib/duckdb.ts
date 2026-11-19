/** In-browser analytical SQL (DuckDB-WASM). The engine (~7 MB) loads from jsDelivr on first use. */
import * as duckdb from '@duckdb/duckdb-wasm'
import { generateRetailCsv } from './demoData'

export type Row = Record<string, string | number | boolean | null>
export interface QueryResult {
  columns: { name: string; type: string }[]
  rows: Row[]
}

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null

export function getDb(): Promise<duckdb.AsyncDuckDB> {
  dbPromise ??= (async () => {
    const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles())
    // Cross-origin workers aren't allowed, so the CDN worker is started through a same-origin blob.
    const url = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }))
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(url))
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
    URL.revokeObjectURL(url)
    return db
  })().catch((e) => {
    dbPromise = null
    throw e
  })
  return dbPromise
}

function toJs(value: unknown, type: string): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') return Number(value)
  if (/^(Date|Timestamp)/.test(type)) {
    const d = new Date(typeof value === 'number' ? value : String(value))
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, type.startsWith('Date') ? 10 : 19).replace('T', ' ')
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value
  return String(value)
}

/** Runs SQL as-is: callers must pass it through guardSql first when it comes from an LLM or a visitor. */
export async function query(sql: string): Promise<QueryResult> {
  const conn = await (await getDb()).connect()
  try {
    const table = await conn.query(sql)
    const columns = table.schema.fields.map((f) => ({ name: f.name, type: String(f.type) }))
    const rows = table.toArray().map((r) => {
      const o = r.toJSON() as Record<string, unknown>
      const out: Row = {}
      columns.forEach((c) => (out[c.name] = toJs(o[c.name], c.type)))
      return out
    })
    return { columns, rows }
  } finally {
    await conn.close()
  }
}

/** Loads CSV text into a table (types are inferred by DuckDB). Table name must be pre-sanitised. */
export async function loadCsv(table: string, csv: string): Promise<void> {
  const db = await getDb()
  await db.registerFileText(`${table}.csv`, csv)
  await query(`CREATE OR REPLACE TABLE "${table}" AS SELECT * FROM read_csv_auto('${table}.csv', header = true)`)
}

let demoLoaded: Promise<void> | null = null

/** The synthetic retail dataset shared by the data demo and the agent's query_data tool. */
export function ensureDemoTable(): Promise<void> {
  demoLoaded ??= loadCsv('retail_sales', generateRetailCsv()).catch((e) => {
    demoLoaded = null
    throw e
  })
  return demoLoaded
}
