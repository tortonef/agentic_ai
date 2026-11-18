import { hash } from '../../lib/random.ts'
import type { SourceDoc } from './documents.ts'

/**
 * A real (if small) lexical RAG pipeline:
 * sentence-aware chunking → feature-hashed TF-IDF "embeddings" → cosine retrieval →
 * hybrid re-ranking → context assembly → extractive answer with citations.
 * shortcut: lexical vectors, not neural embeddings, so synonyms don't match; swap embed() for a real model to upgrade.
 */

export const DIM = 64

const STOP = new Set(
  'a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those i you we they he she my your our can may must should will would do does did not no so than then there here what which who whom how when where why up out about into over after before per any all each also only such'.split(' '),
)

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t))
}

export function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((s) => s.trim()) ?? [text]
}

export interface Chunk {
  id: string
  docId: string
  docTitle: string
  index: number
  text: string
  tokens: string[]
}

/** Groups whole sentences until ~targetWords; optional one-sentence overlap between chunks. */
export function chunkDoc(doc: SourceDoc, targetWords: number, overlap: boolean): Chunk[] {
  const sents = sentences(doc.text)
  const chunks: Chunk[] = []
  let buf: string[] = []
  const flush = () => {
    const text = buf.join(' ')
    chunks.push({ id: `${doc.id}#${chunks.length + 1}`, docId: doc.id, docTitle: doc.title, index: chunks.length + 1, text, tokens: tokenize(text) })
  }
  for (let i = 0; i < sents.length; i++) {
    buf.push(sents[i])
    if (buf.join(' ').split(/\s+/).length >= targetWords && i < sents.length - 1) {
      flush()
      buf = overlap ? [sents[i]] : []
    }
  }
  if (buf.length) flush()
  return chunks
}

export type Vector = number[]

/** TF-IDF weights hashed into DIM buckets (the "hashing trick"), then L2-normalised. */
export function embed(tokens: string[], idf: Map<string, number>): Vector {
  const v = new Array<number>(DIM).fill(0)
  const tf = new Map<string, number>()
  tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1))
  tf.forEach((count, term) => {
    const h = hash(term)
    const sign = h & 1 ? 1 : -1 // signed hashing reduces collision bias
    v[h % DIM] += sign * (1 + Math.log(count)) * (idf.get(term) ?? 1)
  })
  const norm = Math.hypot(...v) || 1
  return v.map((x) => x / norm)
}

export const cosine = (a: Vector, b: Vector) => a.reduce((s, x, i) => s + x * b[i], 0)

export interface Scored extends Chunk {
  vector: Vector
  cosine: number
  coverage: number
  score: number
  retrievalRank: number
  finalRank: number
}

export interface PipelineResult {
  chunks: (Chunk & { vector: Vector })[]
  queryTokens: string[]
  queryVector: Vector
  retrieved: Scored[]
  reranked: Scored[]
  context: string
  answer: { text: string; cite: number }[] | null
}

export const RELEVANCE_THRESHOLD = 0.18

export function runPipeline(docs: SourceDoc[], question: string, opts: { chunkWords: number; overlap: boolean; topK: number }): PipelineResult {
  const raw = docs.flatMap((d) => chunkDoc(d, opts.chunkWords, opts.overlap))
  const df = new Map<string, number>()
  raw.forEach((c) => new Set(c.tokens).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)))
  const idf = new Map<string, number>()
  df.forEach((n, t) => idf.set(t, Math.log(1 + raw.length / n)))

  const chunks = raw.map((c) => ({ ...c, vector: embed(c.tokens, idf) }))
  const queryTokens = [...new Set(tokenize(question))]
  const queryVector = embed(queryTokens, idf)

  const scored = chunks
    .map((c) => {
      const set = new Set(c.tokens)
      const coverage = queryTokens.length ? queryTokens.filter((t) => set.has(t)).length / queryTokens.length : 0
      const cos = Math.max(0, cosine(queryVector, c.vector))
      return { ...c, cosine: cos, coverage, score: 0.6 * cos + 0.4 * coverage, retrievalRank: 0, finalRank: 0 }
    })
    .sort((a, b) => b.cosine - a.cosine)

  const retrieved = scored.slice(0, opts.topK).map((c, i) => ({ ...c, retrievalRank: i + 1 }))
  const reranked = [...retrieved].sort((a, b) => b.score - a.score).map((c, i) => ({ ...c, finalRank: i + 1 }))
  const grounded = reranked.filter((c) => c.score >= RELEVANCE_THRESHOLD)

  const context = grounded.map((c, i) => `[${i + 1}] (${c.docTitle})\n${c.text}`).join('\n\n')

  return { chunks, queryTokens, queryVector, retrieved, reranked, context, answer: grounded.length ? extractAnswer(grounded, queryTokens) : null }
}

/** Picks the sentences that best cover the question, citing the context chunk they came from. */
function extractAnswer(context: Scored[], queryTokens: string[]) {
  const q = new Set(queryTokens)
  const candidates = context.slice(0, 3).flatMap((c, ci) =>
    sentences(c.text).map((s, si) => {
      const toks = new Set(tokenize(s))
      const hits = [...q].filter((t) => toks.has(t)).length
      // Earlier context chunks win ties: they ranked higher.
      return { text: s, cite: ci + 1, score: hits + c.score - ci * 0.01 - si * 0.001 }
    }),
  )
  const best = candidates.filter((c) => c.score >= 1).sort((a, b) => b.score - a.score)
  const picked: typeof best = []
  for (const c of best) {
    if (picked.length >= 2) break
    if (!picked.some((p) => p.text === c.text)) picked.push(c)
  }
  return picked.length ? picked.map(({ text, cite }) => ({ text, cite })) : null
}
