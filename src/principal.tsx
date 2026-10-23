import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Application } from './application'
import './styles/jetons.css'
import './styles/base.css'
import './styles/formulaires.css'
import './styles/composants.css'
import './styles/acces.css'

ReactDOM.createRoot(document.getElementById('racine')!).render(
  <React.StrictMode>
    <BrowserRouter><Application /></BrowserRouter>
  </React.StrictMode>,
)
