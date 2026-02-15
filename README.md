# openclaw-max

OpenClaw channel plugin for **MAX messenger** ([max.ru](https://max.ru)).

Connects your OpenClaw agent to MAX via the [MAX Bot API](https://dev.max.ru/docs-api), supporting DMs, group chats, channels, and inline keyboards.

## Features

- **Long polling** — receives updates via `GET /updates` (webhook support planned)
- **DM & group** messages — direct messages and group chats
- **Inline keyboards** — callback buttons via `inline_keyboard` attachments
- **Message editing** — edit messages within 24h
- **Message deletion** — delete messages within 24h
- **Reply context** — preserves reply chains
- **Multi-account** — supports multiple MAX bot accounts
- **Pairing / allowlist** — DM security via OpenClaw's standard pairing flow
- **Markdown & HTML** — format support for outbound messages

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

Add to your OpenClaw config (`~/.openclaw/config.yaml`):

```yaml
channels:
  max:
    enabled: true
    botToken: "YOUR_MAX_BOT_TOKEN"
    # Or use env: MAX_BOT_TOKEN
```

Or use the `--use-env` flag:

```bash
export MAX_BOT_TOKEN="your_token_here"
openclaw channel add max --use-env
```

### 4. Start OpenClaw

```bash
openclaw gateway start
```

## Configuration

### Single account

```yaml
channels:
  max:
    enabled: true
    botToken: "token_here"
    dmPolicy: pairing          # pairing | open | allowlist
    allowFrom:
      - "12345678"             # MAX user IDs
    groups:
      "987654321":
        requireMention: true
    groupPolicy: allowlist     # allowlist | open
```

### Multiple accounts

```yaml
channels:
  max:
    enabled: true
    botToken: "default_bot_token"
    accounts:
      secondary:
        enabled: true
        botToken: "another_bot_token"
        allowFrom:
          - "87654321"
```

## Architecture

```
src/
├── index.ts       # Plugin entry point (registers with OpenClaw)
├── api.ts         # MAX Bot API client (thin HTTP wrapper)
├── accounts.ts    # Account resolution from config
├── channel.ts     # ChannelPlugin implementation
├── monitor.ts     # Long-polling update receiver
├── runtime.ts     # Plugin runtime bridge
└── send.ts        # Outbound message sending
```

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

## TODO

- [ ] Webhook mode (production-recommended)
- [ ] Media upload (images, files, audio, video)
- [ ] Reactions support (if/when MAX adds it)
- [ ] Native command menu registration
- [ ] Media download from inbound messages
- [ ] Group membership audit
- [ ] Typing indicators

## License

MIT
