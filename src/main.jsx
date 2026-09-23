import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { boot } from './platform/boot'
import App from './App'
import { IS_PREVIEW } from './platform/data'

boot()
createRoot(document.getElementById('root')).render(<App />)
// inside the editor: lets the editor highlight, select and edit what is on the page
if (IS_PREVIEW) import('./preview/bridge.js').then((m) => m.start())
