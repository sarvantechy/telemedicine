import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Plus, Clock, User, Stethoscope, FileText } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { appointmentsAPI, usersAPI, prescriptionsAPI } from '../api'
import type { Appointment, Doctor } from '../types'
import { useAuth } from '../context/AuthContext'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
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

export default function PatientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [rxMap, setRxMap] = useState<Record<string, string>>({}) // appointmentId → rxId
  const [bookForm, setBookForm] = useState({ doctor_id: '', scheduled_at: '', notes: '', meeting_url: '' })
  const [bookError, setBookError] = useState('')
  const modalRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    Promise.all([appointmentsAPI.list(), usersAPI.listDoctors()])
      .then(([a, d]) => { setAppointments(a.data); setDoctors(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const openBook = () => {
    setBookError('')
    setBookForm({ doctor_id: '', scheduled_at: '', notes: '', meeting_url: '' })
    modalRef.current?.showModal()
  }

  const bookAppointment = async (e: FormEvent) => {
    e.preventDefault()
    setBookError('')
    try {
      await appointmentsAPI.book({
        doctor_id: bookForm.doctor_id,
        scheduled_at: new Date(bookForm.scheduled_at).toISOString(),
        notes: bookForm.notes || undefined,
        meeting_url: bookForm.meeting_url || undefined,
      })
      const res = await appointmentsAPI.list()
      setAppointments(res.data)
      modalRef.current?.close()
    } catch (err: unknown) {
      setBookError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Booking failed'
      )
    }
  }

  const cancel = async (id: string) => {
    await appointmentsAPI.update(id, { status: 'cancelled' })
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)))
  }

  const upcoming = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
  const past = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled')
  const nextAppt = upcoming[0] ?? null

  // Load prescription IDs for completed past appointments
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
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{greeting()}, {user?.full_name?.split(' ')[0]}! 👋</h1>
          <p className="text-base-content/50 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={openBook} className="btn btn-primary gap-2">
          <Plus size={18} /> Book Appointment
        </button>
      </div>

      {/* Next appointment hero card */}
      {nextAppt && (
        <div className="card bg-primary text-primary-content shadow-lg mb-6">
          <div className="card-body py-5 px-6">
            <p className="text-primary-content/70 text-sm font-medium mb-1">Next Appointment</p>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Dr. {nextAppt.doctor_name}</h2>
                <p className="flex items-center gap-1.5 mt-1 text-primary-content/80">
                  <Clock size={14} /> {fmt(nextAppt.scheduled_at)} · {nextAppt.duration_minutes} min
                </p>
                {nextAppt.notes && <p className="text-primary-content/60 text-sm mt-1">{nextAppt.notes}</p>}
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                <span className={`badge ${STATUS_BADGE[nextAppt.status]} badge-lg`}>{nextAppt.status}</span>
                {nextAppt.meeting_url && (
                  <a href={nextAppt.meeting_url} target="_blank" rel="noreferrer"
                    className="btn btn-sm bg-white/20 border-white/30 text-white hover:bg-white/30">
                    Join Meeting →
                  </a>
                )}
                {nextAppt.status === 'scheduled' && (
                  <button onClick={() => cancel(nextAppt.id)}
                    className="btn btn-sm btn-ghost text-primary-content/60">Cancel</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 px-4 text-center">
            <div className="text-2xl font-bold text-primary">{appointments.length}</div>
            <div className="text-xs text-base-content/50 font-medium">Total</div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 px-4 text-center">
            <div className="text-2xl font-bold text-warning">{upcoming.length}</div>
            <div className="text-xs text-base-content/50 font-medium">Upcoming</div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 px-4 text-center">
            <div className="text-2xl font-bold text-success">
              {appointments.filter(a => a.status === 'completed').length}
            </div>
            <div className="text-xs text-base-content/50 font-medium">Completed</div>
          </div>
        </div>
      </div>

      {/* Two-column: appointments + doctors sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: appointment list takes 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {upcoming.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
                Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((a) => (
                  <div key={a.id} className="card bg-base-100 shadow-sm border border-base-300">
                    <div className="card-body py-4 px-5 flex-row items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                        <User size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold">Dr. {a.doctor_name}</span>
                          <span className={`badge badge-sm ${STATUS_BADGE[a.status]}`}>{a.status}</span>
                        </div>
                        <p className="text-sm text-base-content/60 flex items-center gap-1.5">
                          <Clock size={13} /> {fmt(a.scheduled_at)} · {a.duration_minutes} min
                        </p>
                        {a.notes && <p className="text-xs text-base-content/50 mt-1">{a.notes}</p>}
                        {a.meeting_url && (
                          <a href={a.meeting_url} target="_blank" rel="noreferrer"
                            className="link link-primary text-xs mt-1 inline-block">
                            Join Meeting →
                          </a>
                        )}
                      </div>
                      {a.status === 'scheduled' && (
                        <button onClick={() => cancel(a.id)} className="btn btn-ghost btn-sm text-error">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
                Past Appointments
              </h2>
              <div className="card bg-base-100 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {past.map((a) => (
                        <tr key={a.id} className="hover">
                          <td className="font-medium">Dr. {a.doctor_name}</td>
                          <td className="text-base-content/60">{fmt(a.scheduled_at)}</td>
                          <td><span className={`badge badge-sm ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                          <td>
                            {a.status === 'completed' && rxMap[a.id] && (
                              <button
                                onClick={() => navigate(`/prescription/${rxMap[a.id]}`)}
                                className="btn btn-xs btn-ghost text-primary gap-1"
                              >
                                <FileText size={12} /> Prescription
                              </button>
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

          {appointments.length === 0 && (
            <div className="text-center py-16 text-base-content/40">
              <Calendar size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No appointments yet</p>
              <p className="text-sm mb-4">Book your first appointment with a doctor</p>
              <button onClick={openBook} className="btn btn-primary btn-sm">Book Now</button>
            </div>
          )}
        </div>

        {/* Doctors sidebar */}
        <div>
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
            Available Doctors
          </h2>
          <div className="space-y-3">
            {doctors.map((d) => (
              <div key={d.id} className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body py-4 px-4 gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                      <Stethoscope size={16} className="text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">Dr. {d.full_name}</p>
                      {d.specialization && (
                        <p className="text-xs text-base-content/50">{d.specialization}</p>
                      )}
                      {d.consultation_fee != null && (
                        <p className="text-xs font-semibold text-primary mt-0.5">₹{d.consultation_fee}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBookForm(f => ({ ...f, doctor_id: d.id }))
                      setBookError('')
                      modalRef.current?.showModal()
                    }}
                    className="btn btn-primary btn-xs btn-outline"
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
            {doctors.length === 0 && (
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body py-6 text-center text-base-content/40 text-sm">
                  No doctors available
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Book Appointment Modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-lg mb-4">Book Appointment</h3>
          <form onSubmit={bookAppointment} className="space-y-3">
            <div className="form-control gap-1">
              <label className="label py-0"><span className="label-text font-medium">Doctor</span></label>
              <select
                required
                value={bookForm.doctor_id}
                onChange={(e) => setBookForm((f) => ({ ...f, doctor_id: e.target.value }))}
                className="select select-bordered w-full"
              >
                <option value="">Select a doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.full_name}{d.specialization ? ` — ${d.specialization}` : ''}
                    {d.consultation_fee ? ` (₹${d.consultation_fee})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control gap-1">
              <label className="label py-0"><span className="label-text font-medium">Date & Time</span></label>
              <input
                type="datetime-local"
                required
                value={bookForm.scheduled_at}
                onChange={(e) => setBookForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control gap-1">
              <label className="label py-0"><span className="label-text font-medium">Notes <span className="text-base-content/40">(optional)</span></span></label>
              <textarea
                rows={2}
                value={bookForm.notes}
                onChange={(e) => setBookForm((f) => ({ ...f, notes: e.target.value }))}
                className="textarea textarea-bordered resize-none"
                placeholder="Describe your symptoms…"
              />
            </div>

            <div className="form-control gap-1">
              <label className="label py-0"><span className="label-text font-medium">Meeting URL <span className="text-base-content/40">(optional)</span></span></label>
              <input
                type="url"
                value={bookForm.meeting_url}
                onChange={(e) => setBookForm((f) => ({ ...f, meeting_url: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="https://meet.google.com/…"
              />
            </div>

            {bookError && (
              <div role="alert" className="alert alert-error py-2.5">
                <span className="text-sm">{bookError}</span>
              </div>
            )}

            <div className="modal-action mt-4">
              <button type="button" className="btn btn-ghost" onClick={() => modalRef.current?.close()}>Cancel</button>
              <button type="submit" className="btn btn-primary">Book</button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </DashboardLayout>
  )
}

