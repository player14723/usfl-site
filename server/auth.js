/**
 * Accounts, sign-in and permissions.
 *
 * Passwords are hashed with scrypt (a per-user salt). A sign-in creates a random session token; the browser keeps
 * it in an HttpOnly, SameSite=Lax cookie and the database keeps only its SHA-256 hash. Every change request must
 * also carry the session's CSRF token in the X-CSRF-Token header.
 *
 * Roles
 *   owner   everything, including managing accounts
 *   admin   edit, publish, restore versions, delete media, read form messages
 *   editor  edit drafts and upload media (cannot publish)
 */
import crypto from 'node:crypto'
import { now } from './db.js'
import { httpError } from './store.js'

export const ROLES = ['owner', 'admin', 'editor']
const CAN = {
  owner: ['edit', 'publish', 'restore', 'media.delete', 'users', 'inbox', 'settings'],
  admin: ['edit', 'publish', 'restore', 'media.delete', 'inbox', 'settings'],
  editor: ['edit'],
}
export const can = (user, action) => Boolean(user && CAN[user.role]?.includes(action))
export const permissions = (role) => CAN[role] || []

const COOKIE = 'site_session'
const SESSION_DAYS = 14
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}
function verifyPassword(pw, stored) {
  const [alg, s, k] = String(stored).split('$')
  if (alg !== 'scrypt') return false
  const key = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 })
  const want = Buffer.from(k, 'base64')
  return want.length === key.length && crypto.timingSafeEqual(want, key)
}
export function checkPasswordStrength(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use at least 10 characters.'
  if (pw.length > 200) return 'That password is too long.'
  if (/^(.)\1+$/.test(pw) || /^(password|1234567890|qwertyuiop)/i.test(pw)) return 'Choose a less predictable password.'
  return null
}

export class Auth {
  constructor(db, { secure = false } = {}) {
    this.db = db
    this.secure = secure
    this.failures = new Map() // ip|email → { n, until }
  }

  /* ---------- users ---------- */
  users() { return this.db.prepare('SELECT id, email, name, role, created_at, last_login, disabled, must_change FROM users ORDER BY id').all() }
  userById(id) { return this.db.prepare('SELECT id, email, name, role, disabled, must_change FROM users WHERE id = ?').get(id) }
  count() { return this.db.prepare('SELECT COUNT(*) n FROM users WHERE disabled = 0').get().n }

