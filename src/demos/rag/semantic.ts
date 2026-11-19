import { cosine, embed, tokenize, type Chunk } from './pipeline.ts'

/** Retrieval over the visitor's own documents: neural vectors when available, TF-IDF otherwise. */

export type Engine = 'minilm' | 'tfidf'

export interface IndexedChunk extends Chunk {
  vector: number[]
}

export interface DocIndex {
  engine: Engine
  chunks: IndexedChunk[]
  idf?: Map<string, number>
}

export interface Hit extends IndexedChunk {
  cosine: number
  coverage: number
  score: number
}

/** Minimum hybrid score to count as evidence; neural cosines sit on a higher scale than TF-IDF. */
export const MIN_SCORE: Record<Engine, number> = { minilm: 0.3, tfidf: 0.18 }

/** A hit is evidence when its hybrid score clears the bar, or (neural only) when meaning matches strongly without shared keywords. */
export const isEvidence = (engine: Engine, h: Hit) => h.score >= MIN_SCORE[engine] || (engine === 'minilm' && h.cosine >= 0.35)

/**
 * Once at least one hit is real evidence, the LLM gets every reasonably related passage from the
 * top-k: it is better at ignoring noise than at answering from a passage it never saw.
 */
export const isContext = (engine: Engine, h: Hit) => h.score >= MIN_SCORE[engine] / 2 || (engine === 'minilm' && h.cosine >= 0.2)

export function buildTfidfIndex(chunks: Chunk[]): DocIndex {
  const df = new Map<string, number>()
  chunks.forEach((c) => new Set(c.tokens).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)))
  const idf = new Map<string, number>()
  df.forEach((n, t) => idf.set(t, Math.log(1 + chunks.length / n)))
  return { engine: 'tfidf', idf, chunks: chunks.map((c) => ({ ...c, vector: embed(c.tokens, idf) })) }
}

/** Vector query: cosine similarity, then the same hybrid re-rank as the explorer (0.6·cos + 0.4·coverage). */
export function search(index: DocIndex, queryVector: number[], question: string, topK: number): Hit[] {
  const q = [...new Set(tokenize(question))]
  return index.chunks
    .map((c) => {
      const set = new Set(c.tokens)
      const coverage = q.length ? q.filter((t) => set.has(t)).length / q.length : 0
      const cos = Math.max(0, cosine(queryVector, c.vector))
      return { ...c, cosine: cos, coverage, score: 0.6 * cos + 0.4 * coverage }
    })
    .sort((a, b) => b.cosine - a.cosine)
    .slice(0, topK)
    .sort((a, b) => b.score - a.score)
}

export function tfidfQueryVector(index: DocIndex, question: string): number[] {
  return embed([...new Set(tokenize(question))], index.idf ?? new Map())
}

/**
 * Grounding check on a generated answer: keeps only [n] citations that point at a source the
 * model was actually given, and reports which ones were removed.
 */
export function checkCitations(answer: string, sourceCount: number): { text: string; cited: number[]; removed: number[] } {
  const cited = new Set<number>()
  const removed = new Set<number>()
  const text = answer
    // Some models (e.g. GPT-OSS) cite with full-width brackets: 【1】 → [1].
    .replace(/[【［]\s*(\d+(?:\s*[,，]\s*\d+)*)\s*[】］]/g, (_, g: string) => `[${g.replace(/，/g, ',')}]`)
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, group: string) => {
      const keep = group
        .split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => {
          const ok = n >= 1 && n <= sourceCount
          ;(ok ? cited : removed).add(n)
          return ok
        })
      return keep.length ? keep.map((n) => `[${n}]`).join('') : ''
    })
    .replace(/[ \t]+([.,;:])/g, '$1')
  return { text, cited: [...cited].sort((a, b) => a - b), removed: [...removed].sort((a, b) => a - b) }
}
