import { Outlet } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import Navbar from './Navbar'
import api from '../services/api'
import { fetchUserStart, fetchUserSuccess, fetchUserFailure } from '../store/authSlice'
import { initThemeForUser } from '../store/themeSlice'

function hexRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

function mix(hex, a) {
  const [r,g,b] = hexRgb(hex)
  return `rgb(${Math.round(255*(1-a)+r*a)},${Math.round(255*(1-a)+g*a)},${Math.round(255*(1-a)+b*a)})`
}

export default function MainLayout() {
  const { token, user } = useSelector((state) => state.auth)
  const themeColor = useSelector((state) => state.theme.color)
  const dispatch = useDispatch()

  useEffect(() => {
    // Fetch user data if token exists but user is not loaded
    if (token && !user) {
      const loadUser = async () => {
        dispatch(fetchUserStart())
        try {
          const userData = await api.getCurrentUser(token)
          dispatch(fetchUserSuccess(userData))
        } catch (error) {
          dispatch(fetchUserFailure(error.message))
        }
      }
      loadUser()
    }
  }, [token, user, dispatch])

  // Load this user's saved theme from DB once their object is available
  useEffect(() => {
    if (user?.id) {
      dispatch(initThemeForUser(user.theme_color))
    }
  }, [user?.id, dispatch])

  const [tr,tg,tb] = hexRgb(themeColor)
  const navDark = `rgb(${Math.round(tr*0.62)},${Math.round(tg*0.62)},${Math.round(tb*0.62)})`

  const themeVars = {
    minHeight: '100vh',
    background: `linear-gradient(160deg, #ffffff 0%, ${mix(themeColor,0.05)} 20%, ${mix(themeColor,0.10)} 45%, ${mix(themeColor,0.16)} 70%, ${mix(themeColor,0.22)} 100%)`,
    backgroundAttachment: 'fixed',
    '--th-card':    `linear-gradient(160deg, ${mix(themeColor,0.10)} 0%, ${mix(themeColor,0.22)} 60%, ${mix(themeColor,0.36)} 100%)`,
    '--th-sidebar': `linear-gradient(160deg, ${mix(themeColor,0.08)} 0%, ${mix(themeColor,0.18)} 35%, ${mix(themeColor,0.30)} 70%, ${mix(themeColor,0.44)} 100%)`,
    '--th-border':  mix(themeColor, 0.45),
    // Navbar vars
    '--th-nav-bg':         `rgba(${Math.round(tr*0.18)},${Math.round(tg*0.18)},${Math.round(tb*0.18)},0.96)`,
    '--th-nav-drop':       `rgba(${Math.round(tr*0.12)},${Math.round(tg*0.12)},${Math.round(tb*0.12)},0.97)`,
    '--th-nav-accent':     themeColor,
    '--th-nav-dark':       navDark,
    '--th-nav-active':     `rgba(${tr},${tg},${tb},0.22)`,
    '--th-nav-hover':      `rgba(${tr},${tg},${tb},0.14)`,
    '--th-nav-border':     `rgba(${tr},${tg},${tb},0.25)`,
    '--th-nav-glow':       `rgba(${tr},${tg},${tb},0.45)`,
    '--th-nav-brand-from': `rgb(${Math.round(255*0.80+tr*0.20)},${Math.round(255*0.80+tg*0.20)},${Math.round(255*0.80+tb*0.20)})`,
    '--th-nav-brand-to':   `rgb(${Math.round(255*0.62+tr*0.38)},${Math.round(255*0.62+tg*0.38)},${Math.round(255*0.62+tb*0.38)})`,
    '--th-nav-text':       `rgba(${Math.round(255*0.72+tr*0.28)},${Math.round(255*0.72+tg*0.28)},${Math.round(255*0.72+tb*0.28)},0.78)`,
  }

  return (
    <div style={themeVars}>
      <Navbar />
      <Outlet />
    </div>
  )
}
