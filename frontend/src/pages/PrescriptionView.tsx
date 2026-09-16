import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { prescriptionsAPI } from '../api'
import type { Prescription } from '../types'
import { Printer, ArrowLeft, Stethoscope } from 'lucide-react'

export default function PrescriptionView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [rx, setRx] = useState<Prescription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    prescriptionsAPI.getById(id)
      .then((r) => setRx(r.data))
      .catch(() => setError('Prescription not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  )

  if (error || !rx) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <p className="text-error font-medium">{error || 'Not found'}</p>
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">Go back</button>
    </div>
  )

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Screen toolbar — hidden when printing */}
      <div className="print:hidden navbar bg-base-100 shadow-sm px-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1" />
        <button onClick={() => window.print()} className="btn btn-primary btn-sm gap-2">
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

      {/* Prescription document */}
      <div className="max-w-2xl mx-auto p-6 print:p-0 print:max-w-none">
        {/* Header */}
        <div className="border-b-2 border-primary pb-4 mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center print:hidden">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Medical Prescription</h1>
              <p className="text-sm text-base-content/60">Rx #{rx.id.split('-')[0].toUpperCase()}</p>
            </div>
          </div>
          <div className="text-right text-sm text-base-content/60">
            <p>Date: {fmtDate(rx.created_at)}</p>
            {rx.follow_up_date && (
              <p className="text-warning font-medium">Follow-up: {fmtDate(rx.follow_up_date)}</p>
            )}
          </div>
        </div>

        {/* Doctor & Patient */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-base-200 rounded-lg p-4 print:border print:border-gray-200 print:bg-white">
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-1">Doctor</p>
            <p className="font-bold">{rx.doctor_name}</p>
          </div>
          <div className="bg-base-200 rounded-lg p-4 print:border print:border-gray-200 print:bg-white">
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-1">Patient</p>
            <p className="font-bold">{rx.patient_name}</p>
          </div>
        </div>

        {/* Diagnosis */}
        {rx.diagnosis && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-2">Diagnosis</h2>
            <p className="font-medium">{rx.diagnosis}</p>
          </div>
        )}

        {/* Medicines */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
            Medicines ({rx.medicines.length})
          </h2>
          {rx.medicines.length === 0 ? (
            <p className="text-base-content/40 italic text-sm">No medicines prescribed</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full border border-base-300">
                <thead className="bg-base-200 print:bg-gray-100">
                  <tr>
                    <th className="w-8">#</th>
                    <th>Medicine</th>
                    <th>Dose</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medicines.map((m, i) => (
                    <tr key={i} className="hover">
                      <td className="text-base-content/40">{i + 1}</td>
                      <td className="font-medium">{m.name}</td>
                      <td>{m.dose}</td>
                      <td>{m.frequency}</td>
                      <td>{m.duration}</td>
                      <td className="text-base-content/60 text-xs">{m.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions */}
        {rx.instructions && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-2">
              Instructions
            </h2>
            <p className="text-base-content/80 leading-relaxed">{rx.instructions}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-base-300 pt-4 flex items-center justify-between text-xs text-base-content/40">
          <span>Sundaram Medical Centre · telemedicine.4by4softwares.com</span>
          <span>Generated on {fmtDate(new Date().toISOString())}</span>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { font-size: 12pt; }
        }
      `}</style>
    </>
  )
}
