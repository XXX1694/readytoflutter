<div align="center">

# prepiroshi · Codex

**Серьёзная подготовка к собеседованию по Flutter и Dart.**
210 вопросов, 23 темы, SRS, mock-собеседование, активное припоминание, шпаргалки и интервью-раунды.

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
| **Topics** | 23 темы Junior → Senior. Hint-ladder reveal, заметки, закладки, TTS. |
| **Study (SRS)** | SuperMemo SM-2, активное припоминание (gist textarea), 4-балльная оценка. |
| **Mock interview** | Случайная подборка с таймером и self-grade в стиле «как на собеседовании». |
| **Round** | 5 связанных вопросов из одной темы (кластеризация по тегам, ramp easy → hard). |
| **Cheatsheet** | Сжатая 2-колоночная шпаргалка темы — print-ready, экспорт в Markdown. |
| **Stats** | Mastery map: completion % × SRS ease, weak topics, per-level breakdown. |
| **Auth** | Email + bcrypt + JWT, синхронизация прогресса между устройствами. Опционально. |
| **Mobile** | Bottom-nav на узких экранах, drawer-сайдбар, brutalist + safe-area. |
| **PWA** | Установка, offline-first для статики, Workbox precaching. |

Поддержка `EN` и `RU`, светлой и тёмной темы, кастомного дизайн-кита **Codex** (Fraunces + Inter + JetBrains Mono).

---

## Стек

**Frontend** &middot; React 18 &middot; Vite 5 &middot; Tailwind CSS &middot; Zustand &middot; TanStack Query &middot; React Router 6 &middot; Framer Motion &middot; Radix UI &middot; cmdk &middot; MiniSearch &middot; Shiki &middot; Sonner &middot; vite-plugin-pwa.

**Backend** &middot; Node 18+ &middot; Express 4 &middot; better-sqlite3 (WAL) &middot; bcryptjs &middot; jsonwebtoken &middot; helmet &middot; express-rate-limit &middot; zod.

**Без AI**, без внешних ML-сервисов, без сторонних auth-провайдеров. Всё работает локально.

---

## Быстрый старт

```bash
# 1. Клонируй
git clone <your-repo>.git readytoflutter
cd readytoflutter

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
readytoflutter/
├── backend/                Express + SQLite API
│   ├── server.js           Маршруты, helmet, rate-limit, CORS
│   ├── auth.js             bcrypt + JWT, zod-валидация, middleware
│   ├── database.js         Схема, миграции, прогресс per-user
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
│   │   ├── lib/            srs.js, activity.js, hint.js, roundBuilder.js, ...
│   │   ├── store/          Zustand: prefs, auth
│   │   ├── api/api.js      Dual-mode (remote → localStorage fallback)
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

Сгенерировать секрет:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Frontend (`frontend/.env`)

| Variable | Что |
|---|---|
| `VITE_API_BASE_URL` | URL бэкенда. Пустая → `/api` через Vite-proxy на :3001. В prod — полный URL Render-сервиса. |
| `VITE_BASE_PATH` | Базовый путь, если деплой не в root. Авто-выводится из `GITHUB_REPOSITORY` в CI. |

---

## Деплой

### Frontend → GitHub Pages

1. Settings → Pages → Source: **GitHub Actions**
2. Settings → Secrets and variables → Actions → **Variables** → создать `VITE_API_BASE_URL` со значением вида `https://<service>.onrender.com/api` (или оставить пустым, тогда сборка работает в анонимном static-fallback режиме).
3. Push в `main` — workflow [`deploy-frontend-pages.yml`](.github/workflows/deploy-frontend-pages.yml) собирает и публикует.

Pages-сборка автоматически делает `404.html` копией `index.html`, чтобы SPA-роутинг работал на любой глубине.

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

## Фичи UX, на которые я тратил время

- **Active recall** — глобальный режим (Cmd+K), Study получает `gist`-textarea, QuestionCard прячет ответ за hint-ladder с blur-peek.
- **Today's plan** — композит SRS due + weakest topic + fresh, всё одним кликом.
- **Round** — кластеризация по тегам + ramp easy→hard, follow-up чипы для углубления.
- **Cheatsheet** — 2-col grid, print-ready, копия в Markdown.
- **Codex design system** — кастомные токены (`paper`, `ink`, `brand`, `mint`, `amber`, `coral`, `plum`), brutalist hard shadows, монограммы вместо эмодзи.
- **Dark mode** — реально полированный, тени видны, heatmap читается.
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
- [ ] Push-уведомления для daily reminders (PWA Push API)
- [ ] Pomodoro timer в сайдбаре
- [ ] Notes hub — поиск + экспорт всех заметок в .md
- [ ] Achievement-милстоуны (first 7-day streak и т.д.)

---

## Локальная разработка

```bash
# Запустить всё
./start.sh

# Backend smoke-test (используется в CI)
cd backend
node -e "const db=require('./database');db.init();console.log('topics=',db.getTopics().length);"

# Frontend production build
cd frontend
npm run build && npm run preview
```

Тестов автоматизированных нет — приоритеты были на UX и feature velocity. Если будешь форкать, рекомендую добавить vitest.

---

## License

MIT. Используй, форкай, переделывай. Если запушишь публичную версию — было бы здорово сослаться на источник.

---

<div align="center">

Сделано на потоке в [Claude Code](https://claude.com/claude-code) одним разработчиком.

</div>
