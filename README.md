# Micro Video Hosting

[![CI](https://github.com/Raphailinc/Micro-Video-Hosting/actions/workflows/ci.yml/badge.svg)](https://github.com/Raphailinc/Micro-Video-Hosting/actions/workflows/ci.yml)

[English](README.md) · [Русский](README.ru.md)

A small full-stack project for uploading and browsing videos with tag-based navigation.

## What it does

- Upload video metadata and media files.
- Store records and tags in SQLite.
- Browse a video detail page or query paginated tag endpoints.
- Run Vitest checks for API helpers and page behavior.

## Run locally

```bash
npm ci
cp .env.example .env
npm run dev
```

## Checks

```bash
npm test
npm run lint
npm run build
```

## Scope and implementation notes

Local UI: `http://localhost:5173`. Media is stored on local disk. Development configuration disables API authentication; review `REQUIRE_AUTH`, `API_TOKEN`, upload limits and persistent storage before sharing an instance. The SVG preview is a UI illustration.
