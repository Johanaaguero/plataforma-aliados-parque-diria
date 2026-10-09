import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import SobreParque from './components/informativo/SobreParque.tsx'
import FeedbackToast from './components/ui/FeedbackToast.tsx'
import LoginWelcomeOverlay from './components/ui/LoginWelcomeOverlay.tsx'
import LogoutWelcomeOverlay from './components/ui/LogoutWelcomeOverlay.tsx'
import SplashScreen from './components/ui/SplashScreen.tsx'
import { aplicarTema, leerPreferenciaTema } from './components/ui/tema.ts'

aplicarTema(leerPreferenciaTema())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <SobreParque />
      <FeedbackToast />
      <LoginWelcomeOverlay />
      <LogoutWelcomeOverlay />
      <SplashScreen />
    </BrowserRouter>
  </StrictMode>,
)
