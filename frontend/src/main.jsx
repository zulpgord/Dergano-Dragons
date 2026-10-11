import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applySavedTheme } from './theme'

applySavedTheme()
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
