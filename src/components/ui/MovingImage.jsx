import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../../lib/gsap'
import { resolveImage } from '../../platform/media'
import { useMotion, IMAGES, EASE } from '../../platform/motion'

const CLIP_FROM = {
  up: 'inset(100% 0% 0% 0%)',
  down: 'inset(0% 0% 100% 0%)',
  left: 'inset(0% 100% 0% 0%)',
  right: 'inset(0% 0% 0% 100%)',
  center: 'inset(50% 50% 50% 50%)',
}

/**
 * MovingImage — imagery that is never static: scroll parallax (`speed`), scroll scale, and an optional
 * clip-path reveal with the picture counter-scaling inside the mask.
 *
 * `name` is a media-library name or a direct path (see platform/media.js). Alt text, focal point, fit and
 * the "Illustrative" tag come from the library entry unless overridden here. An empty or missing image
 * renders an empty frame of the same proportions, so layouts never collapse.
 */
export default function MovingImage({
  name, alt, aspect, speed = 8, scaleFrom, scrollScale = null, reveal = 'none', revealDuration, illustrative,
  eager = false, shared = false, hero = false, sizes = '(min-width: 900px) 50vw, 100vw', className = '', style, position, fit, axis = 'y', children, caption, ...rest
}) {
  const img0 = resolveImage(name)
  const m = useMotion()
  const tagged = illustrative ?? Boolean(img0?.illustrative)
  const pos = position && position !== '50% 50%' ? position : img0?.position || '50% 50%'
  const par0 = m.enabled ? m.parallax(speed) : 0
  const rev = IMAGES.reveal === 'none' ? 'none' : IMAGES.reveal === 'fade' && reveal !== 'none' ? 'fade' : reveal
  const root = useRef(null)
  const par = useRef(null)
  const img = useRef(null)
  useGSAP(
    () => {
      if (!m.enabled) return
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const r = root.current
        if (par0) {
          gsap.fromTo(par.current, axis === 'y' ? { yPercent: -par0 } : { xPercent: -par0 }, {
            ...(axis === 'y' ? { yPercent: par0 } : { xPercent: par0 }), ease: 'none',
            scrollTrigger: { trigger: r, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          })
        }
        if (scrollScale && img.current) {
          const [a, b] = scrollScale
          const k = m.dist(1)
          gsap.fromTo(img.current, { scale: 1 + (a - 1) * k }, { scale: 1 + (b - 1) * k, ease: 'none', scrollTrigger: { trigger: r, start: 'top bottom', end: 'bottom top', scrub: 0.6 } })
        }
        const dur = m.dur(revealDuration ?? IMAGES.revealDuration)
        if (rev === 'fade') {
          gsap.set(r, { opacity: 0 })
          ScrollTrigger.create({ trigger: r, start: IMAGES.triggerPoint, once: true, onEnter: () => gsap.to(r, { opacity: 1, duration: dur, ease: 'power2.out' }) })
        } else if (rev !== 'none' && CLIP_FROM[rev]) {
          gsap.set(r, { clipPath: CLIP_FROM[rev] })
          if (img.current) gsap.set(img.current, { scale: scaleFrom ?? IMAGES.revealScaleFrom })
          ScrollTrigger.create({
            trigger: r, start: IMAGES.triggerPoint, once: true,
            onEnter: () => {
              gsap.to(r, { clipPath: 'inset(0% 0% 0% 0%)', duration: dur, ease: EASE.inOut, clearProps: 'clipPath' })
              if (img.current) gsap.to(img.current, { scale: 1, duration: dur * 1.3, ease: EASE.entrance })
            },
          })
        }
      })
    },
    { scope: root, dependencies: [speed, rev, name] },
  )
  const pad = par0 ? Math.max(Math.abs(par0) + 2, 6) : 0
  const cap = caption ?? img0?.caption
  return (
    <div ref={root} className={`frame ${className}`} style={{ aspectRatio: aspect, ...style }} {...rest}>
      <div ref={par} style={{ position: 'absolute', inset: axis === 'y' ? `-${pad}% 0` : `0 -${pad}%`, willChange: par0 ? 'transform' : undefined }}>
        {img0 && (
          <img
            ref={img}
            src={img0.src}
            srcSet={img0.srcSet}
            sizes={sizes}
            alt={alt ?? img0.alt ?? ''}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            data-shared-img={shared ? '' : undefined}
            data-hero-img={hero ? '' : undefined}
            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
            style={{ width: '100%', height: '100%', objectFit: fit || img0.fit || 'cover', objectPosition: pos, position: 'absolute', inset: 0 }}
          />
        )}
      </div>
      {img0 && tagged && <span className="tag-illus">Illustrative</span>}
      {cap && <span className="tag-caption">{cap}</span>}
      {children}
    </div>
  )
}
