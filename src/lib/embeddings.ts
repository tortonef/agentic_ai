/** Neural sentence embeddings computed in the browser by a Web Worker. */

export interface EmbedProgress {
  phase: 'download' | 'embed'
  done: number
  total: number
}

type Reply =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'result'; id: number; vectors: number[][] }
  | { type: 'error'; id: number; message: string }

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (v: number[][]) => void; reject: (e: Error) => void }>()
let onDownload: ((p: EmbedProgress) => void) | null = null

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./embed.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<Reply>) => {
    const msg = e.data
    if (msg.type === 'progress') return onDownload?.({ phase: 'download', done: msg.loaded, total: msg.total })
    const p = pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    if (msg.type === 'result') p.resolve(msg.vectors)
    else p.reject(new Error(msg.message))
  }
  worker.onerror = (e) => {
    pending.forEach((p) => p.reject(new Error(e.message || 'Embedding worker failed')))
    pending.clear()
    worker = null
  }
  return worker
}

function send(texts: string[]): Promise<number[][]> {
  const id = ++seq
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, texts })
  })
}

/** Embeds texts in batches so the caller can show progress; vectors are L2-normalised. */
export async function embedTexts(texts: string[], onProgress?: (p: EmbedProgress) => void): Promise<number[][]> {
  onDownload = onProgress ?? null
  const out: number[][] = []
  const BATCH = 16
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...(await send(texts.slice(i, i + BATCH))))
    onProgress?.({ phase: 'embed', done: Math.min(i + BATCH, texts.length), total: texts.length })
  }
  return out
}

export const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