  createUser({ email, name = '', role = 'editor', password, mustChange = true }) {
    email = String(email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpError(400, 'Enter a valid email address')
    if (!ROLES.includes(role)) throw httpError(400, 'Unknown role')
    const weak = checkPasswordStrength(password)
    if (weak) throw httpError(400, weak)
    if (this.db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw httpError(409, 'An account with that email already exists')
    const r = this.db.prepare('INSERT INTO users (email, name, role, pass_hash, created_at, must_change) VALUES (?, ?, ?, ?, ?, ?)')
      .run(email, String(name).slice(0, 80), role, hashPassword(password), now(), mustChange ? 1 : 0)
    return this.userById(Number(r.lastInsertRowid))
  }

  updateUser(id, { name, role, disabled }, actor) {
    const u = this.userById(id)
    if (!u) throw httpError(404, 'Account not found')
    if (role && !ROLES.includes(role)) throw httpError(400, 'Unknown role')
    const owners = this.db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'owner' AND disabled = 0").get().n
    if (u.role === 'owner' && owners <= 1 && ((role && role !== 'owner') || disabled)) throw httpError(400, 'The site needs at least one active owner')
    if (actor.id === u.id && disabled) throw httpError(400, 'You cannot disable your own account')
    this.db.prepare('UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), disabled = COALESCE(?, disabled) WHERE id = ?')
      .run(name ?? null, role ?? null, disabled == null ? null : disabled ? 1 : 0, id)
    if (disabled) this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
    return this.userById(id)
  }

  deleteUser(id, actor) {
    const u = this.userById(id)
    if (!u) throw httpError(404, 'Account not found')
    if (actor.id === u.id) throw httpError(400, 'You cannot remove your own account')
    const owners = this.db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'owner' AND disabled = 0").get().n
    if (u.role === 'owner' && owners <= 1) throw httpError(400, 'The site needs at least one active owner')
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id)
  }

  setPassword(id, password, { mustChange = false } = {}) {
    const weak = checkPasswordStrength(password)
    if (weak) throw httpError(400, weak)
    this.db.prepare('UPDATE users SET pass_hash = ?, must_change = ? WHERE id = ?').run(hashPassword(password), mustChange ? 1 : 0, id)
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
  }

  changeOwnPassword(user, current, next) {
    const row = this.db.prepare('SELECT pass_hash FROM users WHERE id = ?').get(user.id)
    if (!row || !verifyPassword(String(current || ''), row.pass_hash)) throw httpError(400, 'Your current password is not correct')
    this.setPassword(user.id, next)
  }

  /* ---------- sign-in ---------- */
  login(email, password, { ip = '', ua = '' } = {}) {
    email = String(email || '').trim().toLowerCase()
    const k = `${ip}|${email}`
    const f = this.failures.get(k)
    if (f && f.until > Date.now()) throw httpError(429, `Too many attempts. Try again in ${Math.ceil((f.until - Date.now()) / 60000)} minute(s).`)
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    const ok = row && !row.disabled && verifyPassword(String(password || ''), row.pass_hash)
    if (!ok) {
      if (!row) verifyPassword('x', hashPassword('timing-equaliser')) // similar timing for unknown accounts
      const n = (f?.n || 0) + 1
      this.failures.set(k, { n, until: n >= 5 ? Date.now() + Math.min(60, 2 ** (n - 5)) * 60000 : 0 })
      throw httpError(401, 'That email and password do not match an account')
    }
    this.failures.delete(k)
    const token = crypto.randomBytes(32).toString('base64url')
    const csrf = crypto.randomBytes(24).toString('base64url')
    const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString()
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, csrf, created_at, expires_at, ip, ua) VALUES (?, ?, ?, ?, ?, ?, ?)').run(sha(token), row.id, csrf, now(), expires, ip, String(ua).slice(0, 200))
    this.db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), row.id)
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now())
    return { token, csrf, expires, user: this.userById(row.id) }
  }

  logout(token) { if (token) this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token)) }

  /** → { user, csrf } or null */
  session(token) {
    if (!token) return null
    const s = this.db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(sha(token))
    if (!s || s.expires_at < now()) return null
    const user = this.userById(s.user_id)
    if (!user || user.disabled) return null
    return { user, csrf: s.csrf }
  }

  cookie(token, expires) {
    const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Expires=${new Date(expires).toUTCString()}`]
    if (this.secure) parts.push('Secure')
    return parts.join('; ')
  }
  clearCookie() { return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${this.secure ? '; Secure' : ''}` }
  tokenFrom(req) {
    const c = req.headers.cookie || ''
    const m = c.split(/;\s*/).find((x) => x.startsWith(COOKIE + '='))
    return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null
  }

  /* ---------- express middleware ---------- */
  attach() {
    return (req, _res, next) => {
      const s = this.session(this.tokenFrom(req))
      req.user = s?.user || null
      req.csrf = s?.csrf || null
      next()
    }
  }
  require(action) {
    return (req, _res, next) => {
      if (!req.user) return next(httpError(401, 'Please sign in'))
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const t = req.get('x-csrf-token')
        if (!t || !req.csrf || t.length !== req.csrf.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(req.csrf))) return next(httpError(403, 'Your session has expired — reload the editor'))
      }
      if (action && !can(req.user, action)) return next(httpError(403, 'Your account is not allowed to do this'))
      next()
    }
  }
}
