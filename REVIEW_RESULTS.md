# prepiroshi — Multi-Agent Product Review

> Дата: 2026-05-01 · 5 независимых ракурсов + синтез
> Скоуп: текущий main (53 темы / 392 вопроса, Atlas design system, JWT auth, AI grader)

---

## TL;DR

**Это инженерно сильный, продуктово невнятный продукт.** Solo-built monorepo с серьёзным feature-set (SRS + Active Recall + AI grader + Round mode + bilingual + PWA + auth с bcrypt/JWT) и качественным контентом (392 кураторских вопроса). **Но позиционирование не сделано, retention отсутствует, монетизация нулевая, аналитики нет.** Это значит, что даже после хорошего launch-poста аудиторию не удержит и автор не сможет понять что работает.

**Стадия: между MVP и Product-Market Fit-attempt.** Чтобы перейти выше, нужны не features, а 4 не-инженерных шага: позиционирование, аналитика, retention petlja, narrow ICP.

---

## 1. CONSENSUS — что увидели несколько агентов

В порядке приоритета:

### A. **Положение продукта размыто** (PM, UX, Growth, User)
- PM: "контент размылен по 4 стекам без явного позиционирования"
- UX: "Hero не говорит с конкретной болью"
- Growth: "SEO long-tail не работает без отдельных landings"
- User: "не понимаю кому продукт в первые 5 секунд"

Один продукт пытается быть одновременно Flutter-prep, iOS-prep, Android-prep, KMP-prep. На лендинге нет "для кого", в hero нет "от кого". Это не масштабируется ни SEO-канально, ни PMM-каналом.

### B. **Retention механики отсутствуют** (PM, User, Engineer)
- PM: "Без push/email retention продукт мёртв через 3 дня для 80% юзеров"
- User: "psy: я один на сайте, нет ощущения что инструмент работает"
- Engineer: "AnsymtTo notifications API доступно, но не реализовано"

SRS — pull-механика, требует чтобы юзер сам вернулся. Без push/email/streak-loss-warning — D7 retention < 10%.

### C. **Нет аналитики** (PM, Growth, Engineer)
- Growth: "автор не знает funnel, retention, conversion"
- Engineer: "ноль интеграции gtag/posthog/plausible/amplitude"

Каждое продуктовое решение сейчас — гадание. Это блокер #1 для всех остальных решений.

### D. **README + brand отстают от реальности** (PM, UX, Engineer)
- Engineer: "README упоминает 23 темы / 210 вопросов; в реальности 53 / 392"
- UX: "Fraunces в deps, но Atlas Inter-only"
- PM: "ReadyToFlutter → prepiroshi pivot не отражён в README; backend Render service всё ещё называется readytoflutter"

### E. **Нет TypeScript на 11K+ LOC** (Engineer)
- Engineer: "каждый рефактор это walking blind"
- (UX косвенно): "копипаст Field, inline-button — без типов разъезд гарантирован"

### F. **Нет тестов** (Engineer + risk для PM)
- Auth, SRS, bulk-sync, AI-grader — ноль coverage
- Один баг в bulk last-write-wins = пользователи теряют прогресс

---

## 2. CONFLICTS — где агенты противоречат

### Конфликт 1: "более минимализма" vs "больше social proof"
- **UX** говорит: палитра перегружена (6 акцентов), Hero перегружен (eyebrow + title + sub + AI-pill + 3 CTA)
- **Growth** говорит: добавь testimonials, social proof, FAQ, pricing
- **User** говорит: добавь "trusted by N engineers", потому что бесплатность подозрительна

**Компромисс**: Hero оставить **с одним visual фокусом** (один CTA + один-строчный promise + ОДНА metric с цифрой "1,200 mobile devs prepped this month"). Social proof и testimonials — отдельной секцией ниже. FAQ — в подвал. **Не вали всё в hero**.

### Конфликт 2: "AI grader как hero" vs "AI grader как secret weapon"
- **PM**: AI grader — feature, не value prop. Снять из hero.
- **User Алекс**: AI grader — единственная причина остаться. Без него я бы ушёл к ChatGPT.

**Компромисс**: Hero обещает результат ("Pass your interview"), AI grader живёт в section #2 как "How does it work" с GIF-демкой recall mode. Это сохраняет визуальную чистоту hero И продаёт уникальность.

### Конфликт 3: "распилить monolith pages" vs "не трогай работающее"
- **Engineer**: SettingsPage 794 LOC, KnowledgePage 778, MockPage 697 — distill
- **CLAUDE.md project rule**: "Don't refactor things that aren't broken"

**Компромисс**: НЕ распиливать всё за один раз. Распил только когда **в этой странице нужна новая фича**. Settings и Knowledge — оставить. MockPage — следующий рефактор когда добавится timer / scoring новый.

---

## 3. SCORECARD

