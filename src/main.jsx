import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

window.__REQFLOW_BOOTED__ = true;

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
