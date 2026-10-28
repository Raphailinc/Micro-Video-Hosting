# Micro Video Hosting

[![CI](https://github.com/Raphailinc/Micro-Video-Hosting/actions/workflows/ci.yml/badge.svg)](https://github.com/Raphailinc/Micro-Video-Hosting/actions/workflows/ci.yml)

[English](README.md) · [Русский](README.ru.md)

Небольшой fullstack-проект загрузки и просмотра видео с навигацией по тегам.

## Возможности

- Загрузка видеофайлов и метаданных.
- Хранение записей и тегов в SQLite.
- Страница видео и API тегов с пагинацией.
- Тесты API и поведения страниц через Vitest.

## Локальный запуск

```bash
npm ci
cp .env.example .env
npm run dev
```

## Проверки

```bash
npm test
npm run lint
npm run build
```

## Условия запуска и границы проекта

Нужен Node.js 22.17+. Интерфейс: http://localhost:5173. SvelteKit 3, Svelte 5, Vite 8, Vitest 5; конфигурация — vite.config.js, #lib задаётся через package imports. Медиафайлы хранятся на диске. В разработке аутентификация API выключена: перед общим доступом настройте REQUIRE_AUTH, API_TOKEN, лимиты загрузок и постоянное хранилище. Проверяется сигнатура видеоконтейнера; поддельный Content-Type отклоняется. Бинарные тестовые образцы проверяют распознавание формата, а не воспроизведение видео. SVG в docs — иллюстрация интерфейса.
