import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Stethoscope, LogOut, Calendar, Users,
  LayoutDashboard, User, Menu, FileText,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  soon?: boolean
}

const ROLE_NAV: Record<string, NavItem[]> = {
  patient: [
    { label: 'My Appointments', icon: Calendar, href: '/patient' },
    { label: 'Find Doctors', icon: Stethoscope, href: '#', soon: true },
    { label: 'Medical Records', icon: FileText, href: '/patient/records' },
  ],
  doctor: [
    { label: 'My Schedule', icon: Calendar, href: '/doctor' },
    { label: 'Availability', icon: Calendar, href: '/doctor/availability' },
    { label: 'Patients', icon: Users, href: '#', soon: true },
    { label: 'My Profile', icon: User, href: '#', soon: true },
  ],
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Manage Users', icon: Users, href: '/admin/users' },
    { label: 'Reports', icon: FileText, href: '#', soon: true },
  ],
  superadmin: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  ],
}

const ROLE_LABEL: Record<string, string> = {
  patient: 'Patient Portal',
  doctor: 'Doctor Portal',
  admin: 'Admin Portal',
  superadmin: 'System Admin',
}

interface Props { children: ReactNode }

export default function DashboardLayout({ children }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role ?? ''
  const navItems = ROLE_NAV[role] ?? []
  const initial = (user?.full_name ?? 'U')[0].toUpperCase()

  return (
    <div className="drawer lg:drawer-open">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />

      {/* ── Main content ── */}
      <div className="drawer-content flex flex-col min-h-screen bg-base-200">
        {/* Mobile top bar */}
        <header className="navbar bg-base-100 shadow-sm lg:hidden sticky top-0 z-30 px-3 gap-2">
          <label htmlFor="main-drawer" className="btn btn-ghost btn-sm btn-square">
            <Menu size={20} />
          </label>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Stethoscope size={13} className="text-primary-content" />
            </div>
            <span className="font-bold text-sm">Telemedicine</span>
          </div>
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-8 text-xs font-bold">
              <span>{initial}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="btm-nav btm-nav-sm lg:hidden bg-base-100 border-t border-base-300 z-20">
          {navItems.filter(i => !i.soon).map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.href)}
              className="text-base-content/50 hover:text-primary transition-colors"
            >
              <item.icon size={20} />
              <span className="btm-nav-label text-xs">{item.label.split(' ')[0]}</span>
            </button>
          ))}
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-base-content/40 hover:text-error transition-colors"
          >
            <LogOut size={20} />
            <span className="btm-nav-label text-xs">Logout</span>
          </button>
        </nav>
      </div>

      {/* ── Sidebar ── */}
      <div className="drawer-side z-40">
        <label htmlFor="main-drawer" aria-label="close sidebar" className="drawer-overlay" />

        <aside className="w-64 min-h-full bg-base-100 border-r border-base-200 flex flex-col">
          {/* Brand */}
          <div className="p-5 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
                <Stethoscope size={18} className="text-primary-content" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Telemedicine</p>
                <p className="text-xs text-base-content/40">4by4softwares</p>
              </div>
            </div>
          </div>

          <div className="px-5 pt-4 pb-1">
            <p className="text-xs font-semibold text-base-content/30 uppercase tracking-wider">
              {ROLE_LABEL[role] ?? role}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-0.5">
            {navItems.map((item) => (
              item.soon ? (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-base-content/25 cursor-default"
                >
                  <item.icon size={17} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-base-200 text-base-content/25">Soon</span>
                </div>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-base-content/70 hover:bg-base-200 hover:text-base-content"
                >
                  <item.icon size={17} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </a>
              )
            ))}
          </nav>

          {/* User + logout */}
          <div className="p-4 border-t border-base-200 space-y-2">
            <div className="flex items-center gap-3 px-1">
              <div className="avatar placeholder shrink-0">
                <div className="bg-primary/15 text-primary rounded-full w-9 text-sm font-bold">
                  <span>{initial}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.full_name}</p>
                <p className="text-xs text-base-content/40 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="btn btn-ghost btn-sm w-full justify-start gap-2 text-error hover:bg-error/10 hover:text-error"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
