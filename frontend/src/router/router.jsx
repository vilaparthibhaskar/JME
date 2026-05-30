import { createBrowserRouter } from 'react-router-dom'
import Home from '../pages/Home.jsx'
import Login from '../pages/Login.jsx'
import Signup from '../pages/Signup.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Settings from '../pages/Settings.jsx'
import Resume from '../pages/Resume.jsx'
import Versions from '../pages/Versions.jsx'
import Prompts from '../pages/Prompts.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import MainLayout from '../components/MainLayout.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/resume',
        element: (
          <ProtectedRoute>
            <Resume />
          </ProtectedRoute>
        ),
      },
      {
        path: '/settings',
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },
      {
        path: '/versions',
        element: (
          <ProtectedRoute>
            <Versions />
          </ProtectedRoute>
        ),
      },
      {
        path: '/prompts',
        element: (
          <ProtectedRoute>
            <Prompts />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
])
