import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import PatientDashboard from './pages/PatientDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import PrescriptionView from './pages/PrescriptionView'
import AvailabilityPage from './pages/AvailabilityPage'
import RecordsPage from './pages/RecordsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import PrescriptionCreatePage from './pages/PrescriptionCreatePage'
import type { AuthUser } from './types'
import type { ReactNode } from 'react'

function RequireAuth({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireRole({ children, roles }: Readonly<{ children: ReactNode; roles: AuthUser['role'][] }>) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <RoleRouter />
  return <>{children}</>
}

function RoleRouter() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'patient') return <Navigate to="/patient" replace />
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />
  return <Navigate to="/admin" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRouter />} />
          <Route
            path="/patient"
            element={<RequireRole roles={['patient']}><PatientDashboard /></RequireRole>}
          />
          <Route
            path="/doctor"
            element={<RequireRole roles={['doctor']}><DoctorDashboard /></RequireRole>}
          />
          <Route
            path="/admin"
            element={<RequireRole roles={['admin', 'superadmin']}><AdminDashboard /></RequireRole>}
          />
          <Route
            path="/prescription/new"
            element={<RequireRole roles={['doctor']}><PrescriptionCreatePage /></RequireRole>}
          />
          <Route
            path="/prescription/:id"
            element={<RequireAuth><PrescriptionView /></RequireAuth>}
          />
          <Route
            path="/doctor/availability"
            element={<RequireRole roles={['doctor']}><AvailabilityPage /></RequireRole>}
          />
          <Route
            path="/patient/records"
            element={<RequireRole roles={['patient']}><RecordsPage /></RequireRole>}
          />
          <Route
            path="/admin/users"
            element={<RequireRole roles={['admin', 'superadmin']}><AdminUsersPage /></RequireRole>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
