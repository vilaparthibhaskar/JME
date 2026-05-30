import { Outlet } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import Navbar from './Navbar'
import api from '../services/api'
import { fetchUserStart, fetchUserSuccess, fetchUserFailure } from '../store/authSlice'

export default function MainLayout() {
  const { token, user } = useSelector((state) => state.auth)
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

  return (
    <div>
      <Navbar />
      <Outlet />
    </div>
  )
}
