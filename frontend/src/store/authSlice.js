import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true
      state.error = null
    },
    loginSuccess: (state, action) => {
      state.loading = false
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      localStorage.setItem('token', action.payload.token)
    },
    loginFailure: (state, action) => {
      state.loading = false
      state.error = action.payload
      state.isAuthenticated = false
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
    },
    registerSuccess: (state, action) => {
      state.loading = false
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      localStorage.setItem('token', action.payload.token)
    },
    fetchUserStart: (state) => {
      state.loading = true
      state.error = null
    },
    fetchUserSuccess: (state, action) => {
      state.loading = false
      state.user = action.payload
    },
    fetchUserFailure: (state, action) => {
      state.loading = false
      state.error = action.payload
    },
    updateProfileStart: (state) => {
      state.loading = true
      state.error = null
    },
    updateProfileSuccess: (state, action) => {
      state.loading = false
      state.user = action.payload
    },
    updateProfileFailure: (state, action) => {
      state.loading = false
      state.error = action.payload
    },
  },
})

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  logout, 
  registerSuccess,
  fetchUserStart,
  fetchUserSuccess,
  fetchUserFailure,
  updateProfileStart, 
  updateProfileSuccess, 
  updateProfileFailure 
} = authSlice.actions
export default authSlice.reducer
