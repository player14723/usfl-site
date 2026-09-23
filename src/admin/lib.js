/* Small helpers shared by the editor. */

let CSRF = ''
export const setCsrf = (t) => { CSRF = t || '' }

export class ApiError extends Error {
  constructor(message, status, details) { super(message); this.status = status; this.details = details }
}

/** fetch wrapper: JSON in/out, CSRF header, readable errors */
export async function api(path, { method = 'GET', body, raw } = {}) {
  const opts = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } }
  if (method !== 'GET') opts.headers['X-CSRF-Token'] = CSRF
  if (body !== undefined && !raw) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  if (raw) opts.body = raw
  let res
  try { res = await fetch(`/api${path}`, opts) } catch { throw new ApiError('Cannot reach the server. Check your connection and try again.', 0) }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.details)
  return data
}

/** Upload with progress (fetch cannot report upload progress) */
export function upload(file, { folder = '', onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('folder', folder)
    fd.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/media')
    xhr.setRequestHeader('X-CSRF-Token', CSRF)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => {
      let data = {}
      try { data = JSON.parse(xhr.responseText) } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new ApiError(data.error || `Upload failed (${xhr.status})`, xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('Upload failed — check your connection', 0))
    xhr.send(fd)
  })
}

/* ---------- paths into nested objects: "sections.3.lines.1" ---------- */
export const splitPath = (p) => (p === '' || p == null ? [] : String(p).split('.'))
export function getIn(obj, path) {
  let v = obj
  for (const k of splitPath(path)) { if (v == null) return undefined; v = v[k] }
  return v
}
export function setIn(obj, path, value) {
  const keys = splitPath(path)
  if (!keys.length) return value
  const [k, ...rest] = keys
  const isIndex = /^\d+$/.test(k)
  const base = obj == null ? (isIndex ? [] : {}) : obj
  const copy = Array.isArray(base) ? [...base] : { ...base }
  copy[k] = setIn(base[k], rest.join('.'), value)
  return copy
}
export const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)))

export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
export const plain = (s) => String(s ?? '').replace(/\*/g, '')
export const when = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 45) return 'just now'
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`
  if (diff < 86400 && d.getDate() === new Date().getDate()) return `today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleString([], { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', hour: '2-digit', minute: '2-digit' })
}
export const bytes = (n) => (!n ? '' : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`)
export const kindLabel = { page: 'Page', case: 'Case study', capability: 'Capability', insight: 'Insight', setting: 'Settings' }
export const STATUS = {
  published: { label: 'Published', tone: 'ok' },
  changed: { label: 'Draft changes', tone: 'warn' },
  new: { label: 'New — not published', tone: 'new' },
  deleted: { label: 'Will be removed', tone: 'danger' },
}
