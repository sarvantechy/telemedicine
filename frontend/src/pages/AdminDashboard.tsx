import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Stethoscope, Activity, UserPlus, ArrowRight } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { usersAPI } from '../api'
import type { AdminStats } from '../types'
import { useAuth } from '../context/AuthContext'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    usersAPI.adminStats().then((r) => setStats(r.data))
  }, [])

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{greeting()}, {user?.full_name?.split(' ')[0]}! 👋</h1>
        <p className="text-base-content/50 text-sm mt-0.5">Here's an overview of your clinic</p>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base-content/50 text-sm font-medium">Doctors</span>
                <div className="w-9 h-9 bg-success/10 rounded-lg flex items-center justify-center">
                  <Stethoscope size={18} className="text-success" />
                </div>
              </div>
              <div className="text-3xl font-bold text-success">{stats.total_doctors}</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base-content/50 text-sm font-medium">Patients</span>
                <div className="w-9 h-9 bg-info/10 rounded-lg flex items-center justify-center">
                  <Users size={18} className="text-info" />
                </div>
              </div>
              <div className="text-3xl font-bold text-info">{stats.total_patients}</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base-content/50 text-sm font-medium">Appointments</span>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar size={18} className="text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold">{stats.total_appointments}</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base-content/50 text-sm font-medium">Scheduled</span>
                <div className="w-9 h-9 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Activity size={18} className="text-warning" />
                </div>
              </div>
              <div className="text-3xl font-bold text-warning">{stats.scheduled_appointments}</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick action cards */}
      <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow text-left"
        >
          <div className="card-body p-5 flex-row items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <UserPlus size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Manage Users</p>
              <p className="text-sm text-base-content/50">Add doctors, patients and admins</p>
            </div>
            <ArrowRight size={16} className="text-base-content/30" />
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/users')}
          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow text-left"
        >
          <div className="card-body p-5 flex-row items-center gap-4">
            <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center shrink-0">
              <Users size={20} className="text-info" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">View All Users</p>
              <p className="text-sm text-base-content/50">Browse and manage user accounts</p>
            </div>
            <ArrowRight size={16} className="text-base-content/30" />
          </div>
        </button>
      </div>
    </DashboardLayout>
  )
}
