import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SETTINGS_BY_KEY, COLLECTIONS, THEME_PRESETS } from '../../../shared/schema.js'
import { useApp, useDoc } from '../state'
import { api, clone, plain, setIn, STATUS } from '../lib'
import { Badge, Button, Empty, Icon, IconButton, SaveStatus } from '../components/ui'
import Fields from '../components/Fields'
import MediaPicker from '../components/MediaPicker'
import PreviewFrame from '../components/PreviewFrame'
import { TopbarSlot, DeviceSwitch, ModeSwitch } from '../components/Topbar'
import { editPathFor } from '../components/links'
import { RevisionsButton } from './Revisions'

const KIND_ROUTE = { case: 'work', capability: 'capabilities', insight: 'insights' }

/** Settings documents: /admin/settings/:key */
export function SettingsEditor() {
  const { key } = useParams()
  const def = SETTINGS_BY_KEY[key]
  if (!def) return <Empty title="Unknown settings page" />
  return <DocEditor docKey={key} title={def.label} fields={def.fields} previewPath={def.previewPath || '/'} extra={key === 'theme' ? ThemePresets : key === 'media' ? MediaNote : null} />
}

/** Collection items: /admin/work/:id etc. */
export function ItemEditor({ kind }) {
  const { id } = useParams()
  const def = COLLECTIONS[kind]
  const { site } = useApp()
  const key = `${kind}:${id}`
  return <DocEditor docKey={key} title={def.singular} fields={def.fields} previewFor={(data) => def.previewPath(data, site?.site)} kind={kind} />
}

