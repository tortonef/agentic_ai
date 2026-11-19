import { parseJson, type ChatMessage, type Llm } from '../../lib/llm'
import { query, type QueryResult } from '../../lib/duckdb'
import { guardSql } from '../../lib/sqlGuard'
import { validateSpec, type ChartSpec } from './spec'
import type { Profile } from './profile'

export interface Answer {
  spec: ChartSpec
  sql: string
  explanation: string
  insight: string
  result: QueryResult
  attempts: number
  tokens: number
}

function schemaPrompt(p: Profile, sample: QueryResult): string {
  const cols = p.columns
    .map((c) => `- "${c.name}" ${c.type}${c.kind === 'text' && c.distinct <= 15 ? ` (about ${c.distinct} distinct values)` : ''}${c.min !== null ? ` range ${c.min} … ${c.max}` : ''}`)
    .join('\n')
  return `You are a senior data analyst. Write DuckDB SQL over one table and choose how to chart the result.

Table "${p.table}" (${p.rows} rows). Columns:
${cols}

Sample rows (JSON):
${JSON.stringify(sample.rows.slice(0, 3))}

Reply with ONLY a JSON object:
{"sql": "...", "chart": "bar|line|area|pie|kpi|table", "x": "result column for categories or time", "y": ["numeric result columns"], "title": "short chart title", "explanation": "one sentence on how the query answers the question"}

Rules:
- One read-only SELECT (or WITH ... SELECT) statement on "${p.table}". Double-quote column names.
- Give every computed column a short snake_case alias, and use those aliases in x and y.
- Time series: strftime(date_trunc('month', col), '%Y-%m') AS month, ordered by time; chart "line" or "area".
- Rankings: ORDER BY the measure DESC and LIMIT 15; chart "bar". Shares of a whole with at most 6 groups: "pie".
- A single number: chart "kpi" with that column in y. Lists of records: chart "table".
- Round money and rates with ROUND(x, 2). Rates as percentages: ROUND(100.0 * ..., 1) AS ..._pct.
- If the question cannot be answered from these columns, return a query that shows the closest useful data and say so in explanation.`
}

/** Question → SQL + chart spec (JSON mode) → guarded execution, with one repair round trip. */
export async function askData(llm: Llm, p: Profile, question: string, signal?: AbortSignal): Promise<Answer> {
  const sample = await query(`SELECT * FROM "${p.table}" LIMIT 3`)
  const messages: ChatMessage[] = [
    { role: 'system', content: schemaPrompt(p, sample) },
    { role: 'user', content: question },
  ]
  let tokens = 0
  let lastError = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    const reply = await llm.chat({ messages, json: true, signal })
    tokens += reply.usage?.total_tokens ?? 0
    messages.push({ role: 'assistant', content: reply.content })
    try {
      const out = parseJson<Partial<ChartSpec> & { sql?: string; explanation?: string }>(reply.content)
      const guard = guardSql(out.sql ?? '')
      if (!guard.ok) throw new Error(guard.reason)
      const result = await query(guard.sql)
      const specError = validateSpec(out, result.columns.map((c) => c.name))
      if (specError) throw new Error(specError)
      const spec: ChartSpec = { title: out.title || question, chart: out.chart!, x: out.x, y: out.y ?? [] }
      const insight = await summarise(llm, question, result, signal)
      tokens += insight.tokens
      return { spec, sql: out.sql!, explanation: out.explanation ?? '', insight: insight.text, result, attempts: attempt, tokens }
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      lastError = (e as Error).message
      messages.push({ role: 'user', content: `That failed: ${lastError}\nFix it and reply with the corrected JSON object only.` })
    }
  }
  throw new Error(`The model could not produce a valid query: ${lastError}`)
}

async function summarise(llm: Llm, question: string, r: QueryResult, signal?: AbortSignal) {
  if (!r.rows.length) return { text: 'The query returned no rows.', tokens: 0 }
  const reply = await llm.chat({
    signal,
    temperature: 0.3,
    maxTokens: 300,
    messages: [
      { role: 'system', content: 'You are a business analyst. In at most two short sentences, state the key finding in the data for the question. Use only numbers present in the data. No preamble, no markdown.' },
      { role: 'user', content: `Question: ${question}\nResult (${r.rows.length} rows, first 40 shown): ${JSON.stringify(r.rows.slice(0, 40))}` },
    ],
  })
  return { text: reply.content?.trim() ?? '', tokens: reply.usage?.total_tokens ?? 0 }
}
