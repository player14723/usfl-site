import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state'
import { api, when, STATUS, kindLabel } from '../lib'
import { Badge, Button, Empty, Icon, Modal } from '../components/ui'
import PreviewFrame from '../components/PreviewFrame'
import { TopbarSlot, DeviceSwitch } from '../components/Topbar'
import { ChoosePassword } from './Login'
import { editPathFor } from '../components/links'

/* ---------- Overview ---------- */
export function Overview() {
  const { session, docs, site, setPublishOpen, pending } = useApp()
  const [versions, setVersions] = useState([])
  const [activity, setActivity] = useState([])
  useEffect(() => { api('/versions').then(setVersions).catch(() => {}); api('/activity').then(setActivity).catch(() => {}) }, [docs])
  const changed = docs.filter((d) => d.status !== 'published')
  const home = site?.pages.find((p) => p.path === '/')
  return (
    <div className="pad overview">
      <TopbarSlot><div className="crumbs"><strong className="crumb-title">Overview</strong></div></TopbarSlot>
      <h1>Hello{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}.</h1>
      <p className="muted lead-sm">Everything you change here is saved as a draft. The live site only changes when you press Publish.</p>
      <div className="cards">
        <div className="card">
          <p className="field-label">Live site</p>
          <p className="big">{versions[0] ? `Published ${when(versions[0].createdAt)}` : '—'}</p>
          <p className="muted small">{versions[0]?.createdBy ? `by ${versions[0].createdBy}` : ''}{versions[0]?.note ? ` · ${versions[0].note}` : ''}</p>
          <a className="btn btn-default btn-sm" href="/" target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} /> Open the live site</a>
        </div>
        <div className="card">
          <p className="field-label">Draft</p>
          <p className="big">{pending ? `${pending} change${pending === 1 ? '' : 's'} waiting` : 'Nothing waiting'}</p>
          <p className="muted small">{pending ? 'Review them, then publish.' : 'The live site matches the editor.'}</p>
          <Button size="sm" tone={pending ? 'primary' : 'default'} onClick={() => setPublishOpen(true)} icon="globe">Review & publish</Button>
        </div>
        <div className="card">
          <p className="field-label">Start here</p>
          <ul className="quick">
            {home && <li><Link to={`/admin/pages/${home._id}`}><Icon name="home" size={16} /> Edit the home page</Link></li>}
            <li><Link to="/admin/pages"><Icon name="pages" size={16} /> Pages — add, hide, reorder</Link></li>
            <li><Link to="/admin/media"><Icon name="image" size={16} /> Upload images and videos</Link></li>
            <li><Link to="/admin/settings/navigation"><Icon name="nav" size={16} /> Menu and footer</Link></li>
            <li><Link to="/admin/settings/theme"><Icon name="palette" size={16} /> Colours and type</Link></li>
          </ul>
        </div>
      </div>
      {changed.length > 0 && (
        <section className="ov-block">
          <h2>Draft changes</h2>
          <ul className="rows">{changed.map((d) => <li key={d.key}><Badge tone={STATUS[d.status]?.tone}>{STATUS[d.status]?.label}</Badge> <Link to={editPathFor(d.key)}>{d.title}</Link> <span className="muted small">{d.updatedBy} · {when(d.updatedAt)}</span></li>)}</ul>
        </section>
      )}
      <section className="ov-block">
        <h2>Recent activity</h2>
        <ul className="rows">{activity.slice(0, 12).map((a, i) => <li key={i}><span className="muted small">{when(a.at)}</span> {a.user} — {ACTION[a.action] || a.action} {a.target && !a.target.startsWith('version') ? <code className="small">{a.target}</code> : a.target} {a.detail && <span className="muted small">({a.detail})</span>}</li>)}</ul>
      </section>
    </div>
  )
}
const ACTION = { publish: 'published', 'sign-in': 'signed in', create: 'created', delete: 'deleted', discard: 'discarded draft changes to', upload: 'uploaded', 'restore-version': 'restored', 'restore-draft': 'restored an earlier draft of', 'trash-media': 'moved to trash', 'delete-media': 'permanently deleted', 'create-user': 'added the account', 'update-user': 'updated the account', 'delete-user': 'removed an account', 'reset-password': 'reset a password for', 'change-password': 'changed their password' }

