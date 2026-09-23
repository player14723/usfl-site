import fs from 'node:fs'
import path from 'node:path'

/** Loads .env (then .env.local) from the project root into process.env, without overriding real variables. */
export function loadEnv(root) {
  for (const f of ['.env', '.env.local']) {
    const p = path.join(root, f)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (!m || line.trim().startsWith('#')) continue
      const v = m[2].replace(/^(['"])(.*)\1$/, '$2')
      if (process.env[m[1]] === undefined && v !== '') process.env[m[1]] = v
    }
  }
}
