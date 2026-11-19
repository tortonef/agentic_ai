// Run with: npm test  (Node strips the TypeScript types natively)
import assert from 'node:assert/strict'
import { documents, suggestedQuestions } from '../src/demos/rag/documents.ts'
import { runPipeline, chunkDoc, sentences } from '../src/demos/rag/pipeline.ts'
import { buildRun, classify } from '../src/demos/agents/engine.ts'

const opts = { chunkWords: 45, overlap: false, topK: 4 }

// Every suggested question must be answered from the expected document.
const expected = ['remote', 'faq', 'incident', 'ai', 'expenses']
suggestedQuestions.forEach((q, i) => {
  const r = runPipeline(documents, q, opts)
  assert.ok(r.answer, `no answer for: ${q}`)
  assert.equal(r.reranked[0].docId, expected[i], `wrong top doc for: ${q}`)
})

// Off-topic questions must not be "answered" (grounding threshold works).
assert.equal(runPipeline(documents, 'Who won the football world cup?', opts).answer, null)

// Chunking keeps every sentence and respects overlap.
const plain = chunkDoc(documents[0], 30, false)
assert.equal(plain.map((c) => c.text).join(' '), documents[0].text)
assert.ok(chunkDoc(documents[0], 30, true).length >= plain.length)

// Agent runs are deterministic and routed by intent.
assert.deepEqual(buildRun('Research EV chargers'), buildRun('Research EV chargers'))
assert.equal(classify('Automate invoice processing'), 'automation')
assert.equal(classify('Generate a quarterly KPI report'), 'report')
assert.equal(classify('Research the coffee market'), 'market')
assert.equal(buildRun('x').steps.at(-1)?.node, 'output')


// ── Live Lab logic ─────────────────────────────────────────────────────────
import { calculate } from '../src/lib/calc.ts'
import { guardSql, tableName } from '../src/lib/sqlGuard.ts'
import { assess, presets, briefMarkdown } from '../src/demos/canvas/scoring.ts'
import { runAgent, type AgentEvent } from '../src/demos/agents/loop.ts'
import { checkCitations, buildTfidfIndex, search, tfidfQueryVector } from '../src/demos/rag/semantic.ts'
import { validateSpec } from '../src/demos/data/spec.ts'
import { generateRetailCsv } from '../src/lib/demoData.ts'

// Calculator: precedence, functions, percentages; no code execution.
assert.equal(calculate('2 + 3 * 4'), 14)
assert.equal(calculate('2^3^2'), 512)
assert.equal(calculate('-(4 - 10) / 3'), 2)
assert.equal(calculate('round((1520 - 1310) / 1310 * 100, 1)'), 16)
assert.equal(calculate('200 * 15%'), 30)
assert.equal(calculate('10 % 3'), 1)
assert.equal(calculate('1,250 + 50'), 1300)
for (const bad of ['alert(1)', 'constructor', '1/0', '2 +', '(1', 'process.exit()']) assert.throws(() => calculate(bad), `calculator accepted: ${bad}`)

// SQL guard: one read-only statement, no files or network, capped rows.
assert.ok(guardSql('SELECT region, SUM(revenue) FROM retail_sales GROUP BY 1').ok)
assert.ok(guardSql("WITH x AS (SELECT 1) SELECT * FROM x;").ok)
assert.ok(guardSql("SELECT replace(store, 'a', 'b') FROM t WHERE note = 'drop table; delete'").ok, 'keywords inside strings must not trip the guard')
const g = guardSql('select 1')
assert.ok(g.ok && g.sql.endsWith('LIMIT 1000'))
for (const bad of ['DROP TABLE t', 'SELECT 1; DELETE FROM t', "SELECT * FROM read_csv('https://evil.example/x.csv')", 'INSTALL httpfs', "COPY t TO 'out.csv'", 'ATTACH \'x.db\'', '']) assert.equal(guardSql(bad).ok, false, `guard accepted: ${bad}`)
assert.equal(tableName('Sales 2025 (final).csv'), 'sales_2025_final')
assert.equal(tableName('2025.csv'), 't_2025')

// Demo dataset is deterministic and contains the planted issues.
const csv = generateRetailCsv()
assert.equal(csv, generateRetailCsv())
assert.ok(csv.split('\n').length > 2400)

