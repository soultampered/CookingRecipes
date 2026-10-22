# Web / desktop companion (STO-83)

The mobile app is a SvelteKit SPA (`ssr: false`, `adapter-static`), so the same build runs
in any browser. STO-83 made that a supported target:

- Native-only plugin calls (App deep links, hardware back, Keyboard insets) are skipped off
  device (`Capacitor.isNativePlatform()`). Preferences / SecureStorage / Haptics / Share /
  Filesystem all have web fallbacks; print uses the browser dialog (STO-85), photos and
  barcode scanning use a file picker (STO-19 / STO-23).
- ≥900px wide: the bottom tab bar becomes a left sidebar.
- `static/manifest.webmanifest` makes it installable ("Install app" in Chrome/Edge).
- View-only until the `webEditing` release flag (2.6): the API answers 403 `WEB_READ_ONLY` to
  writes from a browser origin (`api/src/middleware/webReadOnly.middleware.ts`), and the app
  shows a "view-only" notice on the web. The native app is unaffected.
- Sign-in tokens are memory-only on the web (`lib/state/tokenStore.ts`): SecureStorage's web
  fallback is plain localStorage. A reload or new tab asks for sign-in again. Persisting web
  sessions needs the refresh token in an httpOnly cookie, which needs the API and the web
  app on the same site (e.g. `api.stokpot.ca` + `app.stokpot.ca`).

## Run locally

```sh
cd mobile && VITE_API_BASE_URL=http://localhost:3000 npm run dev   # http://localhost:5173
```

`http://localhost:5173` is already in the API's default CORS allowlist.

## Deploy (Cloudflare static assets, same as `legal/`)

1. Pick the domain (e.g. `app.stokpot.ca`).
2. API (Render): add it to `CORS_ORIGIN`. Setting the variable replaces the defaults, so list
   the Capacitor origins too:
   `CORS_ORIGIN=capacitor://localhost,http://localhost,https://localhost,https://app.stokpot.ca`
3. Build + deploy:
   ```sh
   cd mobile
   VITE_API_BASE_URL=https://cookingrecipes-gu7z.onrender.com npm run deploy:web
   ```
   (`wrangler.web.jsonc` → worker `stokpot-web`, SPA fallback to `index.html`.)
4. Point the domain at the `stokpot-web` worker in the Cloudflare dashboard.

Not automated in CI on purpose — the mobile pipeline doesn't need it, and the domain choice
is still open.
