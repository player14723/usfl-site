import { useParams } from 'react-router-dom'
import { caseBySlug, caseUrl } from '../platform/content'
import { useSeo } from '../platform/seo'
import CaseStudyView from '../components/CaseStudy'
import NotFound from './NotFound'

export default function CaseStudy() {
  const { slug } = useParams()
  const c = caseBySlug(slug)
  useSeo(c ? { title: c.seo?.title || c.title, description: c.seo?.description || c.summary, image: c.seo?.image, path: caseUrl(c.slug) } : { title: 'Not found', robots: 'noindex' }, [slug])
  if (!c) return <NotFound />
  return <CaseStudyView key={c.slug} c={c} />
}
