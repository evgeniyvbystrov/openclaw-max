# OpenClaw MAX Plugin

[![npm](https://img.shields.io/npm/v/openclaw-max)](https://www.npmjs.com/package/openclaw-max)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-206%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

OpenClaw channel plugin for **MAX messenger** ([max.ru](https://max.ru)).

Connects your OpenClaw agent to MAX via the [MAX Bot API](https://dev.max.ru/docs-api), supporting DMs, group chats, channels, inline keyboards, and media attachments.

## Quick Install

### npm (recommended)

```bash
openclaw plugins install openclaw-max
openclaw channel add max
```

### git clone (alternative)

```bash
git clone https://github.com/evgeniyvbystrov/openclaw-max.git ~/.openclaw/plugins/openclaw-max
```

Then add the path to `~/.openclaw/openclaw.json`:
```json
{
  "plugins": {
    "load": {
      "paths": ["~/.openclaw/plugins/openclaw-max"]
    }
  }
}
```

And configure the channel:
```bash
openclaw channel add max
```

**Where to get the token:** Open a chat with [@MasterBot](https://max.ru/masterbot) in MAX, create a bot and get the token.

## Features

### Core Functionality
- ✅ **Long polling** — receives updates via `GET /updates`
- ✅ **Webhook mode** — production-ready webhook support with secret verification
- ✅ **DM & group messages** — direct messages and group chats
- ✅ **Inline keyboards** — callback buttons via `inline_keyboard` attachments
- ✅ **Message editing** — edit messages within 24h
- ✅ **Message deletion** — delete messages within 24h
- ✅ **Reply context** — preserves reply chains
- ✅ **Native commands** — bot command menu registration
- ✅ **Multi-account** — supports multiple MAX bot accounts

### Media Support
- ✅ **Media download** — incoming images, videos, audio, files, stickers
- ✅ **Media upload** — outgoing images, videos, audio, files via MAX CDN
- ✅ **Native stickers** — send stickers by code, auto-fill from cache
- ✅ **Sticker catalog** — 4,741 stickers from 216 packs with emoji tags (listmax.ru)
- ✅ **Location attachments** — native map pins (Yandex Maps integration)
- ✅ **Contact attachments** — native contact cards (VCard / MAX user_id)

### Security & Policies
- ✅ **Pairing / allowlist** — DM security via OpenClaw's standard pairing flow
- ✅ **Group allowlist** — control which groups the bot responds to
- ✅ **Mention requirement** — require @mention in groups before responding
- ✅ **Reply-as-mention** — replying to bot's message counts as mention
- ✅ **Group policy** — `open`, `allowlist`, or `disabled` group access

### User Experience
- ✅ **Typing indicators** — automatic `typing_on` when processing messages
- ✅ **Read receipts** — automatic `mark_seen` for all received messages
- ✅ **Edit detection** — processes edited messages with unique identifiers
- ✅ **Attachment handling** — processes messages with attachments even without text
- ✅ **Markdown & HTML** — format support for outbound messages
- ✅ **Audio transcription** — voice messages transcribed by OpenClaw core

### Testing & Quality
- ✅ **206 tests** — comprehensive test coverage across 11 suites
- ✅ **Type safety** — full TypeScript with strict mode
- ✅ **Group audit** — verify bot membership in configured groups

## Platform Limitations

⚠️ **MAX Bot API does not support:**
- Emoji reactions from bots (platform limitation)
- Reaction events for bots (no `message_reaction_*` events delivered)

These features may be added when the MAX platform adds support.

## Setup Guide

### 1. Create a MAX bot

Open a chat with [@MasterBot](https://max.ru/masterbot) in MAX and follow the instructions to create a bot and get an access token.

### 2. Configure OpenClaw

Run the interactive setup wizard:

```bash
openclaw channel add max
```

Or configure manually in `~/.openclaw/openclaw.json`:

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "YOUR_MAX_BOT_TOKEN"
    }
  },
  "plugins": {
    "load": {
      "paths": ["/path/to/openclaw-max"]
    }
  }
}
```

Or use environment variable:

```bash
export MAX_BOT_TOKEN="your_token_here"
openclaw channel add max --use-env
```

### 4. Start OpenClaw

```bash
openclaw gateway start
```

## Configuration

### Single account (polling mode)

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "token_here",
      "dmPolicy": "pairing",
      "allowFrom": ["12345678"],
      "groups": {
        "987654321": {
          "requireMention": true
        }
      },
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["987654321"]
    }
  }
}
```

### Webhook mode (recommended for production)

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "token_here",
      "webhookUrl": "https://your-domain.com/max-webhook",
      "webhookSecret": "random-secret-string",
      "webhookPath": "/max-webhook"
    }
  }
}
```

### Multiple accounts

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "default_bot_token",
      "accounts": {
        "secondary": {
          "enabled": true,
          "botToken": "another_bot_token",
          "allowFrom": ["87654321"]
        }
      }
    }
  }
}
```

### Bot commands

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "token_here",
      "commands": [
        { "name": "start", "description": "Start conversation" },
        { "name": "help", "description": "Show help" },
        { "name": "status", "description": "Bot status" }
      ]
    }
  }
}
```

## Configuration Options

### DM Policy (`dmPolicy`)
- `open` — accept all DMs (default)
- `pairing` — require pairing code
- `allowlist` — only accept from `allowFrom` list
- `disabled` — reject all DMs

### Group Policy (`groupPolicy`)
- `open` — respond in all groups (default)
- `allowlist` — only respond in configured groups
- `disabled` — ignore all group messages

### Group Settings (`groups`)
```json
{
  "groups": {
    "GROUP_CHAT_ID": {
      "requireMention": true  // Require @mention or reply to bot
    },
    "*": {
      "requireMention": false  // Wildcard for all groups
    }
  }
}
```

### Media Settings
```json
{
  "mediaMaxMb": 20  // Maximum media file size in MB (default: 20)
}
```

## Architecture

```
src/
├── index.ts           # Plugin entry point (registers with OpenClaw)
├── api.ts             # MAX Bot API client (thin HTTP wrapper)
├── accounts.ts        # Account resolution from config
├── channel.ts         # ChannelPlugin implementation (main interface)
├── monitor.ts         # Long-polling + webhook update receiver
├── webhook.ts         # Webhook HTTP handler
├── send.ts            # Outbound message sending (text + media)
├── actions.ts         # Message actions (send/edit/delete)
├── onboarding.ts      # Interactive setup wizard
├── config-schema.ts   # Zod validation schemas
├── sticker-cache.ts   # Sticker code cache (auto-fill on send)
└── runtime.ts         # Plugin runtime bridge
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage.enabled

