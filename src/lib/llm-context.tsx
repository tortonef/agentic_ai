import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { createGroq, MODELS, type Llm } from './llm'

const STORE = 'genai-lab.groq'

function load(): { key: string; model: string } | null {
  try {
    const raw = localStorage.getItem(STORE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

interface LlmState {
  llm: Llm | null
  model: string
  remembered: boolean
  connect(key: string, model: string, remember: boolean): void
  disconnect(): void
  setModel(model: string): void
}

const Ctx = createContext<LlmState>({
  llm: null,
  model: MODELS[0].id,
  remembered: false,
  connect: () => {},
  disconnect: () => {},
  setModel: () => {},
})

export function LlmProvider({ children }: { children: ReactNode }) {
  const saved = useMemo(load, [])
  const [key, setKey] = useState(saved?.key ?? '')
  const [model, setModelState] = useState(saved?.model ?? MODELS[0].id)
  const [remembered, setRemembered] = useState(!!saved)

  const persist = (k: string, m: string, remember: boolean) => {
    try {
      if (remember) localStorage.setItem(STORE, JSON.stringify({ key: k, model: m }))
      else localStorage.removeItem(STORE)
    } catch {
      /* storage blocked: the key simply stays in memory */
    }
  }

  const value = useMemo<LlmState>(
    () => ({
      llm: key ? createGroq(key, model) : null,
      model,
      remembered,
      connect(k, m, remember) {
        setKey(k)
        setModelState(m)
        setRemembered(remember)
        persist(k, m, remember)
      },
      disconnect() {
        setKey('')
        setRemembered(false)
        persist('', '', false)
      },
      setModel(m) {
        setModelState(m)
        if (remembered) persist(key, m, true)
      },
    }),
    [key, model, remembered],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useLlm = () => useContext(Ctx)
