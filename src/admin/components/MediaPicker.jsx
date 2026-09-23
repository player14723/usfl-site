import { useCallback, useEffect, useRef, useState } from 'react'
import { api, upload, bytes } from '../lib'
import { useApp } from '../state'
import { Button, Icon, Modal } from './ui'

export function useMediaList({ kind = '', q = '', folder = '', trash = false } = {}) {
  const [items, setItems] = useState(null)
  const [folders, setFolders] = useState([])
  const load = useCallback(async () => {
    const qs = new URLSearchParams({ kind, q, folder, trash: trash ? '1' : '' })
    const r = await api(`/media?${qs}`)
    setItems(r.items); setFolders(r.folders)
  }, [kind, q, folder, trash])
  useEffect(() => { load().catch(() => setItems([])) }, [load])
  return { items, folders, reload: load }
}

export function Uploader({ accept = 'image/*,video/mp4,video/webm', folder = '', onDone, compact = false }) {
  const { toast } = useApp()
  const [jobs, setJobs] = useState([])
  const [over, setOver] = useState(false)
  const input = useRef(null)
  const run = async (files) => {
    const list = [...files]
    if (!list.length) return
    const done = []
    for (const f of list) {
      const id = Math.random().toString(36).slice(2)
      setJobs((j) => [...j, { id, name: f.name, p: 0 }])
      try {
        const m = await upload(f, { folder, onProgress: (p) => setJobs((j) => j.map((x) => (x.id === id ? { ...x, p } : x))) })
        done.push(m)
        setJobs((j) => j.filter((x) => x.id !== id))
      } catch (e) {
        toast(`${f.name}: ${e.message}`, 'error')
        setJobs((j) => j.filter((x) => x.id !== id))
      }
    }
    if (done.length) { toast(`${done.length} file${done.length > 1 ? 's' : ''} uploaded`); onDone?.(done) }
  }
  return (
    <div
      className={`dropzone ${over ? 'over' : ''} ${compact ? 'compact' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); run(e.dataTransfer.files) }}
    >
      <Icon name="upload" size={22} />
      <p><strong>Drop files here</strong> or <button type="button" className="linklike" onClick={() => input.current?.click()}>choose from your computer</button></p>
      {!compact && <p className="field-hint">Images: JPG, PNG, WebP, AVIF or GIF up to 30 MB — resized and optimised automatically. Videos: MP4 or WebM up to 400 MB.</p>}
      <input ref={input} type="file" multiple accept={accept} hidden onChange={(e) => { run(e.target.files); e.target.value = '' }} />
      {jobs.map((j) => <div key={j.id} className="progress"><span>{j.name}</span><span className="bar"><i style={{ width: `${Math.round(j.p * 100)}%` }} /></span></div>)}
    </div>
  )
}

export function MediaGrid({ items, selected, onSelect, onOpen }) {
  if (!items) return <p className="muted">Loading…</p>
  if (!items.length) return <p className="muted">Nothing here yet.</p>
  return (
    <ul className="mgrid">
      {items.map((m) => (
        <li key={m.id}>
          <button type="button" className={`mcard ${selected === m.src ? 'on' : ''}`} onClick={() => onSelect?.(m)} onDoubleClick={() => onOpen?.(m)} aria-pressed={selected === m.src}>
            <span className="mthumb">
              {m.kind === 'video' ? (m.poster ? <img src={m.poster} alt="" loading="lazy" /> : <video src={m.src} muted preload="metadata" />) : <img src={m.srcSmall || m.src} alt="" loading="lazy" />}
              {m.kind === 'video' && <span className="mtag"><Icon name="film" size={13} /> Video</span>}
            </span>
            <span className="mname">{m.name}</span>
            <span className="mmeta">{m.width ? `${m.width}×${m.height}` : ''} {bytes(m.bytes)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Choose an image or video from the library (or upload one). */
export default function MediaPicker({ kind = 'image', current, onClose, onPick }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const { items, reload } = useMediaList({ kind, q })
  return (
    <Modal title={kind === 'video' ? 'Choose a video' : 'Choose an image'} onClose={onClose} wide footer={
      <>
        <span className="muted" style={{ marginRight: 'auto' }}>{sel ? sel.name : current ? `Current: ${current.split('/').pop()}` : ''}</span>
        <Button onClick={onClose}>Cancel</Button>
        <Button tone="primary" disabled={!sel} onClick={() => onPick(sel)}>Use this {kind}</Button>
      </>
    }>
      <div className="picker-top">
        <label className="search"><Icon name="search" size={16} /><input className="input" placeholder={`Search ${kind === 'video' ? 'videos' : 'images'}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></label>
      </div>
      <Uploader compact accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/*'} onDone={(ms) => { reload(); setSel(ms[0]) }} />
      <MediaGrid items={items} selected={sel?.src || current} onSelect={setSel} onOpen={(m) => onPick(m)} />
    </Modal>
  )
}