# Watch mode (development)
npm run dev
```

## Testing

See [TESTING.md](./TESTING.md) for detailed test coverage report.

**Summary:**
- ✅ 206 tests passing (11 test files)
- ✅ Full coverage: accounts, config-schema, runtime
- ✅ High coverage: webhook, actions, api, send, monitor, groups

## MAX Bot API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/me` | Bot info |
| POST   | `/messages` | Send message |
| PUT    | `/messages` | Edit message |
| DELETE | `/messages` | Delete message |
| GET    | `/updates` | Long polling |
| POST   | `/subscriptions` | Subscribe webhook |
| GET    | `/chats` | List chats |
| POST   | `/actions` | Send action (typing, mark_seen) |

Base URL: `https://platform-api.max.ru`
Auth: `Authorization: <token>` header
Rate limit: 30 rps

## Update Types

| Type | Description | Supported |
|------|-------------|-----------|
| `message_created` | New message | ✅ |
| `message_callback` | Inline keyboard button pressed | ✅ |
| `message_edited` | Message edited | ✅ |
| `message_removed` | Message deleted | ✅ |
| `bot_started` | User sent /start | ✅ |
| `bot_added` | Bot added to chat | ✅ |
| `bot_removed` | Bot removed from chat | ✅ |
| `user_added` | User joined chat | ⚠️ (logged) |
| `user_removed` | User left chat | ⚠️ (logged) |
| `chat_title_changed` | Chat title changed | ⚠️ (logged) |
| `message_reaction_*` | Reactions | ❌ (not sent to bots) |

## Known Issues & Workarounds

### Edited Messages Without Text
MAX's `message_edited` webhook may not include the edited text. The plugin automatically fetches the full message from the API if text is missing.

### Reply-as-Mention Behavior
In groups with `requireMention: true`, replying to the bot's message counts as a mention (similar to Telegram behavior). This ensures natural conversation flow.

### Media Size Limits
MAX enforces platform-level media size limits. The plugin respects the configured `mediaMaxMb` setting (default 20MB) for both uploads and downloads.

## Links

- **npm:** [npmjs.com/package/openclaw-max](https://www.npmjs.com/package/openclaw-max)
- **GitHub:** [github.com/evgeniyvbystrov/openclaw-max](https://github.com/evgeniyvbystrov/openclaw-max)
- **OpenClaw:** [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
- **MAX for developers:** [dev.max.ru](https://dev.max.ru)

## License

MIT
