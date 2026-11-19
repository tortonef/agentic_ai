/**
 * Safe arithmetic evaluator for the agent's calculator tool: a tiny recursive-descent parser,
 * never eval(). Supports + - * / % ^, parentheses, unary minus and a few functions.
 */

const FUNCS: Record<string, (...a: number[]) => number> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
  min: Math.min,
  max: Math.max,
  log: Math.log10,
  ln: Math.log,
}

export function calculate(expression: string): number {
  const src = expression.replace(/,(?=\d{3}\b)/g, '').replace(/\s+/g, '')
  if (src.length > 200) throw new Error('Expression too long')
  let i = 0

  const peek = () => src[i]
  const eat = (c: string) => {
    if (src[i] !== c) throw new Error(`Expected "${c}" at position ${i + 1}`)
    i++
  }

  function expr(): number {
    let v = term()
    while (peek() === '+' || peek() === '-') v = src[i++] === '+' ? v + term() : v - term()
    return v
  }
  function term(): number {
    let v = power()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = src[i++]
      const r = power()
      if (op === '/' && r === 0) throw new Error('Division by zero')
      v = op === '*' ? v * r : op === '/' ? v / r : v % r
    }
    return v
  }
  function power(): number {
    const base = unary()
    if (peek() === '^') {
      i++
      return base ** power() // right-associative
    }
    return base
  }
  function unary(): number {
    if (peek() === '-') {
      i++
      return -unary()
    }
    if (peek() === '+') {
      i++
      return unary()
    }
    return atom()
  }
  function atom(): number {
    if (peek() === '(') {
      i++
      const v = expr()
      eat(')')
      return v
    }
    const num = src.slice(i).match(/^\d+(\.\d+)?(e[+-]?\d+)?/i)
    if (num) {
      i += num[0].length
      if (peek() === '%') {
        // "15%" as a literal means 0.15 only when not followed by an operand (so 10%3 stays modulo).
        const next = src[i + 1]
        if (next === undefined || /[+\-*/)^,]/.test(next)) {
          i++
          return Number(num[0]) / 100
        }
      }
      return Number(num[0])
    }
    const name = src.slice(i).match(/^[a-z]+/i)?.[0]
    if (name && FUNCS[name.toLowerCase()]) {
      i += name.length
      eat('(')
      const args = [expr()]
      while (peek() === ',') {
        i++
        args.push(expr())
      }
      eat(')')
      return FUNCS[name.toLowerCase()](...args)
    }
    throw new Error(peek() === undefined ? 'Unexpected end of expression' : `Unexpected "${peek()}" at position ${i + 1}`)
  }

  const v = expr()
  if (i < src.length) throw new Error(`Unexpected "${src[i]}" at position ${i + 1}`)
  if (!Number.isFinite(v)) throw new Error('Result is not a finite number')
  return v
}
