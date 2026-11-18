// Run with: npm test  (Node strips the TypeScript types natively)
import assert from 'node:assert/strict'
import { documents, suggestedQuestions } from '../src/demos/rag/documents.ts'
import { runPipeline, chunkDoc } from '../src/demos/rag/pipeline.ts'
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

console.log('logic checks passed')
