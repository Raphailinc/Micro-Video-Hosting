# Micro Video Hosting (SvelteKit + SQLite)

Мини-хостинг видео на SvelteKit/SQLite: загрузка роликов, теги, просмотр и фильтр по тегам. API на file-based endpoints, хранение в `mydatabase.db`, загрузка файлов в `static/videos`.

## Запуск
```bash
pnpm install   # или npm/yarn
cp .env.example .env
pnpm dev
```

По умолчанию база `mydatabase.db` создаётся рядом с проектом. Видео складываются в `static/videos`.

## API/функционал
- `POST /api/add-video` — загрузка видео (FormData: `title`, `description`, `tags[]`, `video_file`).
- `GET /api/videos` — все видео с тегами.
- `GET /api/videos/:id` — карточка с тегами.
- `GET /api/videos-by-tag/:tag/:page/:limit` — пагинация по тегу.
- `GET /api/tags` — список всех тегов.
- `GET /api/home` — последние 6 видео.

## Разработчику
- База и таблицы создаются автоматически при старте.
- Настрой `BASE_URL` в `.env` для отдачи файлов (используется на страницах просмотра).
- Тесты не добавлены (UI/интеграция), но API вынесено в отдельные handlers для упрощения.

## Билд
```bash
pnpm build
pnpm preview
```
