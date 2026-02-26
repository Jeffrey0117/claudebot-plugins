import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { Plugin } from '../../types/plugin.js'
import type { BotContext } from '../../types/context.js'

interface MapStore {
  readonly [name: string]: string
}

const DATA_FILE = join(process.cwd(), 'data', 'map-places.json')

function load(): MapStore {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as MapStore
  } catch {
    return {}
  }
}

function save(store: MapStore): void {
  mkdirSync(dirname(DATA_FILE), { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function mapCommand(ctx: BotContext): Promise<void> {
  const raw = (ctx.message && 'text' in ctx.message) ? ctx.message.text : ''
  const args = raw.replace(/^\/map(@\S+)?\s*/, '').trim()

  // /map → list all places
  if (!args) {
    const store = load()
    const entries = Object.entries(store)
    if (entries.length === 0) {
      await ctx.reply(
        '📍 還沒有存任何地點\n\n' +
        '用法：\n' +
        '`/map add 名稱 連結` — 新增\n' +
        '`/map 名稱` — 導航\n' +
        '`/map del 名稱` — 刪除',
        { parse_mode: 'Markdown' },
      )
      return
    }

    const list = entries
      .map(([name, url]) => `📍 **${name}** — [導航](${url})`)
      .join('\n')
    await ctx.reply(`🗺 已存地點：\n\n${list}`, { parse_mode: 'Markdown' })
    return
  }

  const parts = args.split(/\s+/)
  const sub = parts[0].toLowerCase()

  // /map add <name> <url>
  if (sub === 'add') {
    const name = parts[1]
    const url = parts[2]
    if (!name || !url) {
      await ctx.reply('用法：`/map add 名稱 連結`', { parse_mode: 'Markdown' })
      return
    }
    if (!isValidUrl(url)) {
      await ctx.reply('❌ 無效的連結，請提供完整 URL')
      return
    }
    const store = load()
    save({ ...store, [name]: url })
    await ctx.reply(`✅ 已新增 **${name}**`, { parse_mode: 'Markdown' })
    return
  }

  // /map del <name>
  if (sub === 'del' || sub === 'delete' || sub === 'rm') {
    const name = parts[1]
    if (!name) {
      await ctx.reply('用法：`/map del 名稱`', { parse_mode: 'Markdown' })
      return
    }
    const store = load()
    if (!(name in store)) {
      await ctx.reply(`❌ 找不到 **${name}**`, { parse_mode: 'Markdown' })
      return
    }
    const { [name]: _, ...rest } = store
    save(rest)
    await ctx.reply(`🗑 已刪除 **${name}**`, { parse_mode: 'Markdown' })
    return
  }

  // /map <name> → navigate
  const name = args
  const store = load()

  // Fuzzy match: case-insensitive
  const key = Object.keys(store).find((k) => k.toLowerCase() === name.toLowerCase())
  if (!key) {
    const available = Object.keys(store)
    const hint = available.length > 0
      ? `\n\n已存地點：${available.join(', ')}`
      : '\n\n用 `/map add 名稱 連結` 新增地點'
    await ctx.reply(`❌ 找不到 **${name}**${hint}`, { parse_mode: 'Markdown' })
    return
  }

  await ctx.reply(`📍 **${key}**\n\n[👉 開始導航](${store[key]})`, { parse_mode: 'Markdown' })
}

const mapPlugin: Plugin = {
  name: 'map',
  description: '地點導航 — 快速存取 Google Maps',
  commands: [
    {
      name: 'map',
      description: '地點導航 (add/del/名稱)',
      handler: mapCommand,
    },
  ],
}

export default mapPlugin
