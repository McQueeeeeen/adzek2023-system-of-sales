# Adzek2023 Sales OS

CRM-lite для управления B2B лидами и follow-up задачами.

## Запуск

```bash
npm install
npm run dev
```

Открыть: [http://localhost:3000](http://localhost:3000)

## Telegram reminders (daily digest)

Система отправляет утренний дайджест в Telegram с разбивкой:
- просроченные касания
- касания на сегодня
- имя клиента, компания, статус, следующее действие, телефон, потенциал (в KZT)

### 1. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` и заполните:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`
- `KZ_TIMEZONE` (по умолчанию `Asia/Almaty`)
- `KZT_RATE` (курс USD→KZT для поля потенциала)

### 2. Endpoint отправки дайджеста

- `GET /api/telegram/send-digest` — cron запуск
- `POST /api/telegram/send-digest` — ручной запуск

Пример body для `POST`:

```json
{
  "clients": []
}
```

Если `clients` не переданы, endpoint использует mock-данные.

Оба защищены через `CRON_SECRET`:
- `Authorization: Bearer <CRON_SECRET>`, или
- `?secret=<CRON_SECRET>`

### 3. Ежедневный cron

В `vercel.json` настроен запуск:

- `0 4 * * *` (ежедневно в 04:00 UTC, это 09:00 по Казахстану `Asia/Almaty`)

## Ограничение текущего MVP

Дайджест сейчас строится из `MOCK_CLIENTS` (или из `clients` в POST body для ручного режима).
Чтобы напоминания отражали реальные изменения из UI в продакшене, следующим шагом нужно хранить клиентов в общей БД (Postgres/Supabase) и читать их из серверного слоя.

## UI

На дашборде добавлена кнопка `Отправить в Telegram`.
После отправки показывается toast:
- `Сообщение отправлено`
