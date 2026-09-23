// Resolve a public/ asset against the build's base so the site works from a domain root or a sub-path.
export const asset = (p) => (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/') + String(p).replace(/^\//, '')
