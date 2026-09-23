import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PAGE_TEMPLATES, SECTION_BY_TYPE, COLLECTIONS } from '../../../shared/schema.js'
import { useApp } from '../state'
import { api, clone, plain, slugify, when, STATUS } from '../lib'
import { Badge, Button, Icon, IconButton, Modal } from '../components/ui'
import { TopbarSlot } from '../components/Topbar'

/* ---------- Pages ---------- */
export function PagesView() {
  const { site, docs, refreshDocs, toast, confirm } = useApp()
  const nav = useNavigate()
  const [creating, setCreating] = useState(false)
  const pages = site?.pages || []
  const deleted = docs.filter((d) => d.kind === 'page' && d.status === 'deleted')
  const statusOf = (p) => docs.find((d) => d.key === `page:${p._id}`)?.status
  const save = async (p, patch) => {
    const cur = await api(`/docs/${encodeURIComponent(`page:${p._id}`)}`)
    await api(`/docs/${encodeURIComponent(`page:${p._id}`)}`, { method: 'PUT', body: { data: { ...cur.draft, ...patch }, rev: cur.rev } })
  }
  const toggle = async (p) => { await save(p, { visible: p.visible === false }); await refreshDocs(); toast(p.visible === false ? 'Page will be published' : 'Page will be hidden when you publish') }
  const makeHome = async (p) => {
    const home = pages.find((x) => x.path === '/')
    const newPath = home ? await confirm({ title: `Make “${p.title}” the home page?`, body: <p>“{p.title}” moves to the address <code>/</code>. The current home page, “{home.title}”, needs a new address.</p>, prompt: 'New address for the current home page', placeholder: `/${slugify(home.title) || 'previous-home'}`, confirm: 'Change home page' }) : '/'
    if (newPath === false) return
    const target = home ? ('/' + slugify(String(newPath || `/${slugify(home.title)}`).replace(/^\//, '')) || '/previous-home') : '/'
    if (home) {
      if (pages.some((x) => x.path === target)) return toast(`${target} is already used by another page`, 'error')
      await save(home, { path: target })
    }
    await save(p, { path: '/', visible: true })
    await refreshDocs(); toast('Home page changed in the draft — publish to make it live')
  }
  const drag = useRef(null)
  const reorder = async (from, to) => {
    if (from === to) return
    const list = [...pages]; const [x] = list.splice(from, 1); list.splice(to, 0, x)
    await Promise.all(list.map((p, i) => (p.order !== i ? save(p, { order: i }) : null)))
    await refreshDocs(); toast('Order saved to draft')
  }
  const restore = async (key) => { await api(`/docs/${encodeURIComponent(key)}/discard`, { method: 'POST' }); await refreshDocs(); toast('Page restored') }
  return (
    <div className="pad page-view">
      <TopbarSlot><div className="crumbs"><strong className="crumb-title">Pages</strong></div></TopbarSlot>
      <div className="view-head">
        <div><h1>Pages</h1><p className="muted">Every page on the site. The order here is the order used by the page-change curtain and lists. Menus are set in Navigation & footer.</p></div>
        <Button tone="primary" icon="plus" onClick={() => setCreating(true)}>New page</Button>
      </div>
      <table className="table">
        <thead><tr><th aria-label="Reorder" /><th>Page</th><th>Address</th><th>Status</th><th>On the site</th><th aria-label="Actions" /></tr></thead>
        <tbody>
          {pages.map((p, i) => {
            const st = statusOf(p)
            return (
              <tr key={p._id} draggable onDragStart={() => { drag.current = i }} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorder(drag.current, i); drag.current = null }}>
                <td className="drag"><Icon name="drag" size={15} /></td>
                <td><Link to={`/admin/pages/${p._id}`} className="row-title">{p.title}</Link>{p.path === '/' && <Badge tone="dark">Home</Badge>}<span className="muted small block">{(p.sections || []).length} sections</span></td>
                <td><code>{p.path}</code></td>
                <td>{st && <Badge tone={STATUS[st]?.tone}>{STATUS[st]?.label}</Badge>}</td>
                <td><button type="button" role="switch" aria-checked={p.visible !== false} className={`switch ${p.visible !== false ? 'on' : ''}`} onClick={() => toggle(p)} aria-label={`${p.title} published`}><span className="switch-knob" /></button></td>
                <td className="actions">
                  <Link className="btn btn-default btn-sm" to={`/admin/pages/${p._id}`}>Edit</Link>
                  {p.path !== '/' && <Button size="sm" tone="ghost" onClick={() => makeHome(p)}>Make home page</Button>}
                  <a className="ibtn" href={`/admin/preview?path=${encodeURIComponent(p.path)}`} aria-label={`Preview ${p.title}`} title="Preview"><Icon name="eye" /></a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {deleted.length > 0 && (
        <section className="note">
          <h3>Removed in the draft</h3>
          <p className="muted">These pages disappear from the site when you next publish.</p>
          <ul className="plain-list">{deleted.map((d) => <li key={d.key}>{d.title} <Button size="sm" tone="ghost" onClick={() => restore(d.key)}>Restore</Button></li>)}</ul>
        </section>
      )}
      {creating && <NewPage onClose={() => setCreating(false)} onCreated={(id) => nav(`/admin/pages/${id}`)} />}
    </div>
  )
}

function NewPage({ onClose, onCreated }) {
  const { site, refreshDocs, toast } = useApp()
  const [title, setTitle] = useState('')
  const [path, setPath] = useState('')
  const [touched, setTouched] = useState(false)
  const [tpl, setTpl] = useState('landing')
  const [from, setFrom] = useState('')
  const [err, setErr] = useState('')
  const p = touched ? path : title ? `/${slugify(title)}` : ''
  const create = async () => {
    setErr('')
    const clean = '/' + String(p).replace(/^\/+|\/+$/g, '')
    if (!title.trim()) return setErr('Give the page a title.')
    if (!/^\/[a-z0-9-/]+$/.test(clean)) return setErr('Addresses use lower-case letters, numbers and dashes, and start with /.')
    if (site.pages.some((x) => x.path === clean)) return setErr('Another page already uses that address.')
    let sections
    if (from) sections = clone(site.pages.find((x) => x._id === from)?.sections || [])
    else {
      const t = PAGE_TEMPLATES.find((x) => x.id === tpl)
      sections = t.sections.map((type, i) => ({ type, id: `${type}${t.sections.indexOf(type) !== i ? `-${i}` : ''}`, hidden: false, motion: 'inherit', spacing: 'default', ...clone(SECTION_BY_TYPE[type].defaults || {}) }))
      const hero = sections.find((s) => s.type === 'page-hero')
      if (hero) { hero.eyebrow = title; hero.lines = [title] }
    }
    try {
      const r = await api('/docs', { method: 'POST', body: { kind: 'page', id: clean.slice(1).replace(/\//g, '-'), data: { title, path: clean, visible: false, order: site.pages.length, transitionLabel: title, transitionIndex: String(site.pages.length).padStart(2, '0'), seo: {}, sections } } })
      await refreshDocs(); toast('Page created — it stays off the site until you switch it on and publish'); onCreated(r.key.slice(5))
    } catch (e) { setErr(e.message) }
  }
  return (
    <Modal title="New page" onClose={onClose} wide footer={<><Button onClick={onClose}>Cancel</Button><Button tone="primary" onClick={create}>Create page</Button></>}>
      <div className="two-col">
        <label className="field"><span className="field-label">Page title</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} data-autofocus placeholder="e.g. Klaviyo audit" /></label>
        <label className="field"><span className="field-label">Address</span><input className="input input-mono" value={p} onChange={(e) => { setTouched(true); setPath(e.target.value) }} placeholder="/klaviyo-audit" /></label>
      </div>
      <p className="field-label">Start from</p>
      <div className="tpl-grid">
        {PAGE_TEMPLATES.map((t) => (
          <button key={t.id} type="button" className={`tpl ${!from && tpl === t.id ? 'on' : ''}`} onClick={() => { setTpl(t.id); setFrom('') }} aria-pressed={!from && tpl === t.id}>
            <strong>{t.label}</strong><span className="muted small">{t.description}</span>
          </button>
        ))}
      </div>
      <label className="field"><span className="field-label">…or copy the sections of an existing page</span>
        <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">— use the template above —</option>{site.pages.map((x) => <option key={x._id} value={x._id}>{x.title}</option>)}</select></label>
      {err && <p className="form-error" role="alert">{err}</p>}
    </Modal>
  )
}

/* ---------- Case studies / capabilities / insights ---------- */
const ROUTE = { case: 'work', capability: 'capabilities', insight: 'insights' }
const COLL = { case: 'cases', capability: 'capabilities', insight: 'insights' }
export function CollectionView({ kind }) {
  const def = COLLECTIONS[kind]
  const { site, docs, refreshDocs, toast } = useApp()
  const nav = useNavigate()
  const items = site?.[COLL[kind]] || []
  const drag = useRef(null)
  const deleted = docs.filter((d) => d.kind === kind && d.status === 'deleted')
  const patch = async (it, p) => {
    const key = `${kind}:${it._id}`
    const cur = await api(`/docs/${encodeURIComponent(key)}`)
    await api(`/docs/${encodeURIComponent(key)}`, { method: 'PUT', body: { data: { ...cur.draft, ...p }, rev: cur.rev } })
  }
  const reorder = async (from, to) => {
    if (from === to) return
    const list = [...items]; const [x] = list.splice(from, 1); list.splice(to, 0, x)
    await Promise.all(list.map((it, i) => (it.order !== i + 1 ? patch(it, { order: i + 1, number: it.number ? String(i + 1).padStart(2, '0') : it.number }) : null)))
    await refreshDocs(); toast('Order saved to draft')
  }
  const create = async () => {
    const slug = `new-${kind}-${Date.now().toString(36).slice(-4)}`
    const r = await api('/docs', { method: 'POST', body: { kind, id: slug, data: { ...clone(def.defaults), slug, order: items.length + 1 } } })
    await refreshDocs(); nav(`/admin/${ROUTE[kind]}/${r.key.split(':')[1]}`)
  }
  const title = (it) => plain(it[def.titleField] || it.title || it.name)
  return (
    <div className="pad page-view">
      <TopbarSlot><div className="crumbs"><strong className="crumb-title">{def.label}</strong></div></TopbarSlot>
      <div className="view-head">
        <div><h1>{def.label}</h1><p className="muted">{kind === 'case' ? 'Each case study gets its own page and appears on Work, on the capability pages it maps to, and wherever Selected work picks it.' : kind === 'capability' ? 'Each capability has its own page. Case studies say which capabilities they map to.' : 'Articles, each with its own page, listed on Insights.'} Drag to reorder.</p></div>
        <Button tone="primary" icon="plus" onClick={create}>New {def.singular.toLowerCase()}</Button>
      </div>
      <table className="table">
        <thead><tr><th aria-label="Reorder" /><th>{def.singular}</th>{kind === 'case' && <th>Maps to</th>}<th>Status</th><th>Shown on the site</th><th aria-label="Actions" /></tr></thead>
        <tbody>
          {items.map((it, i) => {
            const st = docs.find((d) => d.key === `${kind}:${it._id}`)?.status
            return (
              <tr key={it._id} draggable onDragStart={() => { drag.current = i }} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorder(drag.current, i); drag.current = null }}>
                <td className="drag"><Icon name="drag" size={15} /></td>
                <td><Link className="row-title" to={`/admin/${ROUTE[kind]}/${it._id}`}>{title(it)}</Link><span className="muted small block">/{it.slug}</span></td>
                {kind === 'case' && <td className="small">{(it.capabilities || []).map((c) => site.capabilities.find((x) => x.slug === c)?.name || c).join(' · ')}</td>}
                <td>{st && <Badge tone={STATUS[st]?.tone}>{STATUS[st]?.label}</Badge>}</td>
                <td><button type="button" role="switch" aria-checked={!it.hidden} className={`switch ${!it.hidden ? 'on' : ''}`} aria-label={`${title(it)} shown`} onClick={async () => { await patch(it, { hidden: !it.hidden }); await refreshDocs() }}><span className="switch-knob" /></button></td>
                <td className="actions"><Link className="btn btn-default btn-sm" to={`/admin/${ROUTE[kind]}/${it._id}`}>Edit</Link></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {deleted.length > 0 && (
        <section className="note"><h3>Removed in the draft</h3>
          <ul className="plain-list">{deleted.map((d) => <li key={d.key}>{d.title} <Button size="sm" tone="ghost" onClick={async () => { await api(`/docs/${encodeURIComponent(d.key)}/discard`, { method: 'POST' }); await refreshDocs() }}>Restore</Button></li>)}</ul>
        </section>
      )}
    </div>
  )
}
