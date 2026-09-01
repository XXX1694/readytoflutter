<div align="center">

# Onsite · Codex

**Серьёзная подготовка к мобильному собесу: Flutter, iOS, Android, KMP.**
392 вопроса, 53 темы, SRS, mock-собеседование, активное припоминание, шпаргалки и интервью-раунды.

[![CI](https://img.shields.io/badge/CI-passing-7CC474?style=flat-square)](.github/workflows/ci.yml)
[![Frontend](https://img.shields.io/badge/frontend-React_18_·_Vite-127CC4?style=flat-square)](frontend/)
[![Backend](https://img.shields.io/badge/backend-Express_·_SQLite-263044?style=flat-square)](backend/)
[![Auth](https://img.shields.io/badge/auth-JWT_·_bcrypt-263044?style=flat-square)](backend/auth.js)
[![PWA](https://img.shields.io/badge/PWA-installable_·_offline-127CC4?style=flat-square)](frontend/vite.config.js)

</div>

> Учиться — глаголом, не существительным. Не пассивный дамп вопросов: каждый экран
> устроен так, чтобы заставить мозг работать — припоминать, формулировать, объяснять.

---

## Что внутри

| Слой | Что делает |
|---|---|
| **Dashboard** | Today's plan = SRS due + слабая тема + новые. Activity heatmap, streak, mastery snapshot. |
| **Topics** | 53 темы Junior → Senior, по четырём стекам: Flutter/Dart, iOS (Swift/SwiftUI/UIKit), Android (Kotlin/Compose), KMP. Hint-ladder reveal, заметки, закладки, TTS. |
| **Study (SRS)** | SuperMemo SM-2, активное припоминание (gist textarea), 4-балльная оценка. |
| **Mock interview** | Случайная подборка с таймером и self-grade в стиле «как на собеседовании». |
| **Round** | 5 связанных вопросов из одной темы (кластеризация по тегам, ramp easy → hard). |
| **Cheatsheet** | Сжатая 2-колоночная шпаргалка темы — print-ready, экспорт в Markdown. |
| **Stats** | Mastery map: completion % × SRS ease, weak topics, per-level breakdown. |
| **Auth** | Email + bcrypt + JWT, синхронизация прогресса между устройствами. Опционально. |
| **Admin** | `/admin` — dashboard для admin-юзеров: stats, users, contact inbox. Гейтится `users.is_admin`. |
| **Billing** | `/pricing` + Stripe Checkout. Pro = безлимит AI-проверок. Free = 10/день. Webhooks обновляют `users.pro_tier` автоматически. |
| **Контакты** | Публичная форма `/contact` → `contact_messages`, инбокс в админке. |
| **Mobile** | Bottom-nav на узких экранах, drawer-сайдбар, brutalist + safe-area. |
| **PWA** | Установка, offline-first для статики, Workbox precaching. |

Поддержка `EN` и `RU`, светлой и тёмной темы, кастомного дизайн-кита **Codex** (Inter + JetBrains Mono).

---

## Стек

**Frontend** &middot; React 18 &middot; Vite 5 &middot; **TypeScript** &middot; Tailwind CSS &middot; Zustand &middot; TanStack Query &middot; React Router 6 &middot; Framer Motion &middot; Radix UI &middot; cmdk &middot; MiniSearch &middot; Shiki &middot; Sonner &middot; vite-plugin-pwa.

**Backend** &middot; Node 18+ &middot; Express 4 &middot; better-sqlite3 (WAL) &middot; bcryptjs &middot; jsonwebtoken &middot; helmet &middot; express-rate-limit &middot; zod.

Без сторонних auth-провайдеров — свои email + bcrypt + JWT. Внешние сервисы только опциональные и деградируют молча: Anthropic для AI-грейдера и Stripe для биллинга. Без их ключей приложение работает целиком, просто без этих двух фич.

---

## Быстрый старт

```bash
# 1. Клонируй
git clone <your-repo>.git onsite
cd onsite

# 2. Backend
cd backend
npm install
cp .env.example .env   # отредактируй при необходимости
npm start              # http://localhost:3001

# 3. Frontend (в новой вкладке)
cd ../frontend
npm install
npm run dev            # http://localhost:3000
```

или одной командой из корня:

```bash
./start.sh
```

Открой [http://localhost:3000](http://localhost:3000). Всё.

> **Без backend?** Frontend живёт самостоятельно: статика `frontend/public/seed/static-data.json` + `localStorage`. Auth-меню само скрывается, прогресс — локальный. Это та же сборка, что деплоится на GitHub Pages.

---

## Структура

```
onsite/
├── backend/                Express + SQLite API
│   ├── server.js           Маршруты, helmet, rate-limit, CORS
│   ├── auth.js             bcrypt + JWT, zod-валидация, middleware
│   ├── database.js         Схема, миграции, прогресс per-user
│   ├── push.js             Web Push: подписки, дневная джоба, VAPID
│   └── data/
│       ├── interview.db    SQLite (gitignored, на Render — disk)
│       ├── .jwt-secret     Авто-сгенерированный dev-секрет (gitignored)
│       └── seed/           topics.json + questions/NN-*.json
│
├── frontend/               React SPA
│   ├── src/
│   │   ├── pages/          Home / Topic / Study / Mock / Round /
│   │   │                   Cheatsheet / Search / Bookmarks /
│   │   │                   Stats / Admin / Login / Signup / Settings
│   │   ├── components/     Layout / Header / Sidebar / BottomNav /
│   │   │                   QuestionCard / TodayPlan / AccountMenu / ...
│   │   ├── ui/             Codex дизайн-кит: Button, Card, Pill, ...
│   │   ├── lib/            srs.ts, activity.ts, hint.ts, roundBuilder.ts, ...
│   │   ├── store/          Zustand: prefs, auth
│   │   ├── api/api.ts      Dual-mode (remote → localStorage fallback)
│   │   └── i18n/           EN/RU UI и контент
│   └── public/seed/        Статический бандл вопросов для Pages
│
├── render.yaml             Blueprint для Render
├── start.sh                Локальный запуск backend + frontend
└── .github/workflows/      CI + Pages deploy + Render hook
```

---

## Конфигурация

### Backend (`backend/.env`)

| Variable | Где обязательно | Что |
|---|---|---|
| `PORT` | — | Порт Express, по умолчанию 3001 |
| `NODE_ENV` | prod | `production` включает `trust proxy` + HSTS |
| `JWT_SECRET` | **prod** | 64+ случайных байт. В dev авто-генерится в `data/.jwt-secret` |
| `JWT_EXPIRES_IN` | — | По умолчанию `7d` |
| `FRONTEND_ORIGIN` | prod | Заблокировать CORS на конкретный origin |
| `ANTHROPIC_API_KEY` | — | Если задан, включает AI-grader на `/api/ai/grade` |
| `ADMIN_BOOTSTRAP_EMAIL` | — | Этот email на boot становится `is_admin = 1` (если зарегистрирован) |
| `FREE_AI_GRADES_PER_DAY` | — | Лимит AI-проверок для free-юзеров. По умолчанию `10` |
| `ANON_AI_GRADES_PER_DAY` | — | Лимит для анонимов. По умолчанию `3` |
| `STRIPE_SECRET_KEY` | для биллинга | Test/live ключ Stripe. Без него `/api/billing/*` отвечает 503 |
| `STRIPE_PRICE_ID` | для биллинга | ID Subscription Price (price_...) |
| `STRIPE_WEBHOOK_SECRET` | для биллинга | Подпись webhook-а (whsec_...) |
| `BILLING_SUCCESS_URL` / `BILLING_CANCEL_URL` | для биллинга | Куда возвращать после Stripe Checkout |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | для push | Пара ключей VAPID. Без них `/api/push/*` отвечает 503 |
| `VAPID_SUBJECT` | — | `mailto:` или `https://` контакт для push-сервисов. По умолчанию `mailto:admin@example.com` |
| `PUSH_SEND_HOUR` / `PUSH_QUIET_HOUR` | — | Окно доставки в **локальном** времени устройства. По умолчанию `9` и `22` |
| `PUSH_DAILY_JOB` | — | `off` — выключить внутренний таймер и дёргать джобу внешним cron'ом |
| `PUSH_CRON_SECRET` | для cron | Секрет для `POST /api/push/run-daily` (заголовок `X-Cron-Secret`) |

Сгенерировать секрет:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Сгенерировать пару VAPID (один раз на деплой — ротация отписывает все устройства):
```bash
cd backend && node -e "console.log(require('web-push').generateVAPIDKeys())"
```

### Frontend (`frontend/.env`)

| Variable | Что |
|---|---|
| `VITE_API_BASE_URL` | URL бэкенда. Пустая → `/api` через Vite-proxy на :3001. В prod — полный URL Render-сервиса. |
| `VITE_BASE_PATH` | Базовый путь, если деплой не в root. Авто-выводится из `GITHUB_REPOSITORY` в CI. |
| `VITE_POSTHOG_KEY` | Опциональный ключ PostHog. **Без ключа аналитика выключена** — SDK не грузится, запросов нет, события только логятся в dev-консоль. С ключом включаются все события из `AnalyticsEvent` в `lib/analytics.ts`. Do Not Track уважается. |
| `VITE_POSTHOG_HOST` | Хост PostHog. По умолчанию `https://us.i.posthog.com`; для EU-облака или self-hosted — свой. |
| `VITE_PLAUSIBLE_DOMAIN` | Альтернатива PostHog. Домен сайта, зарегистрированный в Plausible. Игнорируется, если задан `VITE_POSTHOG_KEY`. |

---

## Деплой

### Frontend → GitHub Pages

1. Settings → Pages → Source: **GitHub Actions**
2. Settings → Secrets and variables → Actions → **Variables** → создать `VITE_API_BASE_URL` со значением вида `https://<service>.onrender.com/api` (или оставить пустым, тогда сборка работает в анонимном static-fallback режиме). Опционально `SITE_URL` — для канонизации prerendered URL и sitemap.xml на свой кастомный домен (без этого — авто из `GITHUB_REPOSITORY`).
3. Push в `main` — workflow [`deploy-frontend-pages.yml`](.github/workflows/deploy-frontend-pages.yml) собирает, prerender'ит публичные страницы (113 URL: `/`, 4 landing, `/pricing`, `/contact`, 53 topics, 53 cheatsheets) и публикует.

Pages-сборка автоматически делает `404.html` копией `index.html`, чтобы SPA-роутинг работал на любой глубине.

#### SSG / prerender

`npm run build:ssg` запускает `vite build` + `node scripts/prerender.cjs`. Скрипт поднимает `vite preview`, ходит Puppeteer'ом по списку публичных маршрутов и сохраняет post-hydration HTML в `dist/<route>/index.html`. Это даёт корректные `<title>` / meta description / canonical URL крауллерам и сетям (Slack, LinkedIn, Twitter), которые не выполняют JS. React всё равно гидратируется поверх — пользовательский опыт SPA сохраняется.

### Backend → Render

Через Blueprint:

```bash
# 1. подключить репо в Render
# 2. New → Blueprint → выбрать render.yaml
```

Или вручную: New → Web Service → root directory `backend`, build `npm install`, start `node server.js`.

В Render Dashboard выставить env vars:
- `JWT_SECRET` (обязательно)
- `NODE_ENV=production`
- `FRONTEND_ORIGIN=https://<username>.github.io`

Persistent disk монтируется в `backend/data/` (см. `render.yaml`) — в этом месте живёт `interview.db` и `.jwt-secret`.

### Авто-деплой бэкенда из GitHub

В Render возьми Deploy Hook URL → положи в GitHub `Settings → Secrets and variables → Actions → Secrets` под именем `RENDER_DEPLOY_HOOK_URL`. Workflow [`deploy-backend-render.yml`](.github/workflows/deploy-backend-render.yml) дёргает hook на каждый push, затрагивающий `backend/**`.

---

## Безопасность

| Контроль | Как реализовано |
|---|---|
| **Хеширование паролей** | bcryptjs, 11 rounds |
| **Аутентификация** | JWT в `Authorization: Bearer`, 7d по умолчанию, secret в env / authoeticated dev-fallback |
| **Хранение токена** | localStorage на фронте — простой, понятный, XSS-vulnerable. Trade-off для personal-приложения. |
| **Заголовки** | `helmet` defaults: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, COOP, CORP |
| **HSTS** | Включается в `NODE_ENV=production` |
| **CORS** | Локально открыт; в проде блокируется на `FRONTEND_ORIGIN` |
| **Rate-limit** | 30 attempts / 15 min на auth-endpoints, 200 / 15 min на write-endpoints |
| **Валидация ввода** | zod-схемы на register/login/password/email + сервер-side limits на notes / name |
| **SQL-injection** | Параметризованные prepared-statements better-sqlite3 |
| **Timing-leaks при логине** | На неизвестный email всё равно вызывается `bcrypt.compare` с dummy hash |
| **Пароль ≠ email** | Проверка на register и change-password |
| **Whitespace-only password** | Reject, требуется ≥8 непробельных символов |
| **Open-redirect** | После логина `from` санитизируется до внутренних путей |
| **Mass assignment** | zod-схемы принимают только ожидаемые поля |
| **Body size** | 256 KB на запрос |
| **Bulk import** | Cap 1000 items, last-write-wins по `updated_at` |
| **Account deletion** | Каскадно удаляет прогресс пользователя |

**Что не закрыто (известные ограничения):**

- Нет восстановления пароля (нужен email-провайдер). Если забыл — создаёшь новый аккаунт.
- Нет OAuth-провайдеров (Google/GitHub) — намеренно, чтобы не зависеть от внешних сервисов.
- Нет 2FA.
- JWT stateless: logout удаляет токен только локально, серверной revocation нет (приемлемо при `expiresIn=7d`).
- Анонимный режим хранит прогресс в `localStorage` — не шифруется.

---

## Архитектура и dual-mode

Frontend написан так, чтобы **работать без backend**. Каждый сетевой вызов обёрнут в `tryRemote(remote, fallback)`:

```
api.js → tryRemote(remote, fallback)
              │
              ├─ remote: axios → /api/...
              │
              └─ fallback: localStorage + static-data.json
```

Это значит:
- На GitHub Pages без бэкенда — приложение полностью функционально (анонимный режим).
- С бэкендом и без логина — то же самое: писать прогресс на сервер не получится (401), фронт идёт в fallback.
- С логином — все вызовы идут через сервер, прогресс синхронизируется между устройствами.

При первой авторизации SignupPage предлагает **импортировать localStorage-прогресс** на сервер через `POST /api/progress/bulk` (last-write-wins по `updated_at`).

---

## Push-напоминания (Web Push)

Spaced repetition работает, только если пользователь возвращается в день,
когда карточка повторяется. Напоминания сделаны на **Web Push с собственными
VAPID-ключами** — так проект сохраняет свойство «никаких сторонних сервисов»
(email потребовал бы Resend/SES). Сервер обращается напрямую к push-эндпоинту
браузера; единственная новая зависимость — библиотека `web-push`, которая
подписывает запрос. Фронт уже PWA с service worker'ом, канал доставки есть.

Backend: [`backend/push.js`](backend/push.js) + таблица `push_subscriptions`.
Без `VAPID_*` фича выключается целиком: `/api/push/health` отдаёт
`{ enabled: false, reason }`, остальные роуты — 503. Ровно как `ai.js` без
`ANTHROPIC_API_KEY`.

**Откуда сервер знает, что карточка due.** Ниоткуда — и это честный ответ.
SM-2 состояние живёт в localStorage (`frontend/src/lib/srs.ts`, ключ
`rtf:srs:v1`), сервер хранит только `progress` (status + notes + updated_at) и
из него посчитать «сколько карточек сегодня» невозможно: интервал зависит от
`ease`/`reps`, которых у сервера нет. Поэтому **снимок присылает клиент** — при
подписке и при каждом синке (`POST /api/push/state`) он отдаёт `dueCount` и
`nextDueAt` из `getSrsSummary()`. Снимок хранится на строке подписки, а не
пользователя: подписка привязана к браузеру, localStorage — тоже, связь
один-к-одному.

Trade-off: снимок устаревает, если пользователь занимался там, где сервер об
этом не услышал. Направление безопасное — карточка остаётся due, пока её не
повторят, а повторение означает открытие приложения, то есть синк. `nextDueAt`
закрывает основной случай: «сейчас ничего, следующая в T» позволяет джобе
проснуться в T без нового синка. Устройство, которое ни разу не прислало
состояние, дневных напоминаний не получает вовсе; снимок старше 30 дней
перестаёт их порождать.

**Планировщик.** Один `setInterval` на 15 минут, без зависимостей. Защиты:
- **раз в сутки** — `last_notified_at` в SQLite, сравнение по **локальной** дате
  устройства. Лежит в базе, а не в памяти, поэтому рестарт процесса не шлёт
  сегодняшний пуш повторно;
- **тихие часы** — каждая подписка хранит `getTimezoneOffset()` браузера, так
  что «09:00» — это 09:00 у пользователя, а не 09:00 UTC. Timezone-базы не
  нужно;
- **без наложений** — флаг `running`, тики не пересекаются.

`404`/`410` от push-сервиса означает мёртвую подписку — строка удаляется сразу.
Любая другая ошибка логируется и не роняет ни джобу, ни запрос.

Вместо внутреннего таймера можно поставить внешний cron:
```bash
PUSH_DAILY_JOB=off   # выключить таймер
curl -fsS -X POST https://<api>/api/push/run-daily -H "X-Cron-Secret: $PUSH_CRON_SECRET"
```
Обе точки входа используют одну и ту же защиту в SQLite, так что запускать их
одновременно безопасно.

| Endpoint | Auth | Что делает |
|---|---|---|
| `GET /api/push/health` | опц. | `enabled`, `publicKey`, окно доставки; со входом — список устройств |
| `POST /api/push/subscribe` | JWT | Upsert подписки по `endpoint` (уникальный) |
| `POST /api/push/state` | JWT | Обновить `dueCount` / `nextDueAt` для устройства |
| `POST /api/push/unsubscribe` | JWT | Удалить подписку (работает даже когда push выключен) |
| `POST /api/push/test` | JWT | Тестовое уведомление на все устройства аккаунта |
| `POST /api/push/run-daily` | admin / `X-Cron-Secret` | Прогнать дневную джобу вручную |

---

## Фичи UX, на которые я тратил время

- **Active recall** — глобальный режим (Cmd+K), Study получает `gist`-textarea, QuestionCard прячет ответ за hint-ladder с blur-peek.
- **Today's plan** — композит SRS due + weakest topic + fresh, всё одним кликом.
- **Round** — кластеризация по тегам + ramp easy→hard, follow-up чипы для углубления.
- **Cheatsheet** — 2-col grid, print-ready, копия в Markdown.
- **Codex design system** — кастомные токены (`paper`, `ink`, `brand`, `mint`, `amber`, `coral`, `plum`), brutalist hard shadows, монограммы вместо эмодзи.
- **Light + Dark** — реально полированный, тени видны, heatmap читается.
- **Mobile** — bottom-nav, safe-area inset, тач-таргеты ≥40px.
- **Скелетоны и empty states** — никаких спиннеров на content-pages.
- **Cmd+K палитра** — навигация, темы, action-команды, recall-toggle, account.
- **i18n** — EN/RU параллельно, без рантайм-CDN.

---

## Roadmap

Что обсуждалось, но ещё не зашло:

- [ ] Forgot password (требует email-провайдера типа Resend)
- [ ] OAuth (Google) для гладкого онбординга
- [ ] Daily goal + smart resume
- [ ] AI-tutor (BYOK через Anthropic API) — кнопка «объясни проще»
- [x] ~~Push-уведомления для daily reminders (PWA Push API)~~ — backend готов (`backend/push.js`), осталась UI-часть: подписка в Settings + `push` handler в service worker
- [ ] Pomodoro timer в сайдбаре
- [ ] Notes hub — поиск + экспорт всех заметок в .md
- [ ] Achievement-милстоуны (first 7-day streak и т.д.)

---

## Локальная разработка

```bash
# Запустить всё
./start.sh

# Frontend unit-тесты (vitest, jsdom)
cd frontend && npm test

# Frontend typecheck (tsc --noEmit, allowJs включён — мигрируем инкрементально)
cd frontend && npm run typecheck

# Backend smoke-test (используется в CI)
cd backend
node -e "const db=require('./database');db.init();console.log('topics=',db.getTopics().length);"

# Frontend production build
cd frontend
npm run build && npm run preview
```

> **TypeScript-миграция в процессе.** `tsconfig.json` — strict + allowJs. Уже на TS: `lib/cn`, `lib/srs`, `lib/platform`, `lib/analytics`, `lib/useDocumentMeta`, `lib/hint`, `i18n/landings`, `types/domain`. Остальное живёт в `.js`/`.jsx` без типов; `npm run typecheck` проходит зелёным. Новые модули писать сразу в `.ts`/`.tsx`.

Покрытие точечное — критическая логика (SRS-планировщик, round-builder) под vitest, остальное держится на ручном тестировании и ESLint. Контрибьюшены с тестами на новую логику приветствуются.

---

## License

MIT. Используй, форкай, переделывай. Если запушишь публичную версию — было бы здорово сослаться на источник.

---

<div align="center">

Сделано на потоке в [Claude Code](https://claude.com/claude-code) одним разработчиком.

</div>
