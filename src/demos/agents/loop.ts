import type { ChatMessage, Llm, ToolDef } from '../../lib/llm'

/** A tool the agent may call. `run` returns the observation text the model will read. */
export interface AgentTool {
  id: string
  def: ToolDef
  run(args: Record<string, unknown>): Promise<string>
}

export type AgentEvent =
  | { type: 'thought'; step: number; text: string }
  | { type: 'tool_call'; step: number; id: string; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; step: number; id: string; name: string; ok: boolean; result: string }
  | { type: 'final'; step: number; text: string }

export interface AgentRun {
  final: string | null
  steps: number
  tokens: number
  stoppedAtCap: boolean
}

export const MAX_STEPS = 8
const MAX_OBSERVATION = 4000

export function systemPrompt(tools: AgentTool[]): string {
  return `You are a careful business analyst agent. Work towards the user's objective in small steps.
- Use the tools when they help; never invent data a tool could give you. Do arithmetic with the calculator, not in your head.
- Before you recommend or commit to an action that spends money, changes a price or affects customers, call ask_human with the proposed action${tools.some((t) => t.id === 'ask_human') ? '' : ' (that tool is disabled here, so say the action needs human approval instead)'}. If the human rejects it, adapt.
- Before each tool call, say in one short sentence what you are about to do and why.
- Finish with a concise answer in plain text: the result, the key numbers with their source (which tool), and any open risks. No markdown tables.
Available tools: ${tools.map((t) => t.def.function.name).join(', ') || 'none'}.`
}

/**
 * The agent loop: model → tool calls → observations → model, until it answers without calling
 * a tool or reaches the step cap. Tools are a fixed catalog; unknown tools return an error the
 * model can read instead of crashing the run.
 */
export async function runAgent(opts: {
  llm: Llm
  objective: string
  tools: AgentTool[]
  onEvent: (e: AgentEvent) => void
  signal?: AbortSignal
  maxSteps?: number
}): Promise<AgentRun> {
  const { llm, objective, tools, onEvent, signal, maxSteps = MAX_STEPS } = opts
  const byName = new Map(tools.map((t) => [t.def.function.name, t]))
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(tools) },
    { role: 'user', content: objective },
  ]
  let tokens = 0

  for (let step = 1; step <= maxSteps; step++) {
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError')
    const reply = await llm.chat({ messages, tools: tools.map((t) => t.def), signal, temperature: 0.2 })
    tokens += reply.usage?.total_tokens ?? 0
    const thought = (reply.toolCalls.length ? reply.content : null) ?? reply.reasoning
    if (thought?.trim()) onEvent({ type: 'thought', step, text: thought.trim() })

    if (!reply.toolCalls.length) {
      const text = reply.content?.trim() || 'The agent finished without a written answer.'
      onEvent({ type: 'final', step, text })
      return { final: text, steps: step, tokens, stoppedAtCap: false }
    }

    messages.push({ role: 'assistant', content: reply.content, tool_calls: reply.toolCalls })
    for (const call of reply.toolCalls) {
      let args: Record<string, unknown> = {}
      let result: string
      let ok = true
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {}
      } catch {
        ok = false
      }
      onEvent({ type: 'tool_call', step, id: call.id, name: call.function.name, args })
      const tool = byName.get(call.function.name)
      if (!ok) result = 'Error: the arguments were not valid JSON.'
      else if (!tool) {
        ok = false
        result = `Error: unknown tool "${call.function.name}". Available: ${[...byName.keys()].join(', ') || 'none'}.`
      } else {
        try {
          result = await tool.run(args)
        } catch (e) {
          if ((e as Error).name === 'AbortError') throw e
          ok = false
          result = `Error: ${(e as Error).message}`
        }
      }
      if (result.length > MAX_OBSERVATION) result = `${result.slice(0, MAX_OBSERVATION)}… (truncated)`
      onEvent({ type: 'tool_result', step, id: call.id, name: call.function.name, ok, result })
      messages.push({ role: 'tool', tool_call_id: call.id, content: result })
    }
  }
  return { final: null, steps: maxSteps, tokens, stoppedAtCap: true }
}
