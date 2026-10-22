# STO-45 — Atlas DB user least-privilege

## Finding (2026-10-17, `npm run db:check-privileges` against prod `MONGO_URI`)

The check reported the prod connection as **over-privileged**: the API connects as a
personal admin user with a cluster-wide admin role. A leaked `MONGO_URI` (Render env, the
`mongo-backup.yml` secret, a laptop `.env`) would mean a full cluster takeover. The URI
also has no database path, so the driver falls back to its default database name.

Exact user, role and database names are kept out of this public repo.

## Fix (Atlas dashboard — needs Matthew)

1. **Database Access → Add New Database User**
   - Username: `stokpot-api`, password: generate (long, random).
   - Built-in role: **Read and write to any database**? **No.** Use *Specific Privileges*:
     `readWrite` on the app database.
2. **Database Access → Add New Database User** (for backups)
   - Username: `stokpot-backup`, *Specific Privileges*: `read` on the app database.
3. Update secrets:
   - Render `cookingrecipes-api` → `MONGO_URI` = `mongodb+srv://stokpot-api:<pw>@<cluster-host>/<app-db>`
     (put the database name in the path so it's no longer an accident).
   - GitHub Actions secret `MONGO_URI` (used by `mongo-backup.yml`) → the `stokpot-backup` URI.
   - Local `.env` → a dev database, never prod.
4. Verify: `MONGO_URI=<new uri> npm run db:check-privileges`. It should print `OK`.
5. Keep the personal admin user for dashboard and admin use only. Don't put it in any app config.

## Optional follow-up

Rename the app database to `stokpot`. Run `mongodump`/`mongorestore` into the new name,
swap the URI path, then drop the old one. Not required for least-privilege. It only matters for clarity.
