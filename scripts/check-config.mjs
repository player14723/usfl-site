#!/usr/bin/env node
/**
 * Build check — validates the website content shipped in src/config and src/content (the default content the
 * database is created from). Runs before every build. The editor runs the same rules before every publish.
 * Errors stop the build; warnings are printed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readProjectFiles } from '../server/store.js'
import { assemble } from '../shared/bundle.js'
import { validateBundle } from '../shared/validate.js'
import { SECTION_TYPES } from '../shared/schema.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let docs
try { docs = readProjectFiles(ROOT) } catch (e) { console.error('error   ', e.message); process.exit(1) }
const bundle = assemble(docs)
const fileExists = (p) => fs.existsSync(path.join(ROOT, 'public', decodeURIComponent(p).replace(/^\//, '')))
const { errors, warnings, counts } = validateBundle(bundle, { fileExists })

// every schema section type must have a component in the registry, and vice versa
const registry = fs.readFileSync(path.join(ROOT, 'src/sections/registry.js'), 'utf8')
const block = registry.slice(registry.indexOf('export const SECTIONS'))
const registered = new Set([...block.matchAll(/^\s+'?([a-z-]+)'?:\s*\{/gm)].map((m) => m[1]))
for (const t of SECTION_TYPES) if (!registered.has(t.type)) errors.push({ doc: 'schema', message: `Section type "${t.type}" is in shared/schema.js but not in src/sections/registry.js` })
for (const t of registered) if (!SECTION_TYPES.some((s) => s.type === t)) errors.push({ doc: 'schema', message: `Section "${t}" is registered but has no editor schema in shared/schema.js` })

const tag = (s, c) => (process.stdout.isTTY ? `\x1b[${c}m${s}\x1b[0m` : s)
for (const w of warnings) console.log(tag('warning', 33), `[${w.doc}]`, w.message)
for (const e of errors) console.log(tag('error  ', 31), `[${e.doc}]`, e.message)
console.log(`\nContent check: ${counts.pages} pages, ${counts.cases} case studies, ${counts.capabilities} capabilities, ${counts.insights} insights — ${errors.length} error(s), ${warnings.length} warning(s).`)
if (errors.length) process.exit(1)
