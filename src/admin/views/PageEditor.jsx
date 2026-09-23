import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { SECTION_TYPES, SECTION_BY_TYPE, COMMON_SECTION_FIELDS, COLLECTIONS } from '../../../shared/schema.js'
import { useApp, useDoc } from '../state'
import { api, clone, getIn, setIn, plain, when, STATUS } from '../lib'
import { Badge, Button, Icon, IconButton, Modal, SaveStatus, Tabs, Empty } from '../components/ui'
import Fields from '../components/Fields'
import MediaPicker from '../components/MediaPicker'
import PreviewFrame from '../components/PreviewFrame'
import { TopbarSlot, DeviceSwitch, ModeSwitch } from '../components/Topbar'
import { editPathFor } from '../components/links'
import { RevisionsButton } from './Revisions'

const GROUPS = [['content', 'Content'], ['layout', 'Layout'], ['media', 'Media'], ['motion', 'Motion'], ['form', 'Form'], ['section', 'Section']]
const summaryOf = (s) => plain([s.heading, s.kicker, (s.lines || [])[0] && (s.lines || []).join(' '), s.eyebrow, s.label, (s.introLines || []).join(' ')].find((x) => x && String(x).trim()) || '').slice(0, 48)
const fieldsFor = (type) => [...(SECTION_BY_TYPE[type]?.fields || []), ...COMMON_SECTION_FIELDS]
const groupOf = (type, name) => (fieldsFor(type).find((f) => f.name === name)?.group || 'content')

