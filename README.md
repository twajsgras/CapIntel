# News Dash

Personal PWA news aggregator covering **AI**, **Fintech**, and **Energy**. Single-page app, no backend, deployed via GitHub Pages.

## Features

- Topic filter chips (All / AI / Fintech / Energy) + Starred view
- Live search across loaded articles
- Star to save for later (localStorage)
- Per-source toggles in Settings
- Dark mode default, light toggle
- Pull-to-refresh on mobile, `r` to refresh / `/` to focus search on desktop
- Installable (manifest + service worker), works offline against the last fetched feed
- 15-minute localStorage cache to keep RSS proxy traffic low

## How it works

RSS feeds are fetched client-side through [rss2json](https://rss2json.com), which returns clean JSON and avoids CORS issues. Articles are deduplicated, sorted by publish time, and persisted in `localStorage` for offline reads.

## Files

```
index.html              app shell
styles.css              design tokens, layout
app.js                  state, fetch, render, search, star, settings
sw.js                   service worker (shell + runtime cache)
manifest.webmanifest    PWA manifest
icons/                  192/512 PNGs + apple-touch-icon
.github/workflows/      GitHub Pages deploy
```

## Local dev

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Service workers require HTTPS or localhost. The 15-min cache lives in `localStorage` — clear it with DevTools > Application > Storage if you want fresh data.

## Deploy

GitHub Actions deploys on push to the active branch. After the first push, go to **Settings → Pages → Source: GitHub Actions** once.

## Editing sources

Edit the `FEEDS` array at the top of `app.js`. Each entry needs an `id`, `topic` (`ai` / `fintech` / `energy`), `name`, and `url`.
