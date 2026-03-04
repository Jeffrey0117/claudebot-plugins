<h1 align="center">ClaudeBot Plugins</h1>

<p align="center">
  <strong>Plugin registry for <a href="https://github.com/Jeffrey0117/ClaudeBot">ClaudeBot</a></strong><br>
  Browse, install, and manage plugins directly from Telegram.
</p>

---

## Usage

From any ClaudeBot chat:
```
/store              — browse all available plugins
/store dice         — view plugin details
/install dice       — install a plugin
/uninstall dice     — remove a plugin
/reload             — hot-reload without restart
```

## Built-in Plugins

All plugins run at **zero AI cost** — no tokens consumed.

| Plugin | Commands | Description |
|--------|----------|-------------|
| **Browse** | `/browse` | Browser automation via Chrome DevTools Protocol |
| **Calc** | `/calc` | Math expressions, date math, unit conversion |
| **Clip** | `/save` `/recall` | Unified memory router — bookmark (📌), context pin (📎), AI memory (🧠) |
| **Cost** | `/cost` `/usage` | API spend tracking per model and per project |
| **Dice** | `/dice` `/coin` | Random numbers, dice rolls, coin flips |
| **GitHub** | `/star` `/follow` | Star repos, follow users, search GitHub |
| **Map** | `/map` | Location lookup → Google Maps link |
| **MCP** | `/mcp` | Connect to MCP servers, list & call external tools |
| **Mdfix** | `/mdfix` | Fix Telegram Markdown rendering issues |
| **Remote** | `/pair` `/grab` | Remote machine pairing & file transfer via WebSocket |
| **Reminder** | `/remind` | One-off timers — relative (`5m`) or absolute (`14:30`) |
| **Scheduler** | `/schedule` | Recurring daily tasks (e.g. Bitcoin price at 09:00) |
| **Screenshot** | `/screenshot` | Desktop & web page screenshots |
| **Search** | `/search` | Web search via SearXNG |
| **Stats** | `/stats` | Usage analytics — messages, models, projects, time series |
| **Sysinfo** | `/sysinfo` | CPU, memory, disk, network info |
| **Task** | `/task` | Daily task planner with time slots and status indicators |
| **Vault** | `/vault` | Message indexing, full-text search, context recall, daily summary |
| **Write** | `/write` | Quick note writing to file |

## Creating a Plugin

### Structure

```
plugins/
  your-plugin/
    index.ts       — must default export a Plugin object
```

### Plugin Interface

```typescript
import type { Plugin } from '../../types/plugin.js'

const plugin: Plugin = {
  name: 'your-plugin',
  description: 'What it does',
  commands: [
    {
      name: 'cmd',
      description: 'Command description',
      handler: async (ctx) => { /* ... */ },
    },
  ],
  // Optional hooks:
  onMessage: async (ctx) => false,       // return true = message consumed
  onCallback: async (ctx, data) => false, // handle inline button callbacks
  outputHook: (text, meta) => ({ text }), // post-process AI output
  cleanup: async () => {},                // called on shutdown
}
export default plugin
```

### Publishing to the Store

1. Fork this repo
2. Create your plugin directory under `plugins/`
3. Add your plugin info to `registry.json`
4. Submit a PR with a description of what the plugin does

### Review Criteria

- No malicious code or data exfiltration
- No user privacy leaks
- Proper error handling
- Complete `registry.json` entry

## Related

- [**ClaudeBot**](https://github.com/Jeffrey0117/ClaudeBot) — the main bot
- [**Documentation**](https://jeffrey0117.github.io/ClaudeBot/) — full setup guide & command reference

## License

MIT
