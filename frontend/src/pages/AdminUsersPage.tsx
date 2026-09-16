import { useState, useEffect, useRef, type FormEvent } from 'react'
import { UserPlus, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { usersAPI } from '../api'
import type { User, AdminStats } from '../types'

const ROLES = ['patient', 'doctor', 'admin']

const ROLE_BADGE: Record<string, string> = {
  patient: 'badge-info',
  doctor: 'badge-success',
  admin: 'badge-warning',
  superadmin: 'badge-error',
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'patient', password: '' })
  const [createError, setCreateError] = useState('')
  const modalRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    Promise.all([usersAPI.list(), usersAPI.adminStats()])
      .then(([u, s]) => { setUsers(u.data); setStats(s.data) })
      .finally(() => setLoading(false))
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const createUser = async (e: FormEvent) => {
    e.preventDefault()
    setCreateError('')
    try {
      const res = await usersAPI.create(form)
      setUsers((prev) => [res.data, ...prev])
      if (stats) {
        const s = { ...stats }
        if (form.role === 'doctor') s.total_doctors++
        if (form.role === 'patient') s.total_patients++
        setStats(s)
      }
      modalRef.current?.close()
      setForm({ email: '', full_name: '', role: 'patient', password: '' })
    } catch (err: unknown) {
      setCreateError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to create user'
      )
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="btn btn-ghost btn-sm btn-square">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Manage Users</h1>
          <p className="text-base-content/50 text-sm mt-0.5">
            {stats ? `${stats.total_doctors} doctors · ${stats.total_patients} patients` : ''}
          </p>
        </div>
        <button
          onClick={() => { setCreateError(''); modalRef.current?.showModal() }}
          className="btn btn-primary gap-1.5"
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <div className="card bg-base-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover">
                    <td className="font-medium">{u.full_name}</td>
                    <td className="text-base-content/60">{u.email}</td>
                    <td>
                      <span className={`badge badge-sm ${ROLE_BADGE[u.role] ?? 'badge-ghost'}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`badge badge-sm ${u.is_active ? 'badge-success badge-outline' : 'badge-error badge-outline'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-base-content/50 text-sm">
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-base-content/40">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-lg mb-4">Add User</h3>
          <form onSubmit={createUser} className="space-y-3">
            <div className="form-control gap-1">
              <label className="label py-0" htmlFor="new-name">
                <span className="label-text font-medium">Full Name</span>
              </label>
              <input id="new-name" type="text" required value={form.full_name} onChange={set('full_name')}
                className="input input-bordered w-full" />
            </div>
            <div className="form-control gap-1">
              <label className="label py-0" htmlFor="new-email">
                <span className="label-text font-medium">Email</span>
              </label>
              <input id="new-email" type="email" required value={form.email} onChange={set('email')}
                className="input input-bordered w-full" />
            </div>
            <div className="form-control gap-1">
              <label className="label py-0" htmlFor="new-role">
                <span className="label-text font-medium">Role</span>
              </label>
              <select id="new-role" value={form.role} onChange={set('role')} className="select select-bordered w-full">
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-control gap-1">
              <label className="label py-0" htmlFor="new-password">
                <span className="label-text font-medium">Password</span>
              </label>
              <input id="new-password" type="password" required minLength={8} value={form.password} onChange={set('password')}
                className="input input-bordered w-full" placeholder="Min. 8 characters" />
            </div>
            {createError && (
              <div role="alert" className="alert alert-error py-2.5">
                <span className="text-sm">{createError}</span>
              </div>
            )}
            <div className="modal-action mt-2">
              <button type="button" className="btn btn-ghost"
                onClick={() => { modalRef.current?.close(); setCreateError('') }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">Create User</button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </DashboardLayout>
  )
}
