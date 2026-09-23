/**
 * Section registry — every section type a page file can use, by name.
 *
 * A page (src/config/pages/*.json) is an ordered list of sections:
 *   { "type": "statement", "id": "why-now", "hidden": false, "motion": "inherit", "spacing": "default", ...content }
 *
 * To add a new section type: build the component in src/sections/, register it here, and describe its fields in
 * shared/schema.js (the editor builds its form from that). See docs/DEVELOPER-GUIDE.md.
 */
import Hero from './Hero'
import Proof from './Proof'
import Problem from './Problem'
import LivingSystem from './LivingSystem'
import CapabilitySection from './CapabilitySection'
import CapabilityListSection from './CapabilityListSection'
import SelectedWork from './SelectedWork'
import CaseList from './CaseList'
import Audience from './Audience'
import Why from './Why'
import Trust from './Trust'
import FinalCTA from './FinalCTA'
import Statement from './Statement'
import RichText from './RichText'
import TextImage from './TextImage'
import Cards from './Cards'
import Columns from './Columns'
import SplitStatement from './SplitStatement'
import InsightList from './InsightList'
import ContactSection from './Contact'
import VideoFeature from './VideoFeature'
import FullscreenMedia from './FullscreenMedia'
import PageHero from '../components/PageHero'
import SectionTransition from '../components/ui/SectionTransition'

export const SECTIONS = {
  // cinematic scenes (the home page)
  hero: { component: Hero, label: 'Home hero (cinematic)' },
  proof: { component: Proof, label: 'Proof' },
  problem: { component: Problem, label: 'Problem (scroll scene)' },
  system: { component: LivingSystem, label: 'Connected system (scroll scene)' },
  capabilities: { component: CapabilitySection, label: 'Capabilities (with header)' },
  'selected-work': { component: SelectedWork, label: 'Selected work (lead + pair)' },
  audience: { component: Audience, label: 'Who this is for' },
  why: { component: Why, label: 'Why (list with signal line)' },
  trust: { component: Trust, label: 'Partners & trust' },
  cta: { component: FinalCTA, label: 'Call to action' },
  // colour-world change
  transition: {
    component: SectionTransition,
    label: 'Transition (statement + colour change)',
    map: ({ variant, ...p }, sid) => ({ ...p, type: variant || 'circle', id: sid }),
  },
  // inner pages
  'page-hero': { component: PageHero, label: 'Page hero' },
  'case-list': { component: CaseList, label: 'All case studies' },
  'capability-list': { component: CapabilityListSection, label: 'All capabilities' },
  'insight-list': { component: InsightList, label: 'All insights' },
  contact: { component: ContactSection, label: 'Contact' },
  // general-purpose
  statement: { component: Statement, label: 'Statement' },
  'rich-text': { component: RichText, label: 'Rich text' },
  'text-image': { component: TextImage, label: 'Text + image' },
  cards: { component: Cards, label: 'Cards' },
  columns: { component: Columns, label: 'Columns' },
  'split-statement': { component: SplitStatement, label: 'Split statement' },
  'video-feature': { component: VideoFeature, label: 'Video / image feature' },
  'fullscreen-media': { component: FullscreenMedia, label: 'Full-screen media' },
}
