#!/usr/bin/env node
/**
 * Command-line tasks for developers and hosting.
 *
 *   npm run user:create -- <email> [owner|admin|editor] [name]   create an account (prints a one-time password)
 *   npm run user:reset  -- <email>                                set a new one-time password
 *   npm run content:export [-- draft]                             write the published (or draft) site back to src/config + src/content
 *   npm run content:import                                        load src/config + src/content into the DRAFT (publish it in the editor)
 */
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { openDb } from './db.js'
import { Store, readProjectFiles } from './store.js'
import { Auth } from './auth.js'
import { loadEnv } from './env.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnv(ROOT)
const db = openDb(path.resolve(ROOT, process.env.DATA_DIR || 'data'))
const store = new Store(db, { root: ROOT, fileExists: () => true })
store.seedIfEmpty()
const auth = new Auth(db)
const [cmd, ...args] = process.argv.slice(2)
const tempPassword = () => crypto.randomBytes(9).toString('base64url') + '-' + crypto.randomBytes(3).toString('hex')

try {
  if (cmd === 'user:create') {
    const [email, role = 'owner', ...name] = args
    const pw = tempPassword()
    auth.createUser({ email, role, name: name.join(' '), password: pw, mustChange: true })
    console.log(`Account created: ${email} (${role})\nOne-time password: ${pw}\nSign in at /admin — you will be asked to choose a new password.`)
  } else if (cmd === 'user:reset') {
    const u = db.prepare('SELECT id FROM users WHERE email = ?').get(String(args[0] || '').toLowerCase())
    if (!u) throw new Error('No account with that email')
    const pw = tempPassword()
    auth.setPassword(u.id, pw, { mustChange: true })
    console.log(`New one-time password for ${args[0]}: ${pw}`)
  } else if (cmd === 'content:export') {
    const files = store.exportToFiles(args[0] === 'draft' ? 'draft' : 'published')
    console.log(`Wrote ${files.length} files to src/config and src/content.`)
  } else if (cmd === 'content:import') {
    const docs = readProjectFiles(ROOT)
    for (const { key, data } of docs) store.save(key, data, 'import', { reason: 'import' })
    console.log(`Loaded ${docs.length} documents into the draft. Review and publish them in the editor.`)
  } else {
    console.log('Commands: user:create <email> [role] [name] · user:reset <email> · content:export [draft] · content:import')
  }
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
