import { forwardRef, useImperativeHandle, useRef } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { resolveCinematic } from '../../platform/media'
import { useMotion } from '../../platform/motion'
import CinematicVideo from './CinematicVideo'

/**
 * Cinematic — places a cinematic from the media library (src/config/media.json → cinematics) by id.
 *
 *  type "video"  plays the configured video files (desktop / mobile, MP4 + optional WebM twin, poster).
 *  type "still"  needs no video file: a camera move (scale / pan) is performed on one image in the browser.
 *
 * playback: "loop" · "once" (plays once, holds the last frame) · "once-after-intro" (like "once", but waits for
 * the parent to call ref.start(), e.g. when the intro hands over) · "manual" (a scroll scene drives it).
 *
 * Safe fallbacks: unknown id / disabled cinematic / motion off → the poster (or source image) as a still;
 * nothing at all to show → an empty frame in the section's colour, never a broken element.
 * The imperative handle matches CinematicVideo ({ root, inner, video, start }) so scroll scenes can drive it.
 */
const Cinematic = forwardRef(function Cinematic({ id, playback: playbackOverride, noPoster = false, overlay, objectPosition, className = '', style, label, priority, parallax, revealDirection, scrollScale, ...rest }, ref) {
  const c = resolveCinematic(id)
  const m = useMotion()
  const stillRoot = useRef(null)
  const stillInner = useRef(null)
  const stillImg = useRef(null)
  const vref = useRef(null)
  const isStill = !c || c.disabled || c.type === 'still' || !c.src

  useImperativeHandle(ref, () =>
    isStill
      ? { root: stillRoot.current, inner: stillInner.current, video: null, start: () => {} }
      : { root: vref.current?.root, inner: vref.current?.inner, video: vref.current?.video, start: () => vref.current?.start?.() },
  )

  const poster = c ? (!m.enabled && c.posterReducedMotion ? c.posterReducedMotion : c.poster) : ''
  const pos = objectPosition || c?.position || '50% 50%'
  const ov = overlay && (c?.overlay ?? 1) > 0 ? overlay : null

  useGSAP(
    () => {
      const mv = c?.type === 'still' && !c.disabled ? c.still : null
      if (!isStill || !mv || !m.enabled || !stillImg.current) return
      const f = mv.from || {}, t = mv.to || {}
      gsap.fromTo(
        stillImg.current,
        { scale: f.scale ?? 1, xPercent: f.x ?? 0, yPercent: f.y ?? 0 },
        {
          scale: t.scale ?? 1.12, xPercent: t.x ?? 0, yPercent: t.y ?? 0,
          duration: m.dur(mv.duration ?? 12), ease: mv.ease || 'sine.inOut',
          repeat: mv.repeat === 'once' ? 0 : -1, yoyo: mv.repeat !== 'loop',
        },
      )
    },
    { scope: stillRoot, dependencies: [id, m.enabled] },
  )

  if (!isStill) {
    const playback = playbackOverride || c.playback
    const once = playback === 'once' || playback === 'once-after-intro'
    return (
      <CinematicVideo
        ref={vref}
        src={c.src}
        webm={c.webm}
        mobileSrc={c.mobileSrc || undefined}
        mobileWebm={c.mobileWebm}
        poster={noPoster ? '' : poster}
        fit={c.fit}
        objectPosition={pos}
        autoplay={playback === 'loop' || playback === 'once'}
        loop={!once}
        once={once}
        muted={c.muted !== false}
        playbackRate={c.playbackRate}
        overlay={ov}
        priority={priority}
        parallax={parallax}
        revealDirection={revealDirection}
        scrollScale={scrollScale}
        className={className}
        style={style}
        label={label ?? c.label}
        {...rest}
      />
    )
  }

  // still: a camera move on one image, or a plain poster fallback
  return (
    <div ref={stillRoot} className={`cv ${className}`} style={style} {...(label ?? c?.label ? { role: 'img', 'aria-label': label ?? c?.label } : { 'aria-hidden': 'true' })} {...rest}>
      <div ref={stillInner} className="cv-inner" style={{ inset: 0, overflow: 'hidden' }}>
        {(poster || c?.sourceImage) && (
          <img ref={stillImg} className="cv-poster" src={poster || c.sourceImage} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" style={{ objectPosition: pos, objectFit: c?.fit || 'cover', willChange: 'transform' }} />
        )}
      </div>
      {ov && <div className="cv-overlay" style={{ background: ov }} />}
    </div>
  )
})

export default Cinematic
