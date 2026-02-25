# ClaudeBot Plugin Store

社群插件倉庫 — 透過 `/store`、`/install`、`/uninstall` 在 Telegram 中管理插件。

## 使用方式

在 ClaudeBot 中：
```
/store              → 瀏覽所有可用插件
/store dice         → 查看插件詳情
/install dice       → 安裝插件
/uninstall dice     → 卸載插件
```

## 目前插件

| 插件 | 指令 | 說明 |
|------|------|------|
| browse | `/browse` | 互動式網頁瀏覽器 |
| cost | `/cost` `/usage` | 費用追蹤與用量查詢 |
| dice | `/dice` `/coin` | 骰子與隨機數 |
| github | `/star` | GitHub Star — 快速 star repo |
| mcp | `/mcp` | MCP 工具橋接 |
| reminder | `/remind` | 計時器 & 提醒 |
| scheduler | `/schedule` | 定時任務排程 |
| screenshot | `/screenshot` | 桌面與網頁截圖 |
| search | `/search` | 網頁搜尋（DuckDuckGo） |
| sysinfo | `/sysinfo` | 系統資訊查看 |

## 投稿指南

歡迎提交 PR 貢獻新插件！

### 結構要求

```
plugins/
  your-plugin/
    index.ts       ← 必須 default export Plugin 物件
```

### Plugin 介面

```typescript
interface Plugin {
  name: string
  description: string
  commands: {
    name: string
    description: string
    handler: (ctx: BotContext) => Promise<void>
  }[]
  onMessage?: (ctx: BotContext) => Promise<boolean>
  onCallback?: (ctx: BotContext, data: string) => Promise<boolean>
  cleanup?: () => Promise<void>
}
```

### 提交步驟

1. Fork 此 repo
2. 在 `plugins/` 下建立你的插件目錄
3. 在 `registry.json` 的 `plugins` 陣列中加入你的插件資訊
4. 提交 PR，說明插件功能

### 審核標準

- 不得包含惡意程式碼
- 不得洩漏用戶隱私
- 程式碼品質良好、有錯誤處理
- `registry.json` 資訊完整