export default function PageEditor() {
  const { id } = useParams()
  const key = `page:${id}`
  const nav = useNavigate()
  const { docs, toast, confirm, site, refreshDocs } = useApp()
  const d = useDoc(key)
  const page = d.data
  const [sel, setSel] = useState({ kind: 'section', index: null })
  const [focus, setFocus] = useState(null)
  const [tab, setTab] = useState('content')
  const [device, setDevice] = useState('desktop')
  const [mode, setMode] = useState('edit')
  const [reloadKey, setReloadKey] = useState(0)
  const [adding, setAdding] = useState(null) // insert index
  const [picker, setPicker] = useState(null) // { path, kind }
  const [highlight, setHighlight] = useState(null)
  const [elsewhere, setElsewhere] = useState(null)
  const dragFrom = useRef(null)

  // reload the preview after each completed save
  const lastTick = useRef(0)
  useEffect(() => {
    if (d.savedTick === lastTick.current) return
    lastTick.current = d.savedTick
    const t = setTimeout(() => setReloadKey((k) => k + 1), 150)
    return () => clearTimeout(t)
  }, [d.savedTick])

  // keyboard: undo / redo / save
  useEffect(() => {
    const h = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)
      if (e.key.toLowerCase() === 's') { e.preventDefault(); d.flush() }
      if (e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); (e.shiftKey ? d.redo : d.undo)() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [d])

  const sections = page?.sections || []
  const selected = sel.kind === 'section' && sel.index != null ? sections[sel.index] : null

  const selectSection = (i, field) => {
    setSel({ kind: 'section', index: i })
    if (field) {
      const top = field.split('.')[2]
      setTab(groupOf(sections[i]?.type, top))
      setFocus(field)
    } else { setFocus(null) }
    setHighlight({ doc: key, section: i, field: field || null, tick: Date.now() })
  }

  const updateSections = (next, opts) => d.change('sections', next, opts)
  const uniqueId = (base) => {
    const ids = new Set(sections.map((s) => s.id))
    let n = 1, id2 = base
    while (ids.has(id2)) id2 = `${base}-${++n}`
    return id2
  }
  const addSection = (type, at) => {
    const def = SECTION_BY_TYPE[type]
    const s = { type, id: uniqueId(type), hidden: false, motion: 'inherit', spacing: 'default', ...clone(def.defaults || {}) }
    const next = [...sections]; next.splice(at, 0, s)
    updateSections(next, { immediate: true })
    setAdding(null)
    setTimeout(() => selectSection(at), 50)
    toast(`${def.label} added`)
  }
  const duplicate = (i) => {
    const s = clone(sections[i]); s.id = uniqueId(`${s.id || s.type}-copy`)
    const next = [...sections]; next.splice(i + 1, 0, s)
    updateSections(next, { immediate: true }); selectSection(i + 1); toast('Section duplicated')
  }
  const move = (from, to) => {
    if (to < 0 || to >= sections.length || from === to) return
    const next = [...sections]; const [x] = next.splice(from, 1); next.splice(to, 0, x)
    updateSections(next, { immediate: true })
    setSel({ kind: 'section', index: to })
  }
  const remove = async (i) => {
    const s = sections[i]
    if (!(await confirm({ title: 'Delete this section?', body: `“${SECTION_BY_TYPE[s.type]?.label || s.type}${s.id ? ` — ${s.id}` : ''}” will be removed from this page. You can undo it, discard the draft, or restore it from History. To take it off the site but keep it, use Hide instead.`, confirm: 'Delete section', tone: 'danger' }))) return
    updateSections(sections.filter((_, j) => j !== i), { immediate: true })
    setSel({ kind: 'section', index: null })
    toast('Section deleted — Undo is in the top bar')
  }
  const toggleHidden = (i) => d.change(`sections.${i}.hidden`, !sections[i].hidden, { immediate: true })

  /* messages from the preview */
  const onMessage = useCallback(async (m) => {
    if (m.type === 'inline-start') window.__inlineEditing = true
    if (m.type === 'inline-commit' || m.type === 'inline-cancel') window.__inlineEditing = false
    if (m.type === 'ready') { setElsewhere(m.doc && m.doc !== key ? m : null); return }
    if (m.type === 'select') {
      if (m.doc === key) {
        const i = Number(String(m.field).split('.')[1])
        if (m.kind === 'image') { selectSection(i, m.field); setPicker({ path: m.field, kind: 'image' }); return }
        selectSection(i, m.kind === 'section' ? null : m.field)
        return
      }
      if (m.doc) {
        const ok = await confirm({ title: 'This is edited somewhere else', body: m.doc === 'navigation' ? 'The menu and footer appear on every page, so they are edited under Navigation & footer.' : 'This content has its own editor.', confirm: 'Go there', cancel: 'Stay here' })
        if (ok) { await d.flush(); nav(`${editPathFor(m.doc)}?focus=${encodeURIComponent(m.field || '')}`) }
      }
      return
    }
    if (m.type === 'inline-commit') {
      const value = m.joined ? m.value.split('\n').map((x) => x.trim()).filter(Boolean) : m.value
      if (m.doc === key) { d.change(m.field, value, { immediate: true }); return }
      try {
        const other = await api(`/docs/${encodeURIComponent(m.doc)}`)
        await api(`/docs/${encodeURIComponent(m.doc)}`, { method: 'PUT', body: { data: setIn(other.draft, m.field, value), rev: other.rev } })
        await refreshDocs(); setReloadKey((k) => k + 1); toast('Saved to draft')
      } catch (e) { toast(e.message, 'error') }
    }
    if (m.type === 'inline-cancel' && !m.unchanged) setReloadKey((k) => k + 1)
    if (m.type === 'inline-cancel' && m.unchanged) setReloadKey((k) => k + 1)
  }, [key, d, confirm, nav, refreshDocs, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  const status = docs.find((x) => x.key === key)?.status
  const pages = site?.pages || []

  if (d.status === 'missing') return <Empty title="This page does not exist" action={<Link className="btn btn-default" to="/admin/pages">Back to pages</Link>}>It may have been deleted and published.</Empty>
  if (!page) return <p className="pad muted">Loading…</p>
  const tabs = selected ? GROUPS.filter(([g]) => fieldsFor(selected.type).some((f) => (f.group || 'content') === g)).map(([id2, label]) => ({ id: id2, label })) : []
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id

  return (
    <div className="editor3">
      <TopbarSlot>
        <div className="crumbs">
          <Link to="/admin/pages">Pages</Link><Icon name="chevron" size={12} />
          <select className="input input-bare" value={id} onChange={async (e) => { await d.flush(); nav(`/admin/pages/${e.target.value}`) }} aria-label="Switch page">
            {pages.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
          {status && <Badge tone={STATUS[status]?.tone}>{STATUS[status]?.label}</Badge>}
        </div>
        <SaveStatus status={d.status} savedAt={d.savedAt} />
        <div className="row-gap">
          <IconButton icon="undo" label="Undo (Ctrl+Z)" onClick={d.undo} disabled={!d.canUndo} />
          <IconButton icon="redo" label="Redo (Ctrl+Shift+Z)" onClick={d.redo} disabled={!d.canRedo} />
        </div>
        <DeviceSwitch value={device} onChange={setDevice} />
        <ModeSwitch value={mode} onChange={setMode} />
        <Button tone="ghost" icon="eye" className="compact-btn" aria-label="Full-screen preview" title="Full-screen preview" onClick={async () => { await d.flush(); nav(`/admin/preview?path=${encodeURIComponent(page.path)}`) }}>Preview</Button>
      </TopbarSlot>

      {/* structure */}
      <aside className="panel structure" aria-label="Page structure">
        <button type="button" className={`struct-page ${sel.kind === 'page' ? 'on' : ''}`} onClick={() => { setSel({ kind: 'page' }); setFocus(null) }}>
          <Icon name="settings" size={16} /><span><strong>{page.title}</strong><span className="muted small">{page.path}{page.visible === false ? ' · not published' : ''}</span></span>
        </button>
        <div className="struct-head"><span className="field-label">Sections</span><span className="muted small">drag to reorder</span></div>
        <ol className="struct-list">
          {sections.map((s, i) => {
            const def = SECTION_BY_TYPE[s.type]
            return (
              <li key={i}
                className={`struct-item ${sel.kind === 'section' && sel.index === i ? 'on' : ''} ${s.hidden ? 'is-hidden' : ''}`}
                draggable onDragStart={() => { dragFrom.current = i }} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragFrom.current != null) move(dragFrom.current, i); dragFrom.current = null }}>
                <span className="drag" aria-hidden="true"><Icon name="drag" size={15} /></span>
                <button type="button" className="struct-name" onClick={() => selectSection(i)} aria-current={sel.index === i ? 'true' : undefined}>
                  <span>{(def?.label || s.type).replace(/\s*\(.*\)$/, '')}</span>
                  <span className="muted small">{summaryOf(s) || s.id}{s.hidden ? ' · hidden' : ''}{s.hideOn?.length ? ` · not on ${s.hideOn.join(', ')}` : ''}</span>
                </button>
                <span className="struct-actions">
                  <IconButton icon={s.hidden ? 'eyeOff' : 'eye'} label={s.hidden ? 'Show section' : 'Hide section'} onClick={() => toggleHidden(i)} />
                  <IconButton icon="up" label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} />
                  <IconButton icon="down" label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, i + 1)} />
                </span>
              </li>
            )
          })}
        </ol>
        <Button icon="plus" className="add-sec" onClick={() => setAdding(sel.index != null ? sel.index + 1 : sections.length)}>Add section{sel.index != null ? ' below selected' : ''}</Button>
      </aside>

      {/* canvas */}
      <section className="canvas" aria-label="Page preview">
        {elsewhere && (
          <div className="canvas-note">
            You are looking at <strong>{elsewhere.title}</strong>.{' '}
            <button type="button" className="linklike" onClick={async () => { await d.flush(); nav(editPathFor(elsewhere.doc)) }}>Edit that page</button>
          </div>
        )}
        <PreviewFrame path={page.path} device={device} mode={mode} reloadKey={reloadKey} highlight={highlight} onMessage={onMessage} />
        <p className="canvas-hint muted small">{mode === 'edit' ? 'Click anything to select it · double-click text to edit it on the page · switch to Browse to follow links' : 'Browse mode: links work. Switch back to Edit to select things.'}</p>
      </section>

      {/* inspector */}
      <aside className="panel inspector" aria-label="Inspector">
        {sel.kind === 'page' ? (
          <>
            <div className="insp-head"><h2>Page settings</h2><RevisionsButton docKey={key} onRestored={d.reload} /></div>
            <Fields fields={COLLECTIONS.page.fields} value={page} onChange={(p, v) => d.change(p, v)} focus={focus} />
            <PageDanger id={id} page={page} flush={d.flush} />
          </>
        ) : selected ? (
          <>
            <div className="insp-head">
              <div><p className="muted small">Section {sel.index + 1} of {sections.length}</p><h2>{SECTION_BY_TYPE[selected.type]?.label || selected.type}</h2></div>
              <div className="row-gap">
                <IconButton icon="copy" label="Duplicate section" onClick={() => duplicate(sel.index)} />
                <IconButton icon="trash" label="Delete section" onClick={() => remove(sel.index)} />
              </div>
            </div>
            {SECTION_BY_TYPE[selected.type]?.description && <p className="muted small insp-desc">{SECTION_BY_TYPE[selected.type].description}</p>}
            <Tabs tabs={tabs} value={activeTab} onChange={setTab} />
            <Fields fields={fieldsFor(selected.type)} group={activeTab} value={selected} base={`sections.${sel.index}`} onChange={(p, v) => d.change(p, v)} focus={focus} />
          </>
        ) : (
          <div className="insp-empty">
            <Icon name="cursor" size={28} />
            <h2>Select something to edit</h2>
            <p className="muted">Click a section in the list, or click anything on the page. Double-click text on the page to change it right there.</p>
            <Button onClick={() => setSel({ kind: 'page' })}>Page settings & SEO</Button>
          </div>
        )}
      </aside>

      {adding != null && <AddSection onClose={() => setAdding(null)} onAdd={(t) => addSection(t, adding)} />}
      {picker && <MediaPicker kind={picker.kind} current={getIn(page, picker.path)} onClose={() => setPicker(null)} onPick={(m) => { d.change(picker.path, m.src, { immediate: true }); setPicker(null) }} />}
    </div>
  )
}

