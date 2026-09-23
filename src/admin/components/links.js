/** Where in the editor a document is edited. */
export function editPathFor(key) {
  if (!key) return '/admin'
  if (key === 'pages') return '/admin/pages'
  if (key === 'media') return '/admin/settings/media'
  if (key.startsWith('page:')) return `/admin/pages/${encodeURIComponent(key.slice(5))}`
  if (key.startsWith('case:')) return `/admin/work/${encodeURIComponent(key.slice(5))}`
  if (key.startsWith('capability:')) return `/admin/capabilities/${encodeURIComponent(key.slice(11))}`
  if (key.startsWith('insight:')) return `/admin/insights/${encodeURIComponent(key.slice(8))}`
  return `/admin/settings/${key}`
}
