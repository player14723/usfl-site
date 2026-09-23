import { CAP_CSS, CapabilityList } from './CapabilitySection'

/** Every visible capability as an editorial scene, without a header (the Capabilities page). */
export default function CapabilityListSection({ theme = 'light' }) {
  return (
    <section data-theme={theme} className="section" aria-label="Capabilities" style={{ padding: 'calc(var(--section-space) * clamp(60px,8vw,140px)) 0 calc(var(--section-space) * clamp(80px,10vw,180px))' }}>
      <div className="wrap">
        <CapabilityList />
      </div>
      <style>{CAP_CSS}</style>
    </section>
  )
}
