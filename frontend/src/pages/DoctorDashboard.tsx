import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, CheckCircle, User, FileText, Calendar } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { appointmentsAPI, prescriptionsAPI } from '../api'
import type { Appointment } from '../types'
import { useAuth } from '../context/AuthContext'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function isToday(iso: string) {
  const d = new Date(iso), n = new Date()
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'badge-warning',
  confirmed: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-error',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function DoctorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const doctorFirstName = user?.full_name
    ?.replace(/^dr\.?\s+/i, '')
    .split(/\s+/)[0] || 'Doctor'
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  // map appointmentId → prescriptionId for completed appts
  const [rxMap, setRxMap] = useState<Record<string, string>>({})

  useEffect(() => {
    appointmentsAPI.list()
      .then((r) => setAppointments(r.data))
      .finally(() => setLoading(false))
  }, [])

  // Load prescriptions for completed appointments
  useEffect(() => {
    const completedAppts = appointments.filter((a) => a.status === 'completed')
    if (!completedAppts.length) return
    Promise.allSettled(
      completedAppts.map((a) =>
        prescriptionsAPI.getByAppointment(a.id)
          .then((r) => r.data?.id ? { apptId: a.id, rxId: r.data.id as string } : null)
          .catch(() => null)
      )
    ).then((results) => {
      const map: Record<string, string> = {}
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          map[res.value.apptId] = res.value.rxId
        }
      })
      setRxMap(map)
    })
  }, [appointments])

  const updateStatus = async (id: string, status: string) => {
    await appointmentsAPI.update(id, { status })
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: status as Appointment['status'] } : a))
    )
  }

  const upcoming = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
  const todayAppts = upcoming.filter((a) => isToday(a.scheduled_at))
  const futureAppts = upcoming.filter((a) => !isToday(a.scheduled_at))
  const completed = appointments.filter((a) => a.status === 'completed')
  const cancelled = appointments.filter((a) => a.status === 'cancelled')

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center items-center py-32">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{greeting()}, Dr. {doctorFirstName}! 🩺</h1>
        <p className="text-base-content/50 text-sm mt-0.5">
          {todayAppts.length > 0
            ? `You have ${todayAppts.length} patient${todayAppts.length !== 1 ? 's' : ''} today`
            : 'No patients scheduled for today'}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 px-4 text-center">
            <div className="text-2xl font-bold text-warning">{todayAppts.length}</div>
            <div className="text-xs text-base-content/50 font-medium">Today</div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 px-4 text-center">
            <div className="text-2xl font-bold text-info">{upcoming.length}</div>
            <div className="text-xs text-base-content/50 font-medium">Upcoming</div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 px-4 text-center">
            <div className="text-2xl font-bold text-success">{completed.length}</div>
            <div className="text-xs text-base-content/50 font-medium">Completed</div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 px-4 text-center">
            <div className="text-2xl font-bold">{appointments.length}</div>
            <div className="text-xs text-base-content/50 font-medium">Total</div>
          </div>
        </div>
      </div>

      {/* Today's patients */}
      {todayAppts.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
            Today's Patients
          </h2>
          <div className="space-y-3">
            {todayAppts.map((a) => (
              <ApptCard key={a.id} appt={a} onUpdate={updateStatus} />
            ))}
          </div>
        </section>
      )}

      {/* Future upcoming */}
      {futureAppts.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
            Upcoming
          </h2>
          <div className="space-y-3">
            {futureAppts.map((a) => (
              <ApptCard key={a.id} appt={a} onUpdate={updateStatus} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && (
        <div className="text-center py-12 text-base-content/40 mb-6">
          <CheckCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">All clear!</p>
          <p className="text-sm">No upcoming appointments.</p>
        </div>
      )}

      {/* Availability shortcut */}
      <div className="flex justify-end mb-4 -mt-2">
        <button
          onClick={() => navigate('/doctor/availability')}
          className="btn btn-outline btn-sm gap-2"
        >
          <Calendar size={15} /> Manage Availability
        </button>
      </div>

      {/* History */}
      {(completed.length > 0 || cancelled.length > 0) && (
        <section>
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
            History
          </h2>
          <div className="card bg-base-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead>
                  <tr><th>Patient</th><th>Date & Time</th><th>Duration</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {[...completed, ...cancelled].map((a) => (
                    <tr key={a.id} className="hover">
                      <td className="font-medium">{a.patient_name}</td>
                      <td className="text-base-content/60">{fmt(a.scheduled_at)}</td>
                      <td className="text-base-content/60">{a.duration_minutes} min</td>
                      <td><span className={`badge badge-sm ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                      <td>
                        {a.status === 'completed' && (
                          rxMap[a.id] ? (
                            <button
                              onClick={() => navigate(`/prescription/${rxMap[a.id]}`)}
                              className="btn btn-xs btn-ghost text-success gap-1"
                            >
                              <FileText size={12} /> View Rx
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/prescription/new?appointment_id=${a.id}`)}
                              className="btn btn-xs btn-ghost text-primary gap-1"
                            >
                              <FileText size={12} /> Write Rx
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </DashboardLayout>
  )
}

function ApptCard({ appt: a, onUpdate }: { appt: Appointment; onUpdate: (id: string, s: string) => void }) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body py-4 px-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center shrink-0">
            <User size={18} className="text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold">{a.patient_name}</span>
              <span className={`badge badge-sm ${STATUS_BADGE[a.status]}`}>{a.status}</span>
            </div>
            <p className="text-sm text-base-content/60 flex items-center gap-1.5">
              <Clock size={13} /> {fmt(a.scheduled_at)} · {a.duration_minutes} min
            </p>
            {a.notes && <p className="text-xs text-base-content/50 mt-1 italic">{a.notes}</p>}
            {a.meeting_url && (
              <a href={a.meeting_url} target="_blank" rel="noreferrer"
                className="link link-primary text-xs mt-1 inline-block">Join Meeting →</a>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {a.status === 'scheduled' && (
              <button onClick={() => onUpdate(a.id, 'confirmed')} className="btn btn-info btn-sm btn-outline">Confirm</button>
            )}
            <button onClick={() => onUpdate(a.id, 'completed')} className="btn btn-success btn-sm btn-outline">Complete</button>
            <button onClick={() => onUpdate(a.id, 'cancelled')} className="btn btn-ghost btn-sm text-error">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

