import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../state'
import { Button, Dialogs, Icon } from './ui'
import PublishPanel from './PublishPanel'
import { SitePaths } from './Fields'

const NAV = [
  { group: 'Website', items: [
    { to: '/admin', icon: 'home', label: 'Overview', end: true },
    { to: '/admin/pages', icon: 'pages', label: 'Pages' },
    { to: '/admin/work', icon: 'layers', label: 'Case studies' },
    { to: '/admin/capabilities', icon: 'grid', label: 'Capabilities' },
    { to: '/admin/insights', icon: 'star', label: 'Insights' },
    { to: '/admin/settings/system', icon: 'motion', label: 'Connected system' },
    { to: '/admin/settings/company', icon: 'users', label: 'Company facts' },
  ] },
  { group: 'Media', items: [
    { to: '/admin/media', icon: 'image', label: 'Media library' },
    { to: '/admin/settings/media', icon: 'film', label: 'Films & cinematics' },
  ] },
  { group: 'Design', items: [
    { to: '/admin/settings/theme', icon: 'palette', label: 'Colours, type & spacing' },
    { to: '/admin/settings/motion', icon: 'motion', label: 'Motion' },
    { to: '/admin/settings/brand', icon: 'star', label: 'Branding' },
  ] },
  { group: 'Site', items: [
    { to: '/admin/settings/navigation', icon: 'nav', label: 'Navigation & footer' },
    { to: '/admin/settings/site', icon: 'settings', label: 'Site settings & SEO' },
    { to: '/admin/inbox', icon: 'inbox', label: 'Inbox', perm: 'inbox' },
    { to: '/admin/versions', icon: 'history', label: 'History & versions' },
    { to: '/admin/users', icon: 'users', label: 'Accounts', perm: 'users' },
  ] },
]

export default function Shell() {
  const { session, signOut, pending, publishOpen, setPublishOpen, can } = useApp()
  const loc = useLocation()
  const [menu, setMenu] = useState(false)
  useEffect(() => { setMenu(false) }, [loc.pathname])
  return (
    <div className={`shell ${menu ? 'menu-open' : ''}`}>
      <a href="#main" className="skip">Skip to editor</a>
      <aside className="side" aria-label="Editor sections">
        <div className="brand"><span className="brand-mark" aria-hidden="true">usfl</span><span>Website editor</span></div>
        <nav>
          {NAV.map((g) => (
            <div key={g.group} className="side-group">
              <p className="side-label">{g.group}</p>
              {g.items.filter((i) => !i.perm || can(i.perm)).map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon name={i.icon} /> {i.label}</NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <NavLink to="/admin/account" className="side-link"><Icon name="key" /> {session?.user?.name || session?.user?.email}</NavLink>
          <button type="button" className="side-link" onClick={signOut}><Icon name="logout" /> Sign out</button>
        </div>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <button type="button" className="ibtn menu-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="nav" /></button>
          <div id="topbar-slot" className="topbar-slot" />
          <div className="topbar-right">
            <a className="btn btn-ghost" href="/" target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /> <span>Live site</span></a>
            <Button tone={pending ? 'primary' : 'default'} icon="globe" onClick={() => setPublishOpen(true)} aria-haspopup="dialog">
              Publish{pending ? <span className="count">{pending}</span> : null}
            </Button>
          </div>
        </header>
        <main id="main" className="main" tabIndex={-1}><Outlet /></main>
      </div>
      {publishOpen && <><div className="drawer-back" onClick={() => setPublishOpen(false)} /><PublishPanel onClose={() => setPublishOpen(false)} /></>}
      <Dialogs />
      <SitePaths />
    </div>
  )
}
