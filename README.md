# ReadyToFlutter

Подготовлено для публикации в GitHub с CI/CD.

## Что уже настроено

- CI: сборка фронтенда + smoke-check бэкенда
- CD фронтенда: автодеплой в GitHub Pages
- CD бэкенда: автотриггер деплоя через Render Deploy Hook (опционально)
- Конфиг для Render: [render.yaml](render.yaml)
- Переменные окружения-примеры:
  - [frontend/.env.example](frontend/.env.example)
  - [backend/.env.example](backend/.env.example)

## GitHub Actions

- CI: [.github/workflows/ci.yml](.github/workflows/ci.yml)
- Frontend CD (Pages): [.github/workflows/deploy-frontend-pages.yml](.github/workflows/deploy-frontend-pages.yml)
- Backend CD (Render Hook): [.github/workflows/deploy-backend-render.yml](.github/workflows/deploy-backend-render.yml)

## Как опубликовать (без домена)

### 1) Запушить проект

```bash
git init
git add .
git commit -m "chore: prepare CI/CD and deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2) Включить GitHub Pages

1. Открой репозиторий → Settings → Pages
2. Build and deployment → Source: **GitHub Actions**
3. После пуша workflow сам задеплоит фронт.

URL будет вида:

- `https://<your-username>.github.io/<your-repo>/`

### 3) Подключить URL бэкенда к фронту

В GitHub репозитории:

- Settings → Secrets and variables → Actions → **Variables**
- Создай переменную `VITE_API_BASE_URL`
- Значение, например: `https://readytoflutter-api.onrender.com/api`

После обновления переменной запусти workflow `Deploy Frontend to GitHub Pages` повторно.

### 4) Деплой бэкенда (опционально через Render)

В Render можно:

- создать сервис из этого репозитория (rootDir: `backend`), или
- использовать Blueprint из [render.yaml](render.yaml)

Чтобы работал автодеплой из GitHub Actions:

- в Render возьми Deploy Hook URL
- в GitHub: Settings → Secrets and variables → Actions → **Secrets**
- добавь `RENDER_DEPLOY_HOOK_URL`

Теперь при пуше в `main` с изменениями в `backend/**` workflow триггерит деплой.

## Локальный запуск

```bash
# backend
cd backend && npm install && npm start

# frontend (в новом терминале)
cd frontend && npm install && npm run dev
```

или:

```bash
./start.sh
```
