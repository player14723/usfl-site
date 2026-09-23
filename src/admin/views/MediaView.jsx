import { useEffect, useRef, useState } from 'react'
import { useApp, useDoc } from '../state'
import { api, bytes, when } from '../lib'
import { Button, Icon, Tabs } from '../components/ui'
import { Toggle } from '../components/Fields'
import MediaPicker, { MediaGrid, Uploader, useMediaList } from '../components/MediaPicker'
import { TopbarSlot } from '../components/Topbar'

/** The media library: upload, search, describe, set focal points, see where things are used, trash/restore. */
export default function MediaView() {
  const { can } = useApp()
  const [tab, setTab] = useState('image')
  const [q, setQ] = useState('')
  const [folder, setFolder] = useState('')
  const [sel, setSel] = useState(null)
  const { items, folders, reload } = useMediaList({ kind: tab === 'trash' ? '' : tab, q, folder, trash: tab === 'trash' })
  useEffect(() => { setSel(null) }, [tab])
  return (
    <div className="media-view">
      <TopbarSlot><div className="crumbs"><strong className="crumb-title">Media library</strong></div></TopbarSlot>
      <section className="media-main pad">
        <div className="view-head"><div><h1>Media library</h1><p className="muted">Images and videos for the whole site. Uploaded images are optimised and resized for phones automatically. Descriptions and focal points you set here apply wherever the file is used.</p></div></div>
        <Uploader folder={folder} onDone={(ms) => { reload(); setSel(ms[0]) }} />
        <div className="toolbar">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'image', label: 'Images' }, { id: 'video', label: 'Videos' }, { id: 'trash', label: 'Trash' }]} />
          <label className="search"><Icon name="search" size={16} /><input className="input" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search media" /></label>
          <select className="input" value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Folder">
            <option value="">All folders</option>{folders.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <MediaGrid items={items} selected={sel?.src} onSelect={setSel} />
      </section>
      <aside className="panel media-detail" aria-label="File details">
        {sel ? <Detail key={sel.id} m={sel} canDelete={can('media.delete')} onChange={(m) => { setSel(m); reload() }} onGone={() => { setSel(null); reload() }} /> : <div className="insp-empty"><Icon name="image" size={28} /><h2>Select a file</h2><p className="muted">See its details, describe it, and find where it is used.</p></div>}
      </aside>
    </div>
  )
}

