# Stokpot

Recipe app. Two parts:

- `api/` — Hono + MongoDB backend (root package)
- `mobile/` — SvelteKit frontend, wrapped with Capacitor for iOS/Android

## API

```
npm install
npm run dev
```

Runs on http://localhost:3000. Needs a `.env` (see `.env.example`) and a MongoDB instance (see `docker-compose.yml`).

## Mobile

```
cd mobile
npm install
npm run dev
```

See `mobile/README.md` for build and native (iOS/Android) steps.
