import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

// CLI-pulled variables stay server-side. Explicit host variables take precedence.
for (const filename of ['.env.local', '.env']) {
  const path = fileURLToPath(new URL('../' + filename, import.meta.url));
  if (!existsSync(path)) continue;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
