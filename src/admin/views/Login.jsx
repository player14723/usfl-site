import { useState } from 'react'
import { useApp } from '../state'
import { api } from '../lib'
import { Button } from '../components/ui'

export function Login() {
  const { signIn } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      await signIn(email, password)
      const next = new URLSearchParams(location.search).get('next')
      if (next && next.startsWith('/') && !next.startsWith('//')) location.replace(next)
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="brand"><span className="brand-mark" aria-hidden="true">usfl</span><span>Website editor</span></div>
        <h1>Sign in</h1>
        <label className="field"><span className="field-label">Email</span><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label className="field"><span className="field-label">Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="form-error" role="alert">{err}</p>}
        <Button tone="primary" type="submit" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        <p className="muted small">Forgotten your password? Ask the site owner to reset it under Accounts.</p>
      </form>
    </div>
  )
}

/** Shown after signing in with a one-time password. */
export function ChoosePassword({ onDone, current: needCurrent = true }) {
  const { toast, reloadSession } = useApp()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (next !== again) return setErr('The two new passwords are different.')
    try {
      await api('/account/password', { method: 'POST', body: { current, next } })
      toast('Password changed — please sign in again')
      await reloadSession()
      onDone?.()
    } catch (x) { setErr(x.message) }
  }
  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Choose a new password</h1>
      <p className="muted">Use at least 10 characters. A short sentence works well.</p>
      {needCurrent && <label className="field"><span className="field-label">Current password</span><input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>}
      <label className="field"><span className="field-label">New password</span><input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></label>
      <label className="field"><span className="field-label">New password again</span><input className="input" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} /></label>
      {err && <p className="form-error" role="alert">{err}</p>}
      <Button tone="primary" type="submit" disabled={!next}>Change password</Button>
    </form>
  )
}
