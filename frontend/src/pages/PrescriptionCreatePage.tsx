import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, FilePlus2, Plus, Trash2 } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { appointmentsAPI, prescriptionsAPI } from '../api'
import type { Appointment, Medicine, Prescription } from '../types'

const emptyMedicine = (): Medicine => ({
  name: '',
  dose: '',
  frequency: '',
  duration: '',
  notes: '',
})

function errorMessage(error: unknown) {
  if (
    typeof error === 'object' && error !== null &&
    'response' in error && typeof error.response === 'object' && error.response !== null &&
    'data' in error.response && typeof error.response.data === 'object' && error.response.data !== null &&
    'detail' in error.response.data && typeof error.response.data.detail === 'string'
  ) {
    return error.response.data.detail
  }
  return 'Unable to create the prescription. Please try again.'
}

export default function PrescriptionCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const appointmentId = searchParams.get('appointment_id')
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()])
  const [instructions, setInstructions] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')

  useEffect(() => {
    if (!appointmentId) {
      setError('No appointment was selected.')
      setLoading(false)
      return
    }

    appointmentsAPI.list()
      .then((response) => {
        const match = (response.data as Appointment[]).find((item) => item.id === appointmentId)
        if (!match) {
          setError('Appointment not found or it does not belong to you.')
          return
        }
        if (match.status !== 'completed') {
          setError('A prescription can only be written after the appointment is completed.')
          return
        }
        setAppointment(match)
      })
      .catch((requestError) => setError(errorMessage(requestError)))
      .finally(() => setLoading(false))
  }, [appointmentId])

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    setMedicines((current) => current.map((medicine, medicineIndex) =>
      medicineIndex === index ? { ...medicine, [field]: value } : medicine
    ))
  }

  const removeMedicine = (index: number) => {
    setMedicines((current) => current.filter((_, medicineIndex) => medicineIndex !== index))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!appointmentId || !appointment) return

    const normalizedMedicines = medicines.map((medicine) => ({
      name: medicine.name.trim(),
      dose: medicine.dose.trim(),
      frequency: medicine.frequency.trim(),
      duration: medicine.duration.trim(),
      notes: medicine.notes?.trim() || null,
    }))

    if (normalizedMedicines.some((medicine) =>
      !medicine.name || !medicine.dose || !medicine.frequency || !medicine.duration
    )) {
      setError('Complete all required fields for each medicine.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await prescriptionsAPI.create({
        appointment_id: appointmentId,
        diagnosis: diagnosis.trim() || null,
        medicines: normalizedMedicines,
        instructions: instructions.trim() || null,
        follow_up_date: followUpDate || null,
      })
      const prescription = response.data as Prescription
      navigate(`/prescription/${prescription.id}`, { replace: true })
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!appointment) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg py-16 text-center">
          <FilePlus2 size={44} className="mx-auto mb-4 text-base-content/25" />
          <h1 className="text-xl font-bold">Prescription unavailable</h1>
          <p className="mt-2 text-sm text-base-content/60">{error}</p>
          <button onClick={() => navigate('/doctor')} className="btn btn-primary btn-sm mt-6">
            Back to schedule
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <button onClick={() => navigate('/doctor')} className="btn btn-ghost btn-sm gap-2 -ml-2 mb-4">
          <ArrowLeft size={16} /> Back to schedule
        </button>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">New prescription</p>
          <h1 className="mt-1 text-2xl font-bold">Prescription for {appointment.patient_name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-base-content/55">
            <CalendarDays size={14} />
            Appointment completed on {new Date(appointment.scheduled_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div role="alert" className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <section className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-5 md:p-6">
              <label className="form-control w-full">
                <span className="label-text mb-2 font-medium">Diagnosis</span>
                <input
                  value={diagnosis}
                  onChange={(event) => setDiagnosis(event.target.value)}
                  className="input input-bordered w-full"
                  placeholder="e.g. Acute upper respiratory infection"
                  maxLength={500}
                />
              </label>
            </div>
          </section>

          <section className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Medicines</h2>
                  <p className="text-xs text-base-content/50 mt-0.5">Add dosage and usage details for each medicine.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMedicines((current) => [...current, emptyMedicine()])}
                  className="btn btn-outline btn-primary btn-sm gap-1.5 shrink-0"
                >
                  <Plus size={15} /> Add
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {medicines.map((medicine, index) => (
                  <div key={index} className="rounded-lg border border-base-300 bg-base-200/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-base-content/45">
                        Medicine {index + 1}
                      </span>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(index)}
                          className="btn btn-ghost btn-xs text-error"
                          aria-label={`Remove medicine ${index + 1}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        required
                        value={medicine.name}
                        onChange={(event) => updateMedicine(index, 'name', event.target.value)}
                        className="input input-bordered input-sm w-full"
                        placeholder="Medicine name *"
                      />
                      <input
                        required
                        value={medicine.dose}
                        onChange={(event) => updateMedicine(index, 'dose', event.target.value)}
                        className="input input-bordered input-sm w-full"
                        placeholder="Dose, e.g. 500 mg *"
                      />
                      <input
                        required
                        value={medicine.frequency}
                        onChange={(event) => updateMedicine(index, 'frequency', event.target.value)}
                        className="input input-bordered input-sm w-full"
                        placeholder="Frequency, e.g. twice daily *"
                      />
                      <input
                        required
                        value={medicine.duration}
                        onChange={(event) => updateMedicine(index, 'duration', event.target.value)}
                        className="input input-bordered input-sm w-full"
                        placeholder="Duration, e.g. 5 days *"
                      />
                      <input
                        value={medicine.notes ?? ''}
                        onChange={(event) => updateMedicine(index, 'notes', event.target.value)}
                        className="input input-bordered input-sm w-full md:col-span-2"
                        placeholder="Medicine notes, e.g. after food"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body grid grid-cols-1 gap-5 p-5 md:grid-cols-[1fr_220px] md:p-6">
              <label className="form-control w-full">
                <span className="label-text mb-2 font-medium">General instructions</span>
                <textarea
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  className="textarea textarea-bordered min-h-24 w-full"
                  placeholder="Diet, activity, warning signs, or other advice"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-2 font-medium">Follow-up date</span>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(event) => setFollowUpDate(event.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="input input-bordered w-full"
                />
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-3 pb-8">
            <button type="button" onClick={() => navigate('/doctor')} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary gap-2 min-w-40">
              {saving ? <span className="loading loading-spinner loading-sm" /> : <FilePlus2 size={17} />}
              Save prescription
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}