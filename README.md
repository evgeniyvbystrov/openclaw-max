# OpenClaw MAX Plugin

OpenClaw channel plugin for **MAX messenger** ([max.ru](https://max.ru)).

Connects your OpenClaw agent to MAX via the [MAX Bot API](https://dev.max.ru/docs-api), supporting DMs, group chats, channels, inline keyboards, and media attachments.

## Features

- ✅ **Long polling** — receives updates via `GET /updates`
- ✅ **Webhook mode** — production-ready webhook support with secret verification
- ✅ **DM & group** messages — direct messages and group chats
- ✅ **Inline keyboards** — callback buttons via `inline_keyboard` attachments
- ✅ **Media upload** — images, videos, audio, files via MAX CDN
- ✅ **Message editing** — edit messages within 24h
- ✅ **Message deletion** — delete messages within 24h
- ✅ **Reply context** — preserves reply chains
- ✅ **Native commands** — bot command menu registration
- ✅ **Multi-account** — supports multiple MAX bot accounts
- ✅ **Pairing / allowlist** — DM security via OpenClaw's standard pairing flow
- ✅ **Markdown & HTML** — format support for outbound messages
- ✅ **Group audit** — verify bot membership in configured groups
- ✅ **Comprehensive tests** — 121 tests, >80% coverage on core modules

## Quick Start

### 1. Create a MAX bot

Open a chat with [@MasterBot](https://max.ru/masterbot) in MAX and follow the instructions to create a bot and get an access token.

### 2. Install the plugin

```bash
# From the project directory
cd openclaw-max
npm install

# Or install globally alongside OpenClaw
npm install -g openclaw-max
```

### 3. Configure OpenClaw

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
      "groupPolicy": "allowlist"
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
- ✅ 121 tests passing
- ✅ 100% coverage: accounts, config-schema, runtime
- ✅ 87.5% coverage: webhook
- ✅ 75%+ coverage: actions, api, send

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

Base URL: `https://platform-api.max.ru`
Auth: `Authorization: <token>` header
Rate limit: 30 rps

## Update Types

| Type | Description |
|------|-------------|
| `message_created` | New message |
| `message_callback` | Inline keyboard button pressed |
| `message_edited` | Message edited |
| `message_removed` | Message deleted |
| `bot_started` | User sent /start |
| `bot_added` | Bot added to chat |
| `bot_removed` | Bot removed from chat |
| `user_added` | User joined chat |
| `user_removed` | User left chat |
| `chat_title_changed` | Chat title changed |

## Future Enhancements

- [ ] Reactions support (waiting for MAX API)
- [ ] Media download from inbound messages
- [ ] Typing indicators
- [ ] Message forwarding
- [ ] Poll creation/voting
- [ ] Sticker support

## License

MIT