| Критерий | Оценка | Комментарий |
|----------|--------|------|
| Product-market fit | **4/10** | Hero без боли, ICP размыт, retention отсутствует |
| UX/UI | **7/10** | Atlas system силён, mobile реально нативный, но overload палитры |
| Growth potential | **3/10** | Без аналитики, без SEO-индексации SPA, без email-list |
| Technical foundation | **6.5/10** | Stack современный, security крепок; -TS, -tests, monolith pages |
| User appeal | **5/10** | AI-grader цепляет, но первые 5 сек — confusion |
| **ИТОГО** | **5.1/10** | |

---

## 4. STAGE DIAGNOSIS

- [x] Идея
- [x] Прототип
- [x] **MVP ← здесь**
- [ ] Product-Market Fit
- [ ] Scale

**Что нужно для перехода MVP → PMF (в порядке зависимостей):**

1. **Поставить аналитику** (3 часа) — без данных невозможно понять что работает.
2. **Сузить ICP до одной роли** — выбрать (Flutter / iOS / Android) и сделать на этой комбинации **отдельный landing с отдельным positioning**. Можно технически держать общий бэк, но три entry points: prepiroshi.dev/flutter, /ios, /android.
3. **Закрыть retention petlju** — email reminder через Resend (1 неделя работы), daily-due notification, weekly digest "you have 5 due cards".
4. **Run launch на одной из ICP-аудиторий** — Show HN или Twitter Flutter community. Замерить D1/D7/D30. Если D7 > 25% — сигнал PMF.
5. **Только потом монетизация** — без PMF премиум-tier работать не будет.

---

## 5. ROADMAP

### Следующие 2 недели (low effort, high impact)

1. **Поставить аналитику** (PostHog free / Plausible) — `frontend/src/main.jsx` или `index.html`. Tracки: pageview, study_session_start, study_session_complete, mock_complete, signup, ai_grade_used. **3 часа работы. Без этого все остальные пункты — guessing.**

2. **Обновить README + удалить старьё** — поменять "23 темы / 210 вопросов / Flutter и Dart" на "53 темы / 392 вопроса / Flutter+iOS+Android+KMP". Удалить `audit-*.png` из корня, удалить `@fontsource-variable/fraunces` из `frontend/package.json`. **30 минут.**

3. **Robots + sitemap** — `frontend/public/robots.txt` (allow all + sitemap link), скрипт генерации `sitemap.xml` из topics.json. Дать Google понять, что сайт существует. **2 часа.**

4. **OG image PNG** — заменить SVG на 1200×630 PNG (SVG не парсится Facebook/LinkedIn). Можно через canvas + headless puppeteer одной командой. **1 час.**

5. **Hero rewrite** — `frontend/src/pages/HomePage.jsx:91-180` переписать с одним promise + одной metric + одним primary CTA. Социальный proof — отдельная section ниже. AI grader — секция #2, не hero. **3 часа.**

### Следующие 2 месяца (стратегические)

1. **Сузить positioning + три landings** — `/flutter`, `/ios`, `/android` с разными hero-message и default platform-filter. Контент один, маркетинг разный. SEO канал открывается. Это **большая работа** (роутинг, copywriting, OG-images), но открывает long-tail SEO.

2. **Email retention loop** — Resend integration, daily reminder template, weekly digest. Backend новый endpoint `/api/notify/preferences`. Это даёт D7 retention.

3. **SSG для topic + question pages** — Next.js или Astro pivot для **публичных страниц** (отдельная сборка), чтобы Google индексировал ответы. Работает 1-2 месяца, но открывает SEO канал full power. Альтернатива: prerendering через `vite-plugin-prerender`.

### Следующие 6 месяцев (большие ставки)

1. **TypeScript migration** — 2 недели + ~$0 cost, **массивный ROI**. После 6 месяцев maintenance без TS вернуться к feature-rate невозможно.

2. **Премиум-tier с Stripe** — но **только после** замера D7 retention > 25% и MAU > 1000. Без PMF paywall убивает growth.

---

## 6. KILL LIST — что УБРАТЬ

1. **Sepia theme** (`index.css:.sepia` ветка) — никто не использует, добавляет сложность поддержки палитры (3 темы вместо 2). Просто `light` / `dark` достаточно.
2. **Admin page** (`/admin`, AdminPage.jsx 635 LOC) — это инструмент автора, он **не нужен в production bundle**. Перенести в `dev`-only роут или вообще в отдельный `frontend-admin` workspace.
3. **`@fontsource-variable/fraunces`** в deps — Atlas не использует Fraunces. Удалить.
4. **Инлайн EN/RU dictionaries в LoginPage/SignupPage** — вытащить в `i18n/`, иначе они расходятся.
5. **`PROD_API_FALLBACK = 'https://readytoflutter.onrender.com/api'` хардкод** в api.js:9 — должен быть только env, иначе deploy на новый домен сломает frontend.
6. **AI-grader pill в hero** (HomePage.jsx:122-142) — это feature-show, перенесите в section "How it works".
7. **Aurora glow blob в TodayPlan** на mobile (TodayPlan.jsx:166-176) — на узком экране занимает real estate без content.
8. **Старые audit-*.png** в корне репо — мусор от прошлой ревизии, в .gitignore не попали.

