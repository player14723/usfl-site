import { useEffect, useState } from 'react'
import { api, when } from '../lib'
import { useApp } from '../state'
import { Button, IconButton, Modal } from '../components/ui'
import { diff } from '../../../shared/bundle.js'

const REASON = { autosave: 'Autosaved draft', created: 'Created', deleted: 'Before it was deleted', discarded: 'Before changes were discarded', restored: 'Before an earlier draft was restored', import: 'Imported', edit: 'Edited' }

/** Earlier drafts of one document, with restore. */
export function RevisionsButton({ docKey, onRestored }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton icon="history" label="Earlier drafts of this" onClick={() => setOpen(true)} />
      {open && <Revisions docKey={docKey} onClose={() => setOpen(false)} onRestored={() => { setOpen(false); onRestored?.() }} />}
    </>
  )
}

function Revisions({ docKey, onClose, onRestored }) {
  const { toast, confirm, refreshDocs } = useApp()
  const [list, setList] = useState(null)
  const [shown, setShown] = useState(null)
  const [changes, setChanges] = useState([])
  useEffect(() => { api(`/docs/${encodeURIComponent(docKey)}/revisions`).then(setList).catch(() => setList([])) }, [docKey])
  const show = async (r) => {
    const [rev, cur] = await Promise.all([api(`/revisions/${r.id}`), api(`/docs/${encodeURIComponent(docKey)}`)])
    setShown(r); setChanges(diff(cur.draft ?? cur.published, rev.data))
  }
  const restore = async (r) => {
    if (!(await confirm({ title: 'Restore this earlier draft?', body: `The draft goes back to how it was ${when(r.created_at)}. The current draft is kept in this list, so you can switch back.`, confirm: 'Restore draft' }))) return
    try { await api(`/docs/${encodeURIComponent(docKey)}/revisions/${r.id}/restore`, { method: 'POST' }); toast('Earlier draft restored — review and publish when ready'); await refreshDocs(); onRestored() } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Modal title="Earlier drafts" onClose={onClose} wide>
      <p className="muted">Drafts are kept automatically as you work (at most every few minutes) and before anything is deleted, discarded or restored. For earlier published versions of the whole site, see History & versions.</p>
      {!list ? <p className="muted">Loading…</p> : !list.length ? <p className="muted">No earlier drafts yet.</p> : (
        <div className="split">
          <ul className="rev-list">
            {list.map((r) => (
              <li key={r.id} className={shown?.id === r.id ? 'on' : ''}>
                <button type="button" onClick={() => show(r)}><strong>{when(r.created_at)}</strong><span className="muted small">{REASON[r.reason] || r.reason} · {r.created_by}</span></button>
              </li>
            ))}
          </ul>
          <div>
            {shown ? (
              <>
                <h3>Differences from the current draft</h3>
                {changes.length ? <table className="diff"><tbody>{changes.map((c, i) => <tr key={i}><th>{c.path}</th><td><del>{c.before}</del><ins>{c.after}</ins></td></tr>)}</tbody></table> : <p className="muted">Identical to the current draft.</p>}
                <Button tone="primary" onClick={() => restore(shown)} disabled={!changes.length}>Restore this draft</Button>
              </>
            ) : <p className="muted">Choose a draft to see what was different.</p>}
          </div>
        </div>
      )}
    </Modal>
  )
}
