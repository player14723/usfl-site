import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import '@fontsource-variable/instrument-sans/index.css'
import '@fontsource-variable/geist-mono/index.css'
import './admin.css'
import { AppProvider, useApp } from './state'
import Shell from './components/Shell'
import { Login, ChoosePassword } from './views/Login'
import PageEditor from './views/PageEditor'
import { SettingsEditor, ItemEditor } from './views/DocEditor'
import { PagesView, CollectionView } from './views/Lists'
import MediaView from './views/MediaView'
import { Overview, VersionsView, UsersView, InboxView, AccountView, PreviewView } from './views/Other'

function Gate() {
  const { session } = useApp()
  if (session === undefined) return <div className="auth"><span className="spinner" /></div>
  if (!session) return <Login />
  if (session.user.must_change) return <div className="auth"><ChoosePassword /></div>
  return (
    <Routes>
      <Route path="/admin" element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="pages" element={<PagesView />} />
        <Route path="pages/:id" element={<PageEditor />} />
        <Route path="work" element={<CollectionView kind="case" />} />
        <Route path="work/:id" element={<ItemEditor kind="case" />} />
        <Route path="capabilities" element={<CollectionView kind="capability" />} />
        <Route path="capabilities/:id" element={<ItemEditor kind="capability" />} />
        <Route path="insights" element={<CollectionView kind="insight" />} />
        <Route path="insights/:id" element={<ItemEditor kind="insight" />} />
        <Route path="settings/:key" element={<SettingsEditor />} />
        <Route path="media" element={<MediaView />} />
        <Route path="versions" element={<VersionsView />} />
        <Route path="users" element={<UsersView />} />
        <Route path="inbox" element={<InboxView />} />
        <Route path="account" element={<AccountView />} />
        <Route path="preview" element={<PreviewView />} />
        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('admin')).render(
  <BrowserRouter>
    <AppProvider><Gate /></AppProvider>
  </BrowserRouter>,
)
