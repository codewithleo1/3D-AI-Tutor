import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Avatar from './components/Avatar.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import VerifyPage from './pages/VerifyPage'
import AdminPage from './pages/AdminPage'

const isAvatarDebug = new URLSearchParams(window.location.search).has('debugAvatar')

createRoot(document.getElementById('root')).render(
  isAvatarDebug ? (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Avatar mood="explaining" isSpeaking={true} />
    </div>
  ) : (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  )
)