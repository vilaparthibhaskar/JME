import { createBrowserRouter, Navigate } from 'react-router-dom'
import Login from '../pages/Login.jsx'
import Signup from '../pages/Signup.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Settings from '../pages/Settings.jsx'
import Resume from '../pages/Resume.jsx'
import Versions from '../pages/Versions.jsx'
import Prompts from '../pages/Prompts.jsx'
import Jobs from '../pages/Jobs.jsx'
import Analytics from '../pages/Analytics.jsx'
import Companies from '../pages/Companies.jsx'
import Applied from '../pages/Applied.jsx'
import Recruiters from '../pages/Recruiters.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import AdminRoute from '../components/AdminRoute.jsx'
import MainLayout from '../components/MainLayout.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
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
      {
        path: '/applied',
        element: (
          <ProtectedRoute>
            <Applied />
          </ProtectedRoute>
        ),
      },
      {
        path: '/recruiters',
        element: (
          <ProtectedRoute>
            <Recruiters />
          </ProtectedRoute>
        ),
      },
      {
        path: '/jobs',
        element: (
          <AdminRoute>
            <Jobs />
          </AdminRoute>
        ),
      },
      {
        path: '/analytics',
        element: (
          <AdminRoute>
            <Analytics />
          </AdminRoute>
        ),
      },
      {
        path: '/companies',
        element: (
          <AdminRoute>
            <Companies />
          </AdminRoute>
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
  {
    path: '*',
    element: (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'inherit' }}>
        <h1 style={{ fontSize: 72, fontWeight: 800, color: '#667eea' }}>404</h1>
        <p style={{ fontSize: 20, color: '#888', marginBottom: 32 }}>Page not found</p>
        <a href="/" style={{ color: '#667eea', fontWeight: 600, fontSize: 16 }}>← Back to Home</a>
      </div>
    ),
  },
])
