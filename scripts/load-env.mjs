import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Minimal .env reader so plain `node scripts/*.mjs` runs pick up the same variables Next.js loads
// automatically. .env.local wins over .env, and existing process.env values always win over both.
export function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const fullPath = path.join(root, file);
    if (!existsSync(fullPath)) continue;

    for (const line of readFileSync(fullPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      const isQuoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
      if (isQuoted) value = value.slice(1, -1);

      process.env[key] = value;
    }
  }
}
