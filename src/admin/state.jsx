import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, setCsrf, getIn, setIn, ApiError } from './lib'

/* ---------- app-wide state: session, document list, draft site, toasts, confirmations ---------- */
const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [docs, setDocs] = useState([])
  const [site, setSite] = useState(null) // draft bundle
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [changesVersion, setChangesVersion] = useState(0)

  const toast = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500)
  }, [])

  const refreshDocs = useCallback(async () => {
    const [d, s] = await Promise.all([api('/docs'), api('/site?stage=draft')])
    setDocs(d); setSite(s); setChangesVersion((v) => v + 1)
  }, [])

  const loadSession = useCallback(async () => {
    try {
      const s = await api('/session')
      setCsrf(s.csrf); setSession(s)
    } catch (e) { setSession(null) }
  }, [])
  useEffect(() => { loadSession() }, [loadSession])
  useEffect(() => { if (session?.user) refreshDocs().catch(() => {}) }, [session, refreshDocs])

  const signIn = async (email, password) => {
    const s = await api('/session', { method: 'POST', body: { email, password } })
    setCsrf(s.csrf); setSession(s)
    return s
  }
  const signOut = async () => { await api('/session', { method: 'DELETE' }).catch(() => {}); setSession(null) }

  /** confirm({ title, body, confirm: 'Delete', tone: 'danger' }) → Promise<boolean> */
  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), [])

  const can = useCallback((a) => Boolean(session?.permissions?.includes(a)), [session])
  const pending = docs.filter((d) => d.status !== 'published').length

  const value = useMemo(() => ({
    session, signIn, signOut, reloadSession: loadSession, docs, site, refreshDocs, toast, confirm, dialog, setDialog, toasts, can, pending,
    publishOpen, setPublishOpen, changesVersion,
  }), [session, docs, site, refreshDocs, toast, confirm, dialog, toasts, can, pending, publishOpen, changesVersion, loadSession])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/* ---------- editing one document: local state, undo/redo, autosave ---------- */
export function useDoc(key) {
  const { refreshDocs, toast } = useApp()
  const [doc, setDoc] = useState(null) // { draft, published, rev, ... }
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | saved | unsaved | saving | error | conflict | missing
  const [savedAt, setSavedAt] = useState(null)
  const [savedTick, setSavedTick] = useState(0)
  const hist = useRef({ past: [], future: [] })
  const rev = useRef(null)
  const timer = useRef(null)
  const latest = useRef(null)
  const saving = useRef(Promise.resolve())

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const d = await api(`/docs/${encodeURIComponent(key)}`)
      setDoc(d); rev.current = d.rev
      const v = d.draft ?? d.published
      setData(v); latest.current = v
      hist.current = { past: [], future: [] }
      setStatus(d.draft == null ? 'deleted' : 'saved')
    } catch (e) { setStatus(e.status === 404 ? 'missing' : 'error') }
  }, [key])
  useEffect(() => { load() }, [load])

  const save = useCallback(async () => {
    clearTimeout(timer.current)
    const value = latest.current
    const run = async () => {
      setStatus('saving')
      try {
        const r = await api(`/docs/${encodeURIComponent(key)}`, { method: 'PUT', body: { data: value, rev: rev.current } })
        rev.current = r.rev
        setSavedAt(r.updatedAt)
        setStatus(latest.current === value ? 'saved' : 'unsaved')
        setSavedTick((t) => t + 1)
        refreshDocs().catch(() => {})
      } catch (e) {
        if (e.status === 409) { setStatus('conflict'); toast(e.message, 'error') }
        else { setStatus('error'); toast(e.message, 'error') }
      }
    }
    saving.current = saving.current.then(run)
    return saving.current
  }, [key, refreshDocs, toast])

  const commit = useCallback((next, { immediate = false, record = true } = {}) => {
    setData((prev) => {
      if (record) {
        hist.current.past.push(prev)
        if (hist.current.past.length > 100) hist.current.past.shift()
        hist.current.future = []
      }
      return next
    })
    latest.current = next
    setStatus('unsaved')
    clearTimeout(timer.current)
    timer.current = setTimeout(save, immediate ? 0 : 800)
  }, [save])

  const change = useCallback((path, value, opts) => commit(setIn(latest.current, path, value), opts), [commit])
  const undo = useCallback(() => {
    const prev = hist.current.past.pop()
    if (prev === undefined) return false
    hist.current.future.push(latest.current)
    commit(prev, { immediate: true, record: false })
    return true
  }, [commit])
  const redo = useCallback(() => {
    const next = hist.current.future.pop()
    if (next === undefined) return false
    hist.current.past.push(latest.current)
    commit(next, { immediate: true, record: false })
    return true
  }, [commit])
  const flush = useCallback(async () => { if (status === 'unsaved' || timer.current) { await save() } }, [save, status])

  // save before the tab closes
  useEffect(() => {
    const h = (e) => { if (['unsaved', 'saving'].includes(status)) { save(); e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [status, save])
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); save() } }, [save])

  return {
    doc, data, status, savedAt, savedTick, change, commit, undo, redo, reload: load, flush,
    get: (p) => getIn(latest.current, p), canUndo: hist.current.past.length > 0, canRedo: hist.current.future.length > 0,
  }
}

export { ApiError }