function Detail({ m, canDelete, onChange, onGone }) {
  const { toast, confirm } = useApp()
  const lib = useDoc('media')
  const [usage, setUsage] = useState(null)
  const [name, setName] = useState(m.name)
  const [folder, setFolder] = useState(m.folder)
  const [posterPick, setPosterPick] = useState(false)
  const img = useRef(null)
  useEffect(() => { api(`/media/${m.id}/usage`).then(setUsage).catch(() => setUsage([])) }, [m.id])
  const images = lib.data?.images || []
  const idx = images.findIndex((x) => x.src === m.src)
  const meta = idx >= 0 ? images[idx] : { name: m.name, src: m.src, srcSmall: m.srcSmall || '', width: m.width || undefined, alt: '', position: '50% 50%', fit: 'cover', illustrative: false, caption: '' }
  const setMeta = (patch) => {
    const next = [...images]
    if (idx >= 0) next[idx] = { ...meta, ...patch }
    else next.push({ ...meta, ...patch })
    lib.change('images', next)
  }
  const [px, py] = String(meta.position || '50% 50%').split(/\s+/).map((v) => parseFloat(v))
  const pickFocus = (e) => {
    const r = img.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - r.left) / r.width) * 100), y = Math.round(((e.clientY - r.top) / r.height) * 100)
    setMeta({ position: `${x}% ${y}%` })
  }
  const saveFile = async () => { const r = await api(`/media/${m.id}`, { method: 'PATCH', body: { name, folder } }); onChange(r); toast('Saved') }
  const trash = async () => {
    const used = usage || []
    if (!(await confirm({ title: 'Move to trash?', body: used.length ? 'This file is still used here. Pages that use it will show nothing in its place until you choose another file:' : 'It can be restored from the Trash tab.', list: used, confirm: used.length ? 'Move to trash anyway' : 'Move to trash', tone: 'danger' }))) return
    try { await api(`/media/${m.id}?force=${used.length ? 1 : 0}`, { method: 'DELETE' }); toast('Moved to trash'); onGone() } catch (e) { toast(e.message, 'error') }
  }
  const copy = async () => { try { await navigator.clipboard.writeText(m.src); toast('Address copied') } catch { toast(m.src) } }
  return (
    <div className="detail">
      <div className="insp-head"><h2 title={m.originalName}>{m.name}</h2></div>
      {m.kind === 'image' ? (
        <figure className="focal">
          <div className="focal-wrap" onClick={pickFocus} role="button" tabIndex={0} aria-label="Click the most important part of the picture to set the focal point" onKeyDown={(e) => { const s = e.shiftKey ? 10 : 2; const k = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key]; if (k) { e.preventDefault(); setMeta({ position: `${Math.max(0, Math.min(100, px + k[0]))}% ${Math.max(0, Math.min(100, py + k[1]))}%` }) } }}>
            <img ref={img} src={m.src} alt="" />
            <span className="focal-dot" style={{ left: `${px}%`, top: `${py}%` }} />
          </div>
          <figcaption className="field-hint">Click the most important part of the picture. It stays in view whenever the image is cropped. ({meta.position})</figcaption>
        </figure>
      ) : (
        <video src={m.src} poster={m.poster || undefined} controls muted playsInline className="detail-video" />
      )}
      <dl className="facts">
        <div><dt>File</dt><dd>{m.originalName || m.src.split('/').pop()}</dd></div>
        {m.width && <div><dt>Size</dt><dd>{m.width} × {m.height}px · {bytes(m.bytes)}</dd></div>}
        <div><dt>Added</dt><dd>{m.builtin ? 'Part of the site' : `${when(m.createdAt)}${m.createdBy ? ` by ${m.createdBy}` : ''}`}</dd></div>
        <div><dt>Address</dt><dd><code>{m.src}</code> <button type="button" className="link-sm" onClick={copy}>Copy</button></dd></div>
      </dl>
      {m.kind === 'image' && !m.deletedAt && (
        <div className="fields">
          <label className="field"><span className="field-label">Description (alt text)</span><textarea className="input" rows={2} value={meta.alt || ''} onChange={(e) => setMeta({ alt: e.target.value })} placeholder="What does the picture show?" /><p className="field-hint">Read aloud to people who cannot see the image. Leave empty only for purely decorative images.</p></label>
          <label className="field"><span className="field-label">Caption (optional)</span><input className="input" value={meta.caption || ''} onChange={(e) => setMeta({ caption: e.target.value })} /></label>
          <div className="field field-inline"><span className="field-label">Mark as illustrative</span><Toggle checked={!!meta.illustrative} onChange={(v) => setMeta({ illustrative: v })} /></div>
          <p className="field-hint">Adds a small “Illustrative” label for artwork that is not a documentary photograph.</p>
          <label className="field"><span className="field-label">Fit</span><select className="input" value={meta.fit || 'cover'} onChange={(e) => setMeta({ fit: e.target.value })}><option value="cover">Fill the frame (crop the edges)</option><option value="contain">Show the whole picture</option></select></label>
          <p className="muted small">{lib.status === 'saving' ? 'Saving to draft…' : lib.status === 'saved' ? 'Saved to draft — publish to update the live site' : ''}</p>
        </div>
      )}
      {m.kind === 'video' && !m.deletedAt && (
        <div className="fields">
          <p className="field-label">Poster (shown before the video plays)</p>
          {m.poster ? <img src={m.poster} alt="" className="poster-thumb" /> : <p className="muted small">No poster yet.</p>}
          <Button size="sm" onClick={() => setPosterPick(true)}>Choose poster image</Button>
          <p className="field-hint">To place this video on the site, add it to a film under Films & cinematics.</p>
          {posterPick && <MediaPicker kind="image" onClose={() => setPosterPick(false)} onPick={async (p) => { const r = await api(`/media/${m.id}/poster`, { method: 'POST', body: { src: p.src } }); setPosterPick(false); onChange(r) }} />}
        </div>
      )}
      {!m.builtin && !m.deletedAt && (
        <div className="fields">
          <label className="field"><span className="field-label">Name in the library</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span className="field-label">Folder</span><input className="input" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="e.g. Campaign 2027" /></label>
          <Button size="sm" onClick={saveFile} disabled={name === m.name && folder === m.folder}>Save name & folder</Button>
        </div>
      )}
      <section className="usage">
        <h3>Used on</h3>
        {!usage ? <p className="muted small">Checking…</p> : usage.length ? <ul className="plain-list">{usage.map((u) => <li key={u}>{u}</li>)}</ul> : <p className="muted small">Not used anywhere yet.</p>}
      </section>
      {m.deletedAt ? (
        <div className="danger-zone">
          <Button onClick={async () => { await api(`/media/${m.id}/restore`, { method: 'POST' }); toast('Restored'); onGone() }}>Restore</Button>
          {canDelete && <Button tone="danger-ghost" onClick={async () => { if (await confirm({ title: 'Delete permanently?', body: 'The file is removed from the server. This cannot be undone.', confirm: 'Delete permanently', tone: 'danger', typeToConfirm: 'delete' })) { await api(`/media/${m.id}/purge`, { method: 'DELETE' }); toast('Deleted'); onGone() } }}>Delete permanently</Button>}
        </div>
      ) : !m.builtin && canDelete ? <div className="danger-zone"><Button tone="danger-ghost" icon="trash" onClick={trash}>Move to trash</Button></div> : m.builtin ? <p className="field-hint">Files that ship with the site cannot be deleted, but you can replace them wherever they are used.</p> : null}
    </div>
  )
}
