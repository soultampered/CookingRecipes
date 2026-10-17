// STO-45: reports the MONGO_URI user's roles and flags anything beyond what the API needs
// (read/readWrite on its own database). Read-only — runs connectionStatus, changes nothing.
// Usage: npm run db:check-privileges   (exits 1 if over-privileged)
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const ALLOWED_ROLES = new Set(['read', 'readWrite']);

interface RoleRef {
    role: string;
    db: string;
}

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not defined');

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const appDb = db.databaseName;
        const status = await db.admin().command({ connectionStatus: 1, showPrivileges: true });
        const users: { user: string; db: string }[] = status.authInfo?.authenticatedUsers ?? [];
        const roles: RoleRef[] = status.authInfo?.authenticatedUserRoles ?? [];

        console.log(`App database: ${appDb}`);
        console.log(`Authenticated as: ${users.map((u) => `${u.user}@${u.db}`).join(', ') || '(none)'}`);
        console.log('Roles:');
        for (const r of roles) console.log(`  - ${r.role} on ${r.db}`);

        const problems = roles.filter((r) => !ALLOWED_ROLES.has(r.role) || r.db !== appDb);
        if (users.length === 0) {
            console.log('\nNo authenticated user (auth disabled?) — nothing to check.');
            return;
        }
        if (problems.length === 0) {
            console.log(`\nOK: least-privilege (read/readWrite on "${appDb}" only).`);
            return;
        }
        console.log('\nOVER-PRIVILEGED — the API only needs readWrite on its own database:');
        for (const r of problems) console.log(`  ✗ ${r.role} on ${r.db}`);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 2;
});
