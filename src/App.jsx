import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AppShell } from './AppShell'
import LoginPage from '@/pages/Login'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ProspectsPage from '@/pages/prospects/ProspectsPage'
import ClientsPage from '@/pages/clients/ClientsPage'
import ClientDetailPage from '@/pages/clients/ClientDetailPage'
import FeedbackPage from '@/pages/feedback/FeedbackPage'
import RevenuePage from '@/pages/revenue/RevenuePage'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <span className="text-sm font-medium tracking-wide text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading, accessDenied } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <span className="text-sm font-medium tracking-wide text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage accessDenied={accessDenied} />}
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="prospects" element={<ProspectsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:userId" element={<ClientDetailPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="revenue" element={<RevenuePage />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
