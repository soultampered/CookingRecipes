# STO-45 — Atlas DB user least-privilege

## Finding (2026-10-17, `npm run db:check-privileges` against prod `MONGO_URI`)

```
App database: test
Authenticated as: m_dye@admin
Roles:
  - atlasAdmin on admin
OVER-PRIVILEGED
```

- The API connects as a **personal admin user** with `atlasAdmin`, which grants every
  database on the cluster plus user and role management. A leaked `MONGO_URI` (Render env,
  the `mongo-backup.yml` secret, a laptop `.env`) is a full cluster takeover.
- The URI has no database path, so the driver falls back to **`test`**. All prod data
  lives in a database called `test`.

## Fix (Atlas dashboard — needs Matthew)

1. **Database Access → Add New Database User**
   - Username: `stokpot-api`, password: generate (long, random).
   - Built-in role: **Read and write to any database**? **No.** Use *Specific Privileges*:
     `readWrite` @ `test`.
2. **Database Access → Add New Database User** (for backups)
   - Username: `stokpot-backup`, *Specific Privileges*: `read` @ `test`.
3. Update secrets:
   - Render `cookingrecipes-api` → `MONGO_URI` = `mongodb+srv://stokpot-api:<pw>@<cluster-host>/test`
     (add `/test` explicitly so the db name is no longer an accident).
   - GitHub Actions secret `MONGO_URI` (used by `mongo-backup.yml`) → the `stokpot-backup` URI.
   - Local `.env` → a dev database, never prod.
4. Verify: `MONGO_URI=<new uri> npm run db:check-privileges`. It should print `OK`.
5. Keep `m_dye` for dashboard and admin use only. Don't put it in any app config.

## Optional follow-up

Rename `test` → `stokpot`. Run `mongodump`/`mongorestore` into the new name, swap the
URI path, then drop `test`. Not required for least-privilege. It only matters for clarity.
