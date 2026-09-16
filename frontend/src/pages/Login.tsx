import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api'
import type { AuthUser } from '../types'

const DEMO_CREDENTIALS = [
  { role: 'Admin',   slug: 'demo-clinic', email: 'admin@demo.com',  password: 'admin123'   },
  { role: 'Doctor',  slug: 'demo-clinic', email: 'sarah@demo.com',  password: 'doctor123'  },
  { role: 'Patient', slug: 'demo-clinic', email: 'alice@demo.com',  password: 'patient123' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ tenant_slug: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const fillDemo = (cred: (typeof DEMO_CREDENTIALS)[0]) => {
    setForm({ tenant_slug: cred.slug, email: cred.email, password: cred.password })
    setError('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.login(form.tenant_slug, form.email, form.password)
      const data = res.data
      const user: AuthUser = {
        id: '',
        email: form.email,
        full_name: data.full_name,
        role: data.role,
        tenant_id: data.tenant_id,
      }
      login(data.access_token, user)
      navigate('/')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-5">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 bg-primary rounded-2xl items-center justify-center shadow-lg">
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Telemedicine Platform</h1>
          <p className="text-base-content/50 text-sm">Sign in to your clinic portal</p>
        </div>

        {/* Form card */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body gap-4">
            <form onSubmit={submit} className="space-y-3">
              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text font-medium">Clinic ID</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. demo-clinic"
                  value={form.tenant_slug}
                  onChange={set('tenant_slug')}
                  required
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text font-medium">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text font-medium">Password</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                  className="input input-bordered w-full"
                />
              </div>

              {error && (
                <div role="alert" className="alert alert-error py-2.5">
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-1"
              >
                {loading && <span className="loading loading-spinner loading-sm" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 px-5 gap-3">
            <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
              Demo Credentials — click to fill
            </p>
            <div className="space-y-2">
              {DEMO_CREDENTIALS.map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => fillDemo(c)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-base-300 hover:bg-base-200 transition-colors text-left"
                >
                  <div>
                    <span className="text-sm font-medium">{c.role}</span>
                    <span className="text-xs text-base-content/50 block">{c.email}</span>
                  </div>
                  <span className="badge badge-ghost badge-sm">{c.slug}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-base-content/30">
          © {new Date().getFullYear()} 4by4softwares
        </p>
      </div>
    </div>
  )
}