---

## 7. ONE THING — единственное что починить завтра

**Поставить аналитику.**

PostHog или Plausible, 3 часа работы, `frontend/index.html` + `frontend/src/main.jsx`. Tracking: pageview, signup, study_session_start, study_session_complete, mock_complete, ai_grade_used.

**Почему именно это:** все остальные пункты roadmap — это **гипотезы**. "Hero не конвертирует" — гипотеза. "Retention низкий" — гипотеза. "AI grader цепляет" — гипотеза User Алекса. **Без данных каждое решение — 50/50 ставка.** С данными — две недели и ты знаешь funnel, retention curve, top топики, drop-off points. Это foundational прежде чем тратить недели на rewrite Hero / SSG / email.

---

## 8. КОНКРЕТНЫЕ ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

В порядке приоритета:

| # | Файл | Что менять | Почему |
|---|------|----|----|
| 1 | `frontend/index.html` | Добавить PostHog/Plausible script tag + meta `og:image` PNG (а не SVG) + `<html lang>` динамически меняется через store | Аналитика + SEO критическая база |
| 2 | `frontend/src/main.jsx` | Identify call после login + capture key events | Идентификация юзеров |
| 3 | `frontend/public/robots.txt` (новый) | `User-agent: *\nAllow: /\nSitemap: https://prepiroshi.com/sitemap.xml` | SEO базис |
| 4 | `backend/scripts/generate-static-data.js` (расширить) | Генерировать `frontend/public/sitemap.xml` из topics.json | SEO long-tail |
| 5 | `README.md` | "23 темы / 210 вопросов / Flutter и Dart" → "53 темы / 392 вопроса / Flutter + iOS + Android + KMP" | Trust |
| 6 | `frontend/package.json` | Удалить `@fontsource-variable/fraunces` | Bundle hygiene |
| 7 | `frontend/src/pages/HomePage.jsx:91-180` | Hero rewrite: 1 promise + 1 metric + 1 CTA | Конверсия лендинга |
| 8 | `frontend/src/components/WelcomeDialog.jsx` (расширить) | Onboarding: spросить (1) стек (2) уровень (3) дата интервью | Tailored Today's Plan для нового юзера |
| 9 | `frontend/src/api/api.js:9` | Удалить `PROD_API_FALLBACK` хардкод | Deploy hygiene |
| 10 | `frontend/src/pages/SettingsPage.jsx` (распил) | На ProfileTab/SecurityTab/DangerTab — когда будет следующая security-фича | Тех-долг (не сейчас) |
| 11 | `frontend/src/components/TopicTile.jsx` | Сократить визуальный шум: убрать aurora hover на mobile | UX overload |
| 12 | `frontend/src/i18n/loginPage.js` (новый), `signupPage.js` (новый) | Вытащить inline EN/RU dicts | DRY i18n |
| 13 | Корень репо | Удалить `audit-*.png` из git | Repo hygiene |

---

## 9. 3 ВОПРОСА К ТЕБЕ

Чтобы следующая итерация анализа была глубже:

### 1. Какая твоя bizmodel в голове? Open-source paaс / B2C subscription / lead-gen для recruitment / просто portfolio?
*Это **самый важный** вопрос. От ответа зависит всё:*
- Если **portfolio** — забить на PMF, делать что нравится.
- Если **B2C subscription** — нужна монетизация и focus на conversion.
- Если **lead-gen** — partnership с rec-агентствами Германии/Нидерландов.
- Если **open-source саморекламируемый** — фокус на GitHub stars, не на retention.

### 2. Кто твой ICP в одной фразе?
"Junior Flutter dev из СНГ готовится к собесу в EU" — это конкретно. "Mobile developer at all levels" — это размыто. **Если выбрать одного юзера, всё остальное в продукте перестроится автоматом.** Без этого выбора каждое решение — компромисс между нескольких аудиторий.

### 3. Сколько у тебя времени на этот проект и на какой горизонт?
- "20 часов в неделю на 6 месяцев" — амбициозный roadmap имеет смысл (TS migration, SSG, email loop)
- "5 часов в неделю на 1-2 месяца" — забудь про большие ставки, фокус на quick wins (analytics + hero rewrite + retention email)

Без этого ответа я не могу честно сказать "делай TS migration" vs "делай только hero rewrite".

---

## Приложение: что НЕ оценивалось

- **Бэкенд performance** под нагрузкой (нет данных)
- **PWA install rate** (нет аналитики)
- **AI grader cost** в production (нет логов потребления Anthropic API)
- **Конверсия на signup** (нет аналитики)
- **D7/D30 retention** (нет аналитики)

Все эти white-spots закрываются пунктом ONE THING (analytics).
