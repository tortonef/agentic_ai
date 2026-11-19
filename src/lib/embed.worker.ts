/// <reference lib="webworker" />
// Runs a small sentence-embedding model (all-MiniLM-L6-v2, ~23 MB quantized) off the main thread.
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers'

env.allowLocalModels = false

let extractor: Promise<FeatureExtractionPipeline> | null = null

function load() {
  extractor ??= pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    dtype: 'q8',
    progress_callback: (p) => {
      if (p.status === 'progress_total') postMessage({ type: 'progress', loaded: p.loaded, total: p.total })
    },
  }) as Promise<FeatureExtractionPipeline>
  return extractor
}

self.onmessage = async (e: MessageEvent<{ id: number; texts: string[] }>) => {
  const { id, texts } = e.data
  try {
    const model = await load()
    const out = await model(texts, { pooling: 'mean', normalize: true })
    postMessage({ type: 'result', id, vectors: out.tolist() as number[][] })
  } catch (err) {
    extractor = null
    postMessage({ type: 'error', id, message: (err as Error).message ?? String(err) })
  }
}
