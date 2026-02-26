import type { Plugin } from '../../types/plugin.js'
import type { BotContext } from '../../types/context.js'

/** Only allow safe math characters — blocks code injection. */
const SAFE_EXPR = /^[\d\s+\-*/().%^,epiPIsqrtabcologceilfloorround]+$/

/** Normalize phone keyboard symbols to ASCII equivalents. */
function normalizeSymbols(input: string): string {
  return input
    .replace(/[＾ˆ]/g, '^')       // fullwidth/modifier → caret
    .replace(/[×✕✖]/g, '*')      // multiplication signs → *
    .replace(/[÷]/g, '/')         // division sign → /
    .replace(/[（]/g, '(')        // fullwidth parens
    .replace(/[）]/g, ')')
    .replace(/[＋]/g, '+')
    .replace(/[－—–]/g, '-')      // fullwidth/em/en dash → minus
    .replace(/[．]/g, '.')
    .replace(/[％]/g, '%')
}

/** Built-in constants and functions exposed to the evaluator. */
const MATH_ENV: Record<string, number | ((...args: readonly number[]) => number)> = {
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log10,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
}

function evaluate(raw: string): number {
  const normalized = normalizeSymbols(raw)
  let expr = normalized
    .replace(/\s+/g, '')
    .replace(/\^/g, '**')     // 2^10 → 2**10
    .replace(/(\d)%/g, '($1/100)')  // 50% → (50/100)

  // Validate: only safe characters after substitution
  if (!SAFE_EXPR.test(normalized.replace(/\s/g, ''))) {
    // Find the offending character for a helpful message
    const bad = normalized.replace(/\s/g, '').split('').find((c) => !SAFE_EXPR.test(c))
    throw new Error(`不支援的字元「${bad ?? '?'}」\n支援：+ - * / ^ % sqrt abs log pi e`)
  }

  // Build sandboxed function with math helpers
  const keys = Object.keys(MATH_ENV)
  const values = Object.values(MATH_ENV)
  const fn = new Function(...keys, `"use strict"; return (${expr})`)
  const result = fn(...values) as unknown

  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error('計算結果無效')
  }
  return result
}

function formatNumber(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) {
    return n.toLocaleString('en-US')
  }
  // Floating point: max 10 decimal places, strip trailing zeros
  const fixed = n.toFixed(10).replace(/\.?0+$/, '')
  const parts = fixed.split('.')
  parts[0] = parseInt(parts[0], 10).toLocaleString('en-US')
  return parts.join('.')
}

async function calcCommand(ctx: BotContext): Promise<void> {
  const raw = (ctx.message && 'text' in ctx.message) ? ctx.message.text : ''
  const expr = raw.replace(/^\/calc(@\S+)?\s*/, '').trim()

  if (!expr) {
    await ctx.reply(
      '🧮 用法：`/calc <算式>`\n' +
      '例：`/calc 123 * 456`\n' +
      '　　`/calc (100 + 50) * 1.08`\n' +
      '　　`/calc 2^10`\n' +
      '　　`/calc sqrt(144)`\n' +
      '支援：`+ - * / ^ % sqrt abs log ceil floor round pi e`',
      { parse_mode: 'Markdown' },
    )
    return
  }

  try {
    const result = evaluate(expr)
    // Show normalized expression so user sees what was actually computed
    const display = normalizeSymbols(expr)
    await ctx.reply(`🧮 \`${display}\` = **${formatNumber(result)}**`, { parse_mode: 'Markdown' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '計算錯誤'
    await ctx.reply(`❌ ${msg}`)
  }
}

const calcPlugin: Plugin = {
  name: 'calc',
  description: '計算機 — 數學運算',
  commands: [
    {
      name: 'calc',
      description: '計算數學算式 (加減乘除/次方/根號)',
      handler: calcCommand,
    },
  ],
}

export default calcPlugin
