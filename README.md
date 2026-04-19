# Adzek2023 Sales OS

Внутренняя CRM-система для B2B продаж: клиенты, касания, следующий шаг, Telegram-дайджест.

## Стек

- Next.js App Router + TypeScript
- Tailwind + shadcn/ui
- Supabase (Auth + Postgres + RLS)

## Локальный запуск

```bash
npm install
npm run dev
```

Открыть: [http://localhost:3000](http://localhost:3000)

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`
- `KZ_TIMEZONE` (обычно `Asia/Almaty`)
- `TELEGRAM_BLOCK_LIMIT` (обычно `5`)

## Supabase: схема и RLS

SQL-миграция лежит в:

- `supabase/migrations/20260419_init_crm.sql`

Она создает:

- `profiles`
- `clients`
- `client_activities`
- триггеры `updated_at` и автосоздания профиля из `auth.users`
- RLS и политики доступа по `auth.uid()`

## Auth

Реализовано:

- `/signup` — регистрация (email/password)
- `/login` — вход (email/password)
- logout из сайдбара
- редирект после входа на `/`
- редирект с `/login` и `/signup` для уже авторизованного пользователя

## Защита маршрутов

Middleware защищает:

- `/`
- `/clients`
- `/clients/[id]`
- `/clients/new`
- `/clients/[id]/edit`
- `/settings`

Неавторизованные пользователи перенаправляются на `/login`.

## Telegram reminders

Endpoint:

- `GET /api/telegram/send-digest` — cron-режим
- `POST /api/telegram/send-digest` — ручная отправка

Формат:

- `🔴 Просрочено`
- `🟡 На сегодня`
- `⚪ Дальше по плану` (до 2 клиентов)
- итоговый потенциал только по overdue + due today
- динамический блок `👉 Фокус`

Защита endpoint:

- `Authorization: Bearer <CRON_SECRET>` или `?secret=<CRON_SECRET>`

## Vercel cron

В `vercel.json`:

- `0 4 * * *` (09:00 по Казахстану при `Asia/Almaty`)

## Важно

CRM-данные читаются и пишутся в Supabase (localStorage как источник правды удален).
