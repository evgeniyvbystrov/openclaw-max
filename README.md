# OpenClaw MAX плагин

<p align="center">
  <img src="assets/social-preview.png" alt="OpenClaw MAX Plugin" width="640">
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/openclaw-max)](https://www.npmjs.com/package/openclaw-max)
[![Tests](https://img.shields.io/badge/tests-206%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

Плагин канала [OpenClaw](https://github.com/openclaw/openclaw) для мессенджера **MAX** ([max.ru](https://max.ru)).

Подключает вашего OpenClaw-агента к MAX через [MAX Bot API](https://dev.max.ru/docs-api), с поддержкой личных сообщений, групповых чатов, каналов, inline-клавиатур и медиа-вложений.

## Быстрая установка

### npm (рекомендуется)

```bash
openclaw plugins install openclaw-max
openclaw channel add max
```

### git clone (альтернатива)

```bash
git clone https://github.com/evgeniyvbystrov/openclaw-max.git ~/.openclaw/plugins/openclaw-max
```

Затем добавьте путь в `~/.openclaw/openclaw.json`:
```json
{
  "plugins": {
    "load": {
      "paths": ["~/.openclaw/plugins/openclaw-max"]
    }
  }
}
```

И настройте канал:
```bash
openclaw channel add max
```

**Где взять токен:** Откройте чат с [@MasterBot](https://max.ru/masterbot) в MAX, создайте бота и получите токен.

## Возможности

### Основная функциональность
- ✅ **Long polling** — получение обновлений через `GET /updates`
- ✅ **Webhook режим** — production-ready поддержка webhook с проверкой секрета
- ✅ **ЛС и группы** — личные сообщения и групповые чаты
- ✅ **Inline-клавиатуры** — кнопки через `inline_keyboard` вложения
- ✅ **Редактирование сообщений** — редактирование в течение 24ч
- ✅ **Удаление сообщений** — удаление в течение 24ч
- ✅ **Контекст ответов** — сохранение цепочек ответов
- ✅ **Нативные команды** — регистрация меню команд бота
- ✅ **Мульти-аккаунт** — поддержка нескольких MAX-ботов

### Поддержка медиа
- ✅ **Загрузка медиа** — входящие изображения, видео, аудио, файлы, стикеры
- ✅ **Отправка медиа** — исходящие изображения, видео, аудио, файлы через MAX CDN
- ✅ **Нативные стикеры** — отправка стикеров по коду, авто-подстановка из кеша
- ✅ **Каталог стикеров** — 4741 стикер из 216 паков с emoji-тегами (listmax.ru)
- ✅ **Геолокация** — нативные вложения с картой (Яндекс Карты)
- ✅ **Контакты** — нативные визитки (VCard / MAX user_id)

### Безопасность и политики
- ✅ **Pairing / allowlist** — защита ЛС через стандартный механизм OpenClaw
- ✅ **Allowlist групп** — контроль групп, в которых бот отвечает
- ✅ **Требование упоминания** — требовать @mention в группах перед ответом
- ✅ **Ответ как упоминание** — ответ на сообщение бота считается упоминанием
- ✅ **Политика групп** — `open`, `allowlist` или `disabled` доступ к группам

### Пользовательский опыт
- ✅ **Индикаторы набора** — автоматический `typing_on` при обработке сообщений
- ✅ **Отметки о прочтении** — автоматический `mark_seen` для всех полученных сообщений
- ✅ **Обнаружение редактирования** — обработка отредактированных сообщений с уникальными идентификаторами
- ✅ **Обработка вложений** — обработка сообщений с вложениями даже без текста
- ✅ **Markdown и HTML** — поддержка форматирования исходящих сообщений
- ✅ **Транскрипция аудио** — голосовые сообщения транскрибируются ядром OpenClaw

### Тестирование и качество
- ✅ **206 тестов** — комплексное покрытие тестами
- ✅ **Типобезопасность** — полный TypeScript со strict mode
- ✅ **Аудит групп** — проверка членства бота в настроенных группах

## Ограничения платформы

⚠️ **MAX Bot API не поддерживает:**
- Emoji-реакции от ботов (ограничение платформы)
- События реакций для ботов (не доставляются события `message_reaction_*`)

Эти функции могут быть добавлены, когда платформа MAX добавит поддержку.

## Руководство по настройке

### 1. Создайте MAX-бота

Откройте чат с [@MasterBot](https://max.ru/masterbot) в MAX и следуйте инструкциям для создания бота и получения токена доступа.

### 2. Настройте OpenClaw

Запустите интерактивный визард настройки:

```bash
openclaw channel add max
```

Или настройте вручную в `~/.openclaw/openclaw.json`:

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "ВАШ_MAX_BOT_TOKEN"
    }
  },
  "plugins": {
    "load": {
      "paths": ["/путь/к/openclaw-max"]
    }
  }
}
```

Или используйте переменную окружения:

```bash
export MAX_BOT_TOKEN="your_token_here"
openclaw channel add max --use-env
```

### 3. Запустите OpenClaw

```bash
openclaw gateway start
```

## Конфигурация

### Один аккаунт (polling режим)

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "токен_здесь",
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

### Webhook режим (рекомендуется для production)

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "токен_здесь",
      "webhookUrl": "https://ваш-домен.com/max-webhook",
      "webhookSecret": "случайная-секретная-строка",
      "webhookPath": "/max-webhook"
    }
  }
}
```

### Несколько аккаунтов

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "токен_основного_бота",
      "accounts": {
        "secondary": {
          "enabled": true,
          "botToken": "токен_другого_бота",
          "allowFrom": ["87654321"]
        }
      }
    }
  }
}
```

### Команды бота

```json
{
  "channels": {
    "max": {
      "enabled": true,
      "botToken": "токен_здесь",
      "commands": [
        { "name": "start", "description": "Начать разговор" },
        { "name": "help", "description": "Показать справку" },
        { "name": "status", "description": "Статус бота" }
      ]
    }
  }
}
```

## Параметры конфигурации

### Политика ЛС (`dmPolicy`)
- `open` — принимать все ЛС (по умолчанию)
- `pairing` — требовать код подключения
- `allowlist` — принимать только из списка `allowFrom`
- `disabled` — отклонять все ЛС

### Политика групп (`groupPolicy`)
- `open` — отвечать во всех группах (по умолчанию)
- `allowlist` — отвечать только в настроенных группах
- `disabled` — игнорировать все групповые сообщения

### Настройки групп (`groups`)
```json
{
  "groups": {
    "ID_ГРУППОВОГО_ЧАТА": {
      "requireMention": true  // Требовать @mention или ответ боту
    },
    "*": {
      "requireMention": false  // Wildcard для всех групп
    }
  }
}
```

### Настройки медиа
```json
{
  "mediaMaxMb": 20  // Максимальный размер медиа-файла в МБ (по умолчанию: 20)
}
```

## Архитектура

```
src/
├── index.ts           # Точка входа плагина (регистрация в OpenClaw)
├── api.ts             # MAX Bot API клиент (тонкая HTTP-обёртка)
├── accounts.ts        # Разрешение аккаунтов из конфига
├── channel.ts         # Реализация ChannelPlugin (основной интерфейс)
├── monitor.ts         # Long-polling + webhook приёмник обновлений
├── webhook.ts         # HTTP-обработчик webhook
├── send.ts            # Отправка исходящих сообщений (текст + медиа)
├── actions.ts         # Действия с сообщениями (отправка/редактирование/удаление)
├── onboarding.ts      # Интерактивный визард настройки
├── config-schema.ts   # Zod схемы валидации
├── sticker-cache.ts   # Кеш стикеров (авто-подстановка кода)
└── runtime.ts         # Мост плагина с runtime
```

## Разработка

```bash
# Установить зависимости
npm install

# Собрать
npm run build

# Запустить тесты
npm test

# Запустить тесты с покрытием
npm test -- --coverage.enabled

# Режим отслеживания (разработка)
npm run dev
```

## Тестирование

См. [TESTING.md](./TESTING.md) для детального отчёта о покрытии тестами.

**Итоги:**
- ✅ 206 пройденных тестов (11 файлов)
- ✅ Полное покрытие: accounts, config-schema, runtime
- ✅ Высокое покрытие: webhook, actions, api, send, monitor, groups

## Справочник MAX Bot API

| Метод | Endpoint | Описание |
|--------|----------|-------------|
| GET    | `/me` | Информация о боте |
| POST   | `/messages` | Отправить сообщение |
| PUT    | `/messages` | Редактировать сообщение |
| DELETE | `/messages` | Удалить сообщение |
| GET    | `/updates` | Long polling |
| POST   | `/subscriptions` | Подписаться на webhook |
| GET    | `/chats` | Список чатов |
| POST   | `/actions` | Отправить действие (typing, mark_seen) |

Базовый URL: `https://platform-api.max.ru`
Авторизация: заголовок `Authorization: <token>`
Rate limit: 30 rps

## Типы обновлений

| Тип | Описание | Поддержка |
|------|-------------|-----------|
| `message_created` | Новое сообщение | ✅ |
| `message_callback` | Нажата кнопка inline-клавиатуры | ✅ |
| `message_edited` | Сообщение отредактировано | ✅ |
| `message_removed` | Сообщение удалено | ✅ |
| `bot_started` | Пользователь отправил /start | ✅ |
| `bot_added` | Бот добавлен в чат | ✅ |
| `bot_removed` | Бот удалён из чата | ✅ |
| `user_added` | Пользователь вошёл в чат | ⚠️ (логируется) |
| `user_removed` | Пользователь покинул чат | ⚠️ (логируется) |
| `chat_title_changed` | Название чата изменено | ⚠️ (логируется) |
| `message_reaction_*` | Реакции | ❌ (не отправляются ботам) |

## Известные проблемы и обходы

### Отредактированные сообщения без текста
Webhook `message_edited` в MAX может не включать отредактированный текст. Плагин автоматически запрашивает полное сообщение из API, если текст отсутствует.

### Поведение ответа как упоминания
В группах с `requireMention: true` ответ на сообщение бота считается упоминанием (аналогично поведению Telegram). Это обеспечивает естественный поток разговора.

### Лимиты размера медиа
MAX применяет платформенные ограничения на размер медиа. Плагин соблюдает настроенный параметр `mediaMaxMb` (по умолчанию 20МБ) для загрузки и скачивания.

## Участие в разработке

1. Форкните репозиторий
2. Создайте ветку (`git checkout -b feature/my-feature`)
3. Закоммитьте изменения (`git commit -m 'feat: add my feature'`)
4. Запушьте ветку (`git push origin feature/my-feature`)
5. Откройте Pull Request

Убедитесь что тесты проходят: `npm test`

## Связь

- **npm:** [npmjs.com/package/openclaw-max](https://www.npmjs.com/package/openclaw-max)
- **GitHub:** [github.com/evgeniyvbystrov/openclaw-max](https://github.com/evgeniyvbystrov/openclaw-max)
- **OpenClaw:** [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
- **MAX для разработчиков:** [dev.max.ru](https://dev.max.ru)

## Лицензия

[MIT](LICENSE)

---

[English version →](./README.en.md)
