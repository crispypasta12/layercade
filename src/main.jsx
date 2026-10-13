import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.jsx'

inject()

// For the curious ones who open devtools on a print shop
console.log(
  '%cLAYERCADE%c\nYou opened the console. Respect.\nNothing to steal here, just plastic and poor sleep. Want to build things with us? Say hi on WhatsApp.',
  'font: 700 28px "Bebas Neue", sans-serif; color: #ff5500;',
  'font: 12px "Space Mono", monospace; color: #999;'
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