function DocEditor({ docKey, title, fields, previewPath, previewFor, kind, extra: Extra }) {
  const d = useDoc(docKey)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { docs, toast, confirm, refreshDocs } = useApp()
  const [device, setDevice] = useState('desktop')
  const [mode, setMode] = useState('edit')
  const [reloadKey, setReloadKey] = useState(0)
  const [focus, setFocus] = useState(params.get('focus') || null)
  const [picker, setPicker] = useState(null)
  const [showPreview, setShowPreview] = useState(true)
  const lastTick = useRef(0)
  useEffect(() => {
    if (d.savedTick === lastTick.current) return
    lastTick.current = d.savedTick
    setReloadKey((k) => k + 1)
  }, [d.savedTick])
  useEffect(() => {
    const h = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() === 's') { e.preventDefault(); d.flush() }
      if (e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) { e.preventDefault(); (e.shiftKey ? d.redo : d.undo)() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [d])

  const onMessage = useCallback(async (m) => {
    if (m.type === 'inline-start') window.__inlineEditing = true
    if (m.type === 'inline-commit' || m.type === 'inline-cancel') window.__inlineEditing = false
    if (m.type === 'select') {
      if (m.doc === docKey) { if (m.kind === 'image') setPicker(m.field); setFocus(m.field); return }
      if (m.doc && (await confirm({ title: 'This is edited somewhere else', body: 'Open its editor?', confirm: 'Go there', cancel: 'Stay here' }))) { await d.flush(); nav(`${editPathFor(m.doc)}?focus=${encodeURIComponent(m.field || '')}`) }
    }
    if (m.type === 'inline-commit') {
      const value = m.joined ? m.value.split('\n').map((x) => x.trim()).filter(Boolean) : m.value
      if (m.doc === docKey) d.change(m.field, value, { immediate: true })
      else {
        try {
          const other = await api(`/docs/${encodeURIComponent(m.doc)}`)
          await api(`/docs/${encodeURIComponent(m.doc)}`, { method: 'PUT', body: { data: setIn(other.draft, m.field, value), rev: other.rev } })
          await refreshDocs(); setReloadKey((k) => k + 1)
        } catch (e) { toast(e.message, 'error') }
      }
    }
    if (m.type === 'inline-cancel' && !m.unchanged) setReloadKey((k) => k + 1)
    if (m.type === 'inline-cancel' && m.unchanged) setReloadKey((k) => k + 1)
  }, [docKey, d, confirm, nav, refreshDocs, toast])

  if (d.status === 'missing') return <Empty title="Not found" action={<Button onClick={() => nav(-1)}>Back</Button>}>It may have been deleted.</Empty>
  if (!d.data) return <p className="pad muted">Loading…</p>
  const status = docs.find((x) => x.key === docKey)?.status
  const path = previewFor ? previewFor(d.data) : previewPath
  const name = kind ? plain(d.data.title || d.data.name) : title

  return (
    <div className={`editor2 ${showPreview ? '' : 'no-preview'}`}>
      <TopbarSlot>
        <div className="crumbs">
          {kind && <><Link to={`/admin/${KIND_ROUTE[kind]}`}>{COLLECTIONS[kind].label}</Link><Icon name="chevron" size={12} /></>}
          <strong className="crumb-title">{name}</strong>
          {status && <Badge tone={STATUS[status]?.tone}>{STATUS[status]?.label}</Badge>}
        </div>
        <SaveStatus status={d.status} savedAt={d.savedAt} />
        <div className="row-gap">
          <IconButton icon="undo" label="Undo" onClick={d.undo} disabled={!d.canUndo} />
          <IconButton icon="redo" label="Redo" onClick={d.redo} disabled={!d.canRedo} />
          <RevisionsButton docKey={docKey} onRestored={d.reload} />
        </div>
        {showPreview && <DeviceSwitch value={device} onChange={setDevice} />}
        {showPreview && <ModeSwitch value={mode} onChange={setMode} />}
        <Button tone="ghost" icon="eye" className="compact-btn" aria-label={showPreview ? 'Hide preview' : 'Show preview'} title={showPreview ? 'Hide preview' : 'Show preview'} onClick={() => setShowPreview(!showPreview)}>{showPreview ? 'Hide preview' : 'Show preview'}</Button>
      </TopbarSlot>
      <section className="panel form-panel" aria-label={`${name} settings`}>
        <div className="insp-head"><h1>{name}</h1></div>
        {Extra && <Extra d={d} />}
        <Fields fields={fields} value={d.data} onChange={(p, v) => d.change(p, v)} focus={focus} />
        {kind && <ItemActions kind={kind} docKey={docKey} data={d.data} flush={d.flush} />}
      </section>
      {showPreview && (
        <section className="canvas" aria-label="Preview">
          <PreviewFrame path={path} device={device} mode={mode} reloadKey={reloadKey} onMessage={onMessage} highlight={focus ? { doc: docKey, field: focus, tick: focus } : null} />
        </section>
      )}
      {picker && <MediaPicker kind="image" onClose={() => setPicker(null)} onPick={(m) => { d.change(picker, m.src, { immediate: true }); setPicker(null) }} />}
    </div>
  )
}

function ItemActions({ kind, docKey, data, flush }) {
  const { confirm, toast, refreshDocs } = useApp()
  const nav = useNavigate()
  const def = COLLECTIONS[kind]
  const dup = async () => {
    await flush()
    const copy = { ...clone(data), hidden: true, slug: `${data.slug}-copy`, [def.titleField]: `${data[def.titleField]} (copy)` }
    const r = await api('/docs', { method: 'POST', body: { kind, id: `${data.slug}-copy`, data: copy } })
    await refreshDocs(); toast(`${def.singular} duplicated (hidden until you switch it on)`); nav(editPathFor(r.key))
  }
  const del = async () => {
    if (!(await confirm({ title: `Delete this ${def.singular.toLowerCase()}?`, body: 'It is removed from the site when you next publish. You can restore it from History afterwards. To take it off the site but keep it, switch on “Hide from the site” instead.', confirm: 'Delete', tone: 'danger', typeToConfirm: 'delete' }))) return
    await api(`/docs/${encodeURIComponent(docKey)}`, { method: 'DELETE' })
    await refreshDocs(); toast('Marked for deletion'); nav(`/admin/${KIND_ROUTE[kind]}`)
  }
  return <div className="danger-zone"><Button icon="copy" onClick={dup}>Duplicate</Button><Button icon="trash" tone="danger-ghost" onClick={del}>Delete</Button></div>
}

function ThemePresets({ d }) {
  const { confirm } = useApp()
  const apply = async (p) => {
    if (!(await confirm({ title: `Apply “${p.label}” colours?`, body: 'Every colour below is replaced in the draft. Nothing changes on the live site until you publish, and Undo brings the previous colours back.', confirm: 'Apply to draft' }))) return
    d.change('colors', { ...(d.data.colors || {}), ...p.colors }, { immediate: true })
  }
  return (
    <div className="presets">
      <p className="field-label">Colour presets</p>
      <div className="preset-row">
        {THEME_PRESETS.map((p) => (
          <button key={p.id} type="button" className="preset" onClick={() => apply(p)}>
            <span className="swatches">{['ink', 'paper', 'accent', 'accent2', 'textOnDark'].map((k) => <i key={k} style={{ background: p.colors[k] }} />)}</span>
            <strong>{p.label}</strong><span className="muted small">{p.description}</span>
          </button>
        ))}
      </div>
      <p className="field-hint">If a text colour becomes hard to read on its background, the site automatically uses black or white instead — the numbers next to text colours show the contrast (4.5:1 or more is good).</p>
    </div>
  )
}

function MediaNote() {
  return <p className="note">Films are placed on pages by name (for example in the home hero or a “Video / image feature” section). Upload video files in the <Link to="/admin/media">Media library</Link>. A “photo with a camera move” needs no video file.</p>
}
