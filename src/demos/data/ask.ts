import { parseJson, type ChatMessage, type Llm } from '../../lib/llm'
import { query, type QueryResult } from '../../lib/duckdb'
import { guardSql } from '../../lib/sqlGuard'
import { validateSpec, type ChartSpec } from './spec'
import type { Profile } from './profile'

export interface Answer {
  caveat: string | null
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
{"sql": "...", "chart": "bar|line|area|pie|kpi|table", "x": "result column for categories or time", "y": ["numeric result columns"], "title": "short chart title", "explanation": "one sentence on how the query answers the question", "caveat": null}

Rules:
- One read-only SELECT (or WITH ... SELECT) statement on "${p.table}". Double-quote column names.
- Give every computed column a short snake_case alias, and use those aliases in x and y.
- Time series: strftime(date_trunc('month', col), '%Y-%m') AS month, ordered by time; chart "line" or "area".
- Rankings and "which is highest/lowest" questions: return the full ranking (ORDER BY the measure DESC, LIMIT 15), not only the top row, so the answer is seen in context; chart "bar". Shares of a whole with at most 6 groups: "pie".
- A single number: chart "kpi" with that column in y. Lists of records: chart "table".
- Round money and rates with ROUND(x, 2). Rates as percentages: ROUND(100.0 * ..., 1) AS ..._pct.
- caveat: null when the columns answer the question exactly. Otherwise one sentence saying what is missing and what the query shows instead (for example a proxy metric). Never present a proxy as the real metric.
- The data is read-only. If the question asks to delete, update or insert, do not pretend to: return a SELECT of the rows that would be affected and set caveat to "The data is read-only here: this shows the rows that would be affected, nothing was changed."`
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
      const out = parseJson<Partial<ChartSpec> & { sql?: string; explanation?: string; caveat?: string | null }>(reply.content)
      const guard = guardSql(out.sql ?? '')
      if (!guard.ok) throw new Error(guard.reason)
      const result = await query(guard.sql)
      const specError = validateSpec(out, result.columns.map((c) => c.name))
      if (specError) throw new Error(specError)
      const spec: ChartSpec = { title: out.title || question, chart: out.chart!, x: out.x, y: out.y ?? [] }
      const caveat = typeof out.caveat === 'string' && out.caveat.trim() ? out.caveat.trim() : null
      const insight = await summarise(llm, question, result, caveat, signal)
      tokens += insight.tokens
      return { spec, caveat, sql: out.sql!, explanation: out.explanation ?? '', insight: insight.text, result, attempts: attempt, tokens }
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      lastError = (e as Error).message
      messages.push({ role: 'user', content: `That failed: ${lastError}\nFix it and reply with the corrected JSON object only.` })
    }
  }
  throw new Error(`The model could not produce a valid query: ${lastError}`)
}

async function summarise(llm: Llm, question: string, r: QueryResult, caveat: string | null, signal?: AbortSignal) {
  if (!r.rows.length) return { text: 'The query returned no rows.', tokens: 0 }
  const reply = await llm.chat({
    signal,
    temperature: 0.3,
    maxTokens: 1024,
    messages: [
      {
        role: 'system',
        content:
          'You are a business analyst. In one or two complete sentences, state the key finding for the question, with the most important numbers and their units. Use only numbers present in the result. If a caveat is given, describe the result in its terms (e.g. as a proxy) and never claim more than it allows. The data is read-only: never say that anything was changed or deleted. No preamble, no markdown.',
      },
      { role: 'user', content: `Question: ${question}\n${caveat ? `Caveat: ${caveat}\n` : ''}Result (${r.rows.length} rows, first 40 shown): ${JSON.stringify(r.rows.slice(0, 40))}` },
    ],
  })
  return { text: reply.content?.trim() ?? '', tokens: reply.usage?.total_tokens ?? 0 }
}
