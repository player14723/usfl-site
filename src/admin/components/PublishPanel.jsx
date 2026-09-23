import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, when, STATUS } from '../lib'
import { useApp } from '../state'
import { Badge, Button, Icon } from './ui'
import { editPathFor } from './links'

/** Everything that differs between the draft and the live site, the checks, and the Publish button. */
export default function PublishPanel({ onClose }) {
  const { can, toast, refreshDocs, confirm, changesVersion } = useApp()
  const nav = useNavigate()
  const [changes, setChanges] = useState(null)
  const [check, setCheck] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(null)

  const load = async () => {
    const [c, v] = await Promise.all([api('/changes'), api('/validate')])
    setChanges(c); setCheck(v)
  }
  useEffect(() => { load().catch(() => {}) }, [changesVersion])

  const publish = async () => {
    setBusy(true)
    try {
      const r = await api('/publish', { method: 'POST', body: { note } })
      toast(`Published — ${r.changes} change${r.changes === 1 ? '' : 's'} are now live`)
      setNote('')
      await refreshDocs()
      onClose()
    } catch (e) {
      toast(e.message, 'error')
      if (e.details) setCheck((c) => ({ ...c, errors: e.details }))
    } finally { setBusy(false) }
  }
  const discardAll = async () => {
    if (!(await confirm({ title: 'Discard all draft changes?', body: 'Every page and setting goes back to what is live now. Earlier drafts stay in each page’s history.', confirm: 'Discard all', tone: 'danger' }))) return
    await api('/discard', { method: 'POST' })
    toast('Draft changes discarded'); refreshDocs(); load()
  }
  const discardOne = async (key, title) => {
    if (!(await confirm({ title: `Discard changes to “${title}”?`, body: 'It goes back to what is live now.', confirm: 'Discard', tone: 'danger' }))) return
    await api(`/docs/${encodeURIComponent(key)}/discard`, { method: 'POST' })
    toast('Changes discarded'); refreshDocs(); load()
  }

  const errors = check?.errors || []
  const warnings = check?.warnings || []
  return (
    <aside className="drawer" aria-label="Publish">
      <header className="drawer-head">
        <h2>Publish</h2>
        <button type="button" className="ibtn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
      </header>
      <div className="drawer-body">
        {!changes ? <p className="muted">Checking…</p> : changes.length === 0 ? (
          <div className="empty"><h3>Everything is live</h3><p>The website shows exactly what is in the editor. Make a change and it will appear here before it goes live.</p></div>
        ) : (
          <>
            <p className="muted">{changes.length} change{changes.length === 1 ? '' : 's'} waiting. Visitors see none of this until you publish.</p>
            <ul className="changes">
              {changes.map((c) => (
                <li key={c.key}>
                  <div className="change-row">
                    <Badge tone={STATUS[c.status]?.tone}>{STATUS[c.status]?.label}</Badge>
                    <button type="button" className="linklike change-title" onClick={() => { onClose(); nav(editPathFor(c.key)) }}>{c.title}</button>
                    <span className="muted small">{c.updatedBy} · {when(c.updatedAt)}</span>
                  </div>
                  <div className="row-gap">
                    {c.diff.length > 0 && <button type="button" className="link-sm" onClick={() => setOpen(open === c.key ? null : c.key)}>{open === c.key ? 'Hide details' : `What changed (${c.diff.length}${c.diff.length >= 60 ? '+' : ''})`}</button>}
                    <button type="button" className="link-sm danger" onClick={() => discardOne(c.key, c.title)}>Discard</button>
                  </div>
                  {open === c.key && (
                    <table className="diff"><tbody>{c.diff.map((d, i) => <tr key={i}><th>{d.path}</th><td><del>{d.before}</del><ins>{d.after}</ins></td></tr>)}</tbody></table>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {errors.length > 0 && (
          <section className="checklist bad"><h3><Icon name="alert" /> Fix before publishing</h3><ul>{errors.map((e, i) => <li key={i}><button type="button" className="linklike" onClick={() => { onClose(); nav(editPathFor(e.doc)) }}>{e.message}</button></li>)}</ul></section>
        )}
        {warnings.length > 0 && (
          <section className="checklist warn"><h3>Worth a look ({warnings.length})</h3><ul>{warnings.slice(0, 12).map((e, i) => <li key={i}>{e.message}</li>)}</ul></section>
        )}
      </div>
      {changes?.length > 0 && (
        <footer className="drawer-foot">
          {can('publish') ? (
            <>
              <label className="field"><span className="field-label">Note for the history (optional)</span><input className="input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. New campaign page" /></label>
              <div className="row-gap">
                <Button tone="danger-ghost" onClick={discardAll}>Discard all</Button>
                <Button tone="ghost" onClick={() => { onClose(); nav('/admin/preview?path=/') }} icon="eye">Preview</Button>
                <Button tone="primary" icon="globe" disabled={busy || errors.length > 0} onClick={publish}>{busy ? 'Publishing…' : 'Publish to the live site'}</Button>
              </div>
            </>
          ) : <p className="muted">Your account can save drafts. Ask an admin to review and publish them.</p>}
        </footer>
      )}
    </aside>
  )
}
