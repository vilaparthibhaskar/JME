import { createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

const CACHE_KEY = 'jme_tc'

const themeSlice = createSlice({
  name: 'theme',
  initialState: { color: localStorage.getItem(CACHE_KEY) || '#52796f' },
  reducers: {
    _setColor(state, action) {
      state.color = action.payload
      localStorage.setItem(CACHE_KEY, action.payload)
    },
  },
})

const { _setColor } = themeSlice.actions

/** Called once from MainLayout when the user object loads — syncs color from DB. */
export function initThemeForUser(color) {
  return (dispatch) => {
    dispatch(_setColor(color || '#52796f'))
  }
}

/** Dispatched from Settings — saves to DB and updates Redux state. */
export function setThemeColor(color) {
  return async (dispatch, getState) => {
    dispatch(_setColor(color))  // optimistic update
    try {
      const { token } = getState().auth
      await api.updateProfile(token, { theme_color: color })
    } catch (e) {
      console.warn('Failed to save theme color to server:', e)
    }
  }
}

export default themeSlice.reducer
