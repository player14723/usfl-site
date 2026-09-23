import { useSeo } from '../platform/seo'
import Sections from '../sections/Sections'

/** A page built from its config file (src/config/pages/<id>.json): SEO + its ordered sections. */
export default function SectionPage({ page }) {
  const seo = page.seo || {}
  useSeo({ ...seo, title: seo.title || (page.path === '/' ? '' : page.title), path: page.path }, [page.id])
  return <Sections sections={page.sections} docKey={`page:${page.id}`} />
}
