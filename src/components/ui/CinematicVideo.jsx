import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../../lib/gsap'
import { useMotion, EASE } from '../../platform/motion'

const CLIP_FROM = {
  up: 'inset(100% 0% 0% 0%)',
  down: 'inset(0% 0% 100% 0%)',
  left: 'inset(0% 100% 0% 0%)',
  right: 'inset(0% 0% 0% 100%)',
  center: 'inset(50% 50% 50% 50%)',
}

/**
 * CinematicVideo — a video treated as a scene, not a player.
 * · poster paints instantly; the video fades in once it is actually playing
 * · priority videos load eagerly; others attach their source only near the viewport and pause when far away
 * · mobileSrc is used on narrow screens / data-saver connections
 * · reduced motion: poster only, no autoplay
 * · optional scroll parallax, scroll scale ([from,to]) and clip-path reveal
 */
const CinematicVideo = forwardRef(function CinematicVideo(
  {
    src, poster, mobileSrc, webm, mobileWebm, playbackRate = 1, fit = 'cover', objectPosition = '50% 50%', autoplay = true, loop = true, muted = true, playsInline = true,
    priority = false, parallax = 0, revealDirection = 'none', scrollScale = null, overlay = null, className = '', style,
    label, revealDuration = 1.4, once = false, onEnded, ...rest
  },
  ref,
) {
  const root = useRef(null)
  const inner = useRef(null)
  const vid = useRef(null)
  const attached = useRef(false)
  const started = useRef(autoplay) // gated videos wait for start()
  const finished = useRef(false) // `once` videos hold their last frame and never restart
  const api = useRef({})
  const m = useMotion()

  useImperativeHandle(ref, () => ({ root: root.current, inner: inner.current, video: vid.current, start: () => { if (api.current.start) api.current.start(); else started.current = true /* queued until the video is set up */ } }), [])

  const pick = () => {
    const narrow = window.matchMedia('(max-width: 767px)').matches
    const save = navigator.connection?.saveData
    const small = Boolean(mobileSrc && (narrow || save))
    const chosen = small ? mobileSrc : src
    // browsers built without H.264 (some Chromium/Firefox builds) get the WebM twin, when one is configured
    const twin = small ? mobileWebm || webm : webm
    const v = vid.current
    if (v && twin && /\.mp4$/i.test(chosen) && !v.canPlayType('video/mp4; codecs="avc1.42E01E"') && v.canPlayType('video/webm; codecs="vp9"')) return twin
    return chosen
  }

  useEffect(() => {
    const v = vid.current
    if (!v || !m.enabled || !src) return
    const attach = () => {
      if (attached.current) return
      attached.current = true
      v.src = pick()
      v.load()
      v.playbackRate = Math.max(0.25, Math.min(4, Number(playbackRate) || 1))
    }
    const play = () => {
      if (!started.current || finished.current) return
      const p = v.play()
      if (p && p.catch) p.catch(() => {})
    }
    const onPlaying = () => { v.style.opacity = '1' }
    const onEnd = () => { if (once) finished.current = true; onEnded?.() }
    v.addEventListener('playing', onPlaying)
    v.addEventListener('ended', onEnd)
    api.current.start = () => {
      started.current = true; finished.current = false
      attach()
      try { v.currentTime = 0 } catch { /* not seekable yet */ }
      if (v.readyState >= 2) play(); else v.addEventListener('canplay', play, { once: true })
    }
    if (priority) { attach(); if (v.readyState >= 2) play(); else v.addEventListener('canplay', play, { once: true }) }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { attach(); if (v.readyState >= 2) play(); else v.addEventListener('canplay', play, { once: true }) }
          else if (attached.current) v.pause()
        })
      },
      { rootMargin: priority ? '20% 0px' : '120% 0px' },
    )
    io.observe(root.current)
    return () => { io.disconnect(); v.removeEventListener('playing', onPlaying); v.removeEventListener('ended', onEnd); v.removeEventListener('canplay', play) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, mobileSrc, autoplay, priority, m.enabled])

  useGSAP(
    () => {
      if (!m.enabled) return
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const r = root.current
        const par = m.parallax(parallax)
        if (par) {
          gsap.fromTo(inner.current, { yPercent: -par }, { yPercent: par, ease: 'none', scrollTrigger: { trigger: r, start: 'top bottom', end: 'bottom top', scrub: 0.6 } })
        }
        if (scrollScale) {
          const [a, b] = Array.isArray(scrollScale) ? scrollScale : [1, scrollScale]
          gsap.fromTo(inner.current, { scale: a }, { scale: b, ease: 'none', scrollTrigger: { trigger: r, start: 'top bottom', end: 'bottom top', scrub: 0.6 } })
        }
        if (revealDirection !== 'none' && CLIP_FROM[revealDirection]) {
          gsap.set(r, { clipPath: CLIP_FROM[revealDirection] })
          ScrollTrigger.create({
            trigger: r, start: 'top 85%', once: true,
            onEnter: () => gsap.to(r, { clipPath: 'inset(0% 0% 0% 0%)', duration: m.dur(revealDuration), ease: EASE.inOut, clearProps: 'clipPath' }),
          })
        }
      })
    },
    { scope: root, dependencies: [parallax, revealDirection] },
  )

  const parPct = m.enabled ? m.parallax(parallax) : 0
  const pad = parPct ? Math.max(Math.abs(parPct) + 2, 6) : 0
  return (
    <div ref={root} className={`cv ${className}`} style={style} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })} {...rest}>
      <div ref={inner} className="cv-inner" style={{ inset: `-${pad}% 0` }}>
        {poster && <img className="cv-poster" src={poster} alt="" style={{ objectPosition, objectFit: fit }} loading="eager" decoding="async" fetchPriority={priority ? 'high' : undefined} />}
        <video
          ref={vid}
          muted={muted}
          loop={once ? false : loop}
          playsInline={playsInline}
          preload={priority ? 'auto' : 'none'}
          tabIndex={-1}
          disablePictureInPicture
          style={{ objectPosition, objectFit: fit, opacity: 0 }}
        />
      </div>
      {overlay && <div className="cv-overlay" style={{ background: overlay }} />}
    </div>
  )
})

export default CinematicVideo
