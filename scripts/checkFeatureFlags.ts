// Flags are temporary: fails when removeAfter <= app version, or when mobile keys drift from the API.
import { readFileSync } from "fs";
import { FEATURES } from "../api/src/config/features.js";
import { FEATURE_KEYS as APP_KEYS } from "../mobile/src/lib/features.js";

const gradle = readFileSync(new URL("../mobile/android/app/build.gradle", import.meta.url), "utf8");
const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
if (!versionName) throw new Error("versionName not found in build.gradle");

const parts = (v: string) => v.split(".").map(Number);
function atLeast(version: string, release: string): boolean {
    const [a, b] = [parts(version), parts(release)];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
    }
    return true;
}

const problems: string[] = [];
for (const [key, flag] of Object.entries(FEATURES)) {
    if (atLeast(versionName, flag.removeAfter)) {
        problems.push(`${key}: removeAfter ${flag.removeAfter} but the app is ${versionName}. Delete the flag and its checks.`);
    }
}
const api = new Set(Object.keys(FEATURES));
const app = new Set<string>(APP_KEYS);
for (const k of api) if (!app.has(k)) problems.push(`${k}: in api/src/config/features.ts but not mobile/src/lib/features.ts`);
for (const k of app) if (!api.has(k)) problems.push(`${k}: in mobile/src/lib/features.ts but not api/src/config/features.ts`);

if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
}
console.log(`${api.size} release flags OK for app ${versionName}.`);
