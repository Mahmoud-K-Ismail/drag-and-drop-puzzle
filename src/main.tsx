import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './app/styles/global.css'
import { devLog } from './shared/lib/devLog'

devLog('app', 'boot', { mode: import.meta.env.MODE })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