function AddSection({ onClose, onAdd }) {
  const cats = [...new Set(SECTION_TYPES.map((s) => s.category))]
  return (
    <Modal title="Add a section" onClose={onClose} wide>
      <p className="muted">Every section comes in the site’s design and motion. Fill in its content afterwards in the panel on the right.</p>
      {cats.map((c) => (
        <section key={c} className="add-cat">
          <h3>{c}</h3>
          <div className="add-grid">
            {SECTION_TYPES.filter((s) => s.category === c).map((s) => (
              <button key={s.type} type="button" className="add-card" onClick={() => onAdd(s.type)}>
                <strong>{s.label}</strong><span>{s.description}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </Modal>
  )
}

function PageDanger({ id, page, flush }) {
  const { confirm, toast, refreshDocs, site } = useApp()
  const nav = useNavigate()
  const isHome = page.path === '/'
  const dup = async () => {
    await flush()
    const title = await confirm({ title: 'Duplicate page', prompt: 'Title of the new page', placeholder: `${page.title} (copy)`, confirm: 'Duplicate' })
    if (title === false) return
    const t = title || `${page.title} (copy)`
    let path = '/' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    while (site.pages.some((p) => p.path === path)) path += '-2'
    const r = await api('/docs', { method: 'POST', body: { kind: 'page', id: path.slice(1), data: { ...clone(page), title: t, path, visible: false, order: (page.order || 0) + 1 } } })
    await refreshDocs(); toast('Page duplicated — it is not published until you switch it on'); nav(`/admin/pages/${r.key.slice(5)}`)
  }
  const del = async () => {
    if (isHome) return toast('Choose another home page before deleting this one', 'error')
    if (!(await confirm({ title: `Delete “${page.title}”?`, body: 'The page is removed from the site when you next publish. Until then you can discard the change, and afterwards restore it from History.', confirm: 'Delete page', tone: 'danger', typeToConfirm: 'delete' }))) return
    await api(`/docs/${encodeURIComponent(`page:${id}`)}`, { method: 'DELETE' })
    await refreshDocs(); toast('Page marked for deletion'); nav('/admin/pages')
  }
  return (
    <div className="danger-zone">
      <Button icon="copy" onClick={dup}>Duplicate page</Button>
      <Button icon="trash" tone="danger-ghost" onClick={del} disabled={isHome}>Delete page</Button>
      {isHome && <p className="field-hint">This is the home page. To use another page as the home page, go to Pages → “Make home page”.</p>}
      <p className="field-hint">Last saved {when(page.updatedAt) || 'recently'}.</p>
    </div>
  )
}
