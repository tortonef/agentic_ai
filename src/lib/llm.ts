/**
 * Minimal Groq client (OpenAI-compatible API), called straight from the browser with the
 * visitor's own key. No backend: the key goes only to api.groq.com.
 */

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string }

export interface ToolDef {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export interface Usage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ChatResult {
  content: string | null
  /** Reasoning text, for models that return it separately (e.g. GPT-OSS on Groq). */
  reasoning?: string
  toolCalls: ToolCall[]
  usage?: Usage
}

export interface ChatOptions {
  messages: ChatMessage[]
  tools?: ToolDef[]
  json?: boolean
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface Llm {
  model: string
  chat(opts: ChatOptions): Promise<ChatResult>
}

export const MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (default)' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (faster)' },
]

const BASE = 'https://api.groq.com/openai/v1'

export class LlmError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function explain(status: number, body: string): string {
  if (status === 401) return 'The Groq key was rejected. Check it and connect again.'
  if (status === 429) return 'Groq rate limit reached for this key. Wait a minute and try again.'
  if (status === 413) return 'The request is too large for this model. Try a smaller input.'
  try {
    return JSON.parse(body).error?.message ?? `Groq error ${status}`
  } catch {
    return `Groq error ${status}`
  }
}

async function call(key: string, path: string, init: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(BASE + path, { ...init, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new LlmError(0, 'Could not reach Groq. Check your connection.')
  }
  const text = await res.text()
  if (!res.ok) throw new LlmError(res.status, explain(res.status, text))
  return JSON.parse(text)
}

/** Cheap check that a key works, used when the visitor connects. */
export async function verifyKey(key: string, signal?: AbortSignal): Promise<void> {
  await call(key, '/models', { method: 'GET', signal })
}

export function createGroq(key: string, model: string): Llm {
  return {
    model,
    async chat({ messages, tools, json, temperature = 0.2, maxTokens = 1500, signal }) {
      const data = (await call(key, '/chat/completions', {
        method: 'POST',
        signal,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_completion_tokens: maxTokens,
          ...(tools?.length ? { tools, tool_choice: 'auto' } : {}),
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      })) as { choices: { message: { content: string | null; reasoning?: string; tool_calls?: ToolCall[] } }[]; usage?: Usage }
      const msg = data.choices[0]?.message
      return { content: msg?.content ?? null, reasoning: msg?.reasoning, toolCalls: msg?.tool_calls ?? [], usage: data.usage }
    },
  }
}

/** Parses a JSON reply, tolerating a ```json fence some models add even in JSON mode. */
export function parseJson<T>(text: string | null): T {
  const clean = (text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')
  return JSON.parse(clean) as T
}