// Chart specs are checked against real result columns.
assert.equal(validateSpec({ chart: 'bar', x: 'region', y: ['revenue'] }, ['region', 'revenue']), null)
assert.match(validateSpec({ chart: 'bar', x: 'month', y: ['revenue'] }, ['region', 'revenue']) ?? '', /month/)
assert.ok(validateSpec({ chart: 'pizza' as never, y: [] }, []))

// Use-case scoring: transparent arithmetic and sensible verdicts.
const sd = assess(presets[0].input)
assert.equal(Math.round(sd.hoursPerYear), 7200) // 3000 × 12 × 12 min / 60
assert.equal(Math.round(sd.hoursSaved), 2520) // 35%
assert.equal(Math.round(sd.annualValue), Math.round(2520 * 35 + 3000 * 12 * 0.08 * 40 * 0.35))
assert.equal(assess(presets[3].input).riskScore >= 70, true, 'credit decisions must be high risk')
assert.match(assess(presets[3].input).oversight, /every output/)
assert.equal(assess({ ...presets[0].input, volumePerMonth: 0 }).quadrant.id === 'now', false)
assert.ok(briefMarkdown(presets[0].input, sd).includes('estimates computed from the stated assumptions'))

// RAG grounding: citations to sources the model never saw are removed.
const cc = checkCitations('Three days [1]. Budget is 600 euros [2][7]. Made up [9].', 2)
assert.deepEqual(cc.removed, [7, 9])
assert.equal(cc.text, 'Three days [1]. Budget is 600 euros [2]. Made up.')
assert.equal(checkCitations('Two certs【1】 and more【2，3】.', 2).text, 'Two certs[1] and more[2].')
const idx = buildTfidfIndex(documents.flatMap((d) => chunkDoc(d, 60, true)))
assert.equal(search(idx, tfidfQueryVector(idx, 'meal allowance international travel'), 'meal allowance international travel', 3)[0].docId, 'expenses')

// Agent loop with a scripted fake LLM: tool calls, unknown tools, step cap.
const scripted = (replies: { content?: string; calls?: [string, object][] }[]) => {
  let n = 0
  return {
    model: 'fake',
    async chat() {
      const r = replies[Math.min(n++, replies.length - 1)]
      return { content: r.content ?? null, toolCalls: (r.calls ?? []).map(([name, args], i) => ({ id: `c${n}${i}`, type: 'function' as const, function: { name, arguments: JSON.stringify(args) } })), usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }
    },
  }
}
const calcTool = { id: 'calculator', def: { type: 'function' as const, function: { name: 'calculator', description: '', parameters: {} } }, run: async (a: Record<string, unknown>) => String(calculate(String(a.expression))) }
const ev: AgentEvent[] = []
const run1 = await runAgent({
  llm: scripted([{ content: 'Computing.', calls: [['calculator', { expression: '6*7' }], ['web_search', { q: 'x' }]] }, { content: 'The answer is 42. 【3†L1-L2】' }]),
  objective: 'What is 6 times 7?',
  tools: [calcTool],
  onEvent: (e) => ev.push(e),
})
assert.equal(run1.final, 'The answer is 42.')
assert.equal(run1.steps, 2)
assert.equal(run1.tokens, 4)
const results = ev.filter((e) => e.type === 'tool_result')
assert.deepEqual(results.map((r) => r.type === 'tool_result' && [r.name, r.ok]), [['calculator', true], ['web_search', false]])
assert.equal(results[0].type === 'tool_result' && results[0].result, '42')
const run2 = await runAgent({ llm: scripted([{ calls: [['calculator', { expression: '1+1' }]] }]), objective: 'loop forever', tools: [calcTool], onEvent: () => {}, maxSteps: 3 })
assert.equal(run2.stoppedAtCap, true)
assert.equal(run2.final, null)

// Abbreviations like "M.S." stay inside one sentence.
assert.deepEqual(sentences('Education. M.S. in Physics at La Sapienza. Thesis on AI.'), ['Education.', 'M.S. in Physics at La Sapienza.', 'Thesis on AI.'])

console.log('logic checks passed')
