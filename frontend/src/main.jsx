import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Avatar from './components/Avatar.jsx'

// Quick visual check for the 3D avatar without going through onboarding:
// open the app with "?debugAvatar"  ->  https://your-site/?debugAvatar
const isAvatarDebug = new URLSearchParams(window.location.search).has('debugAvatar')

createRoot(document.getElementById('root')).render(
  isAvatarDebug ? (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Avatar mood="explaining" isSpeaking={true} />
    </div>
  ) : (
    <App />
  )
)
