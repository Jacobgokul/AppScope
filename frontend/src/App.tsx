import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authSlice'
import ErrorBoundary from './components/common/ErrorBoundary'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import { Login, Signup, ForgotPassword, ResetPassword, VerifyEmail } from './pages/auth'
import Dashboard from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'
import Projects from './pages/Projects'
import ProjectSetup from './pages/ProjectSetup'
import Settings from './pages/Settings'
import Metrics from './pages/Metrics'
import Logs from './pages/Logs'
import Analysis from './pages/Analysis'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PrivateRoute>
              <VerifyEmail />
            </PrivateRoute>
          }
        />

        {/* Private routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <Layout>
                <Projects />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/new"
          element={
            <PrivateRoute>
              <Layout>
                <ProjectSetup />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <PrivateRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:projectId/settings"
          element={
            <PrivateRoute>
              <Layout>
                <Settings />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:projectId/metrics"
          element={
            <PrivateRoute>
              <Layout>
                <Metrics />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Layout>
                <Settings />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/metrics"
          element={
            <PrivateRoute>
              <Layout>
                <Metrics />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <PrivateRoute>
              <Layout>
                <Logs />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <PrivateRoute>
              <Layout>
                <Analysis />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  )
}