/* ---------- History & versions ---------- */
export function VersionsView() {
  const { can, toast, confirm, refreshDocs } = useApp()
  const nav = useNavigate()
  const [list, setList] = useState(null)
  const [open, setOpen] = useState(null)
  const load = () => api('/versions').then(setList).catch(() => setList([]))
  useEffect(() => { load() }, [])
  const restore = async (v, publish) => {
    const ok = await confirm({
      title: publish ? `Restore version ${v.id} and publish it?` : `Put version ${v.id} into the draft?`,
      body: publish ? 'The live site goes back to exactly how it was at that moment. Your current draft is kept in each page’s earlier drafts.' : 'The draft becomes the site as it was at that moment. Look it over, then publish when you are happy. Nothing on the live site changes yet.',
      confirm: publish ? 'Restore and publish' : 'Restore into draft', tone: publish ? 'danger' : undefined,
    })
    if (!ok) return
    try {
      await api(`/versions/${v.id}/restore`, { method: 'POST', body: { publish } })
      await refreshDocs(); load()
      toast(publish ? `Version ${v.id} is live again` : `Version ${v.id} is in the draft — review and publish`)
      if (!publish) nav('/admin')
    } catch (e) { toast(e.message, 'error') }
  }
  return (
    <div className="pad page-view">
      <TopbarSlot><div className="crumbs"><strong className="crumb-title">History & versions</strong></div></TopbarSlot>
      <div className="view-head"><div><h1>History & versions</h1><p className="muted">Every time the site is published, a complete copy is kept. You can put any of them back — first into the draft to check it, or straight onto the live site.</p></div></div>
      {!list ? <p className="muted">Loading…</p> : (
        <ol className="versions">
          {list.map((v, i) => (
            <li key={v.id} className={i === 0 ? 'current' : ''}>
              <div className="v-head">
                <span className="v-id">v{v.id}</span>
                <div><strong>{when(v.createdAt)}</strong> <span className="muted small">by {v.createdBy}</span>{i === 0 && <Badge tone="ok">Live now</Badge>}{v.note && <p className="small">{v.note}</p>}</div>
                <div className="row-gap">
                  {v.changes.length > 0 && <button type="button" className="link-sm" onClick={() => setOpen(open === v.id ? null : v.id)}>{v.changes.length} change{v.changes.length === 1 ? '' : 's'}</button>}
                  {i > 0 && can('restore') && <><Button size="sm" onClick={() => restore(v, false)}>Restore into draft</Button><Button size="sm" tone="danger-ghost" onClick={() => restore(v, true)}>Restore & publish</Button></>}
                </div>
              </div>
              {open === v.id && <ul className="plain-list small">{v.changes.map((c) => <li key={c.key}><Badge tone={STATUS[c.status]?.tone}>{c.status}</Badge> {c.title}</li>)}</ul>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ---------- Accounts ---------- */
export function UsersView() {
  const { session, toast, confirm } = useApp()
  const [list, setList] = useState(null)
  const [adding, setAdding] = useState(false)
  const [secret, setSecret] = useState(null)
  const load = () => api('/users').then(setList)
  useEffect(() => { load().catch(() => setList([])) }, [])
  const temp = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, (b) => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('').replace(/(.{4})(?!$)/g, '$1-') }
  const patch = async (u, body) => { try { await api(`/users/${u.id}`, { method: 'PATCH', body }); toast('Account updated'); load() } catch (e) { toast(e.message, 'error') } }
  const reset = async (u) => {
    if (!(await confirm({ title: `Reset the password for ${u.email}?`, body: 'They are signed out everywhere and must choose a new password when they next sign in.', confirm: 'Reset password' }))) return
    const pw = temp()
    try { await api(`/users/${u.id}/password`, { method: 'POST', body: { password: pw } }); setSecret({ email: u.email, pw }) } catch (e) { toast(e.message, 'error') }
  }
  const remove = async (u) => {
    if (!(await confirm({ title: `Remove ${u.email}?`, body: 'They can no longer sign in. Their past changes stay in the history.', confirm: 'Remove account', tone: 'danger' }))) return
    try { await api(`/users/${u.id}`, { method: 'DELETE' }); toast('Account removed'); load() } catch (e) { toast(e.message, 'error') }
  }
  return (
    <div className="pad page-view">
      <TopbarSlot><div className="crumbs"><strong className="crumb-title">Accounts</strong></div></TopbarSlot>
      <div className="view-head"><div><h1>Accounts</h1><p className="muted"><strong>Owner</strong>: everything, including accounts. <strong>Admin</strong>: edit, publish, restore versions, delete media, read form messages. <strong>Editor</strong>: edit drafts and upload media, but cannot publish.</p></div><Button tone="primary" icon="plus" onClick={() => setAdding(true)}>Add account</Button></div>
      <table className="table">
        <thead><tr><th>Person</th><th>Role</th><th>Last signed in</th><th>Status</th><th aria-label="Actions" /></tr></thead>
        <tbody>
          {(list || []).map((u) => (
            <tr key={u.id}>
              <td><strong>{u.name || u.email}</strong><span className="muted small block">{u.email}</span></td>
              <td><select className="input input-sm" value={u.role} onChange={(e) => patch(u, { role: e.target.value })} aria-label={`Role for ${u.email}`}>{['owner', 'admin', 'editor'].map((r) => <option key={r} value={r}>{r}</option>)}</select></td>
              <td className="small">{u.last_login ? when(u.last_login) : 'Never'}</td>
              <td>{u.disabled ? <Badge tone="danger">Disabled</Badge> : u.must_change ? <Badge tone="warn">Must set password</Badge> : <Badge tone="ok">Active</Badge>}</td>
              <td className="actions">
                {u.id !== session.user.id && <Button size="sm" tone="ghost" onClick={() => patch(u, { disabled: !u.disabled })}>{u.disabled ? 'Enable' : 'Disable'}</Button>}
                <Button size="sm" tone="ghost" onClick={() => reset(u)}>Reset password</Button>
                {u.id !== session.user.id && <Button size="sm" tone="danger-ghost" onClick={() => remove(u)}>Remove</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {adding && <AddUser onClose={() => setAdding(false)} onCreated={(email, pw) => { setAdding(false); setSecret({ email, pw }); load() }} temp={temp} />}
      {secret && (
        <Modal title="One-time password" onClose={() => setSecret(null)} footer={<Button tone="primary" onClick={() => setSecret(null)}>Done</Button>}>
          <p>Give this to <strong>{secret.email}</strong> privately. They will choose their own password when they sign in at <code>{location.origin}/admin</code>.</p>
          <p className="secret"><code>{secret.pw}</code></p>
          <p className="muted small">It is shown only once.</p>
        </Modal>
      )}
    </div>
  )
}
function AddUser({ onClose, onCreated, temp }) {
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [role, setRole] = useState('editor'); const [err, setErr] = useState('')
  const create = async () => { const pw = temp(); try { await api('/users', { method: 'POST', body: { email, name, role, password: pw } }); onCreated(email, pw) } catch (e) { setErr(e.message) } }
  return (
    <Modal title="Add an account" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button tone="primary" onClick={create} disabled={!email}>Add account</Button></>}>
      <label className="field"><span className="field-label">Email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-autofocus /></label>
      <label className="field"><span className="field-label">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field"><span className="field-label">Role</span><select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option value="editor">Editor — edit drafts</option><option value="admin">Admin — edit and publish</option><option value="owner">Owner — everything</option></select></label>
      {err && <p className="form-error" role="alert">{err}</p>}
    </Modal>
  )
}

/* ---------- Inbox ---------- */
export function InboxView() {
  const { toast, confirm } = useApp()
  const [list, setList] = useState(null)
  const [open, setOpen] = useState(null)
  const load = () => api('/inbox').then(setList).catch(() => setList([]))
  useEffect(() => { load() }, [])
  const read = async (s) => { setOpen(s.id); if (!s.read) { await api(`/inbox/${s.id}`, { method: 'PATCH', body: { read: true } }); load() } }
  const del = async (s) => { if (await confirm({ title: 'Delete this message?', confirm: 'Delete', tone: 'danger' })) { await api(`/inbox/${s.id}`, { method: 'DELETE' }); toast('Deleted'); setOpen(null); load() } }
  const csv = () => {
    const keys = [...new Set((list || []).flatMap((s) => Object.keys(s.data)))]
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [['Received', 'Page', ...keys].map(esc).join(','), ...(list || []).map((s) => [s.created_at, s.page, ...keys.map((k) => s.data[k])].map(esc).join(','))]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = 'website-messages.csv'; a.click()
  }
  const cur = list?.find((s) => s.id === open)
  return (
    <div className="pad page-view">
      <TopbarSlot><div className="crumbs"><strong className="crumb-title">Inbox</strong></div></TopbarSlot>
      <div className="view-head"><div><h1>Inbox</h1><p className="muted">Messages sent through the website’s forms. To also receive them elsewhere, set a webhook under Site settings → Contact.</p></div>{list?.length > 0 && <Button onClick={csv}>Download CSV</Button>}</div>
      {!list ? <p className="muted">Loading…</p> : !list.length ? <Empty title="No messages yet">When someone uses the contact form, their message appears here.</Empty> : (
        <div className="split">
          <ul className="inbox-list">{list.map((s) => <li key={s.id} className={`${s.read ? '' : 'unread'} ${open === s.id ? 'on' : ''}`}><button type="button" onClick={() => read(s)}><strong>{Object.values(s.data)[0] || 'Message'}</strong><span className="muted small">{when(s.created_at)} · {s.page}</span></button></li>)}</ul>
          <div>{cur ? (
            <article className="message">
              <dl className="facts">{Object.entries(cur.data).map(([k, v]) => <div key={k}><dt>{k}</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{v || '—'}</dd></div>)}</dl>
              <p className="muted small">Received {new Date(cur.created_at).toLocaleString()} from {cur.page || 'the site'}{cur.delivered ? ` · ${cur.delivered}` : ''}</p>
              <div className="row-gap">{Object.values(cur.data).find((v) => /@/.test(v)) && <a className="btn btn-default btn-sm" href={`mailto:${Object.values(cur.data).find((v) => /@/.test(v))}`}>Reply by email</a>}<Button size="sm" tone="danger-ghost" onClick={() => del(cur)}>Delete</Button></div>
            </article>
          ) : <p className="muted">Choose a message.</p>}</div>
        </div>
      )}
    </div>
  )
}

/* ---------- Account ---------- */
export function AccountView() {
  const { session } = useApp()
  return (
    <div className="pad page-view narrow">
      <TopbarSlot><div className="crumbs"><strong className="crumb-title">Your account</strong></div></TopbarSlot>
      <h1>Your account</h1>
      <p className="muted">{session.user.email} · {session.user.role}</p>
      <ChoosePassword />
    </div>
  )
}

/* ---------- Preview (no editor controls) ---------- */
export function PreviewView() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [device, setDevice] = useState(params.get('device') || 'desktop')
  const path = params.get('path') || '/'
  return (
    <div className="preview-view">
      <TopbarSlot>
        <Button tone="ghost" icon="undo" onClick={() => nav(-1)}>Back to editing</Button>
        <span className="muted small">Draft preview of <code>{path}</code> — visitors do not see this until you publish</span>
        <DeviceSwitch value={device} onChange={setDevice} />
      </TopbarSlot>
      <PreviewFrame path={path} device={device} mode="browse" fill={device === 'desktop'} />
    </div>
  )
}

export { kindLabel }
