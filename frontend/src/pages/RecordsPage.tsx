import { useState, useEffect, useRef, type FormEvent } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { recordsAPI } from '../api'
import type { MedicalRecord } from '../types'
import { Upload, Download, Trash2, FileText, X } from 'lucide-react'

const RECORD_TYPES = [
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'imaging', label: 'Imaging / Scan' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'other', label: 'Other' },
]

const TYPE_BADGE: Record<string, string> = {
  lab_report: 'badge-info',
  prescription: 'badge-success',
  imaging: 'badge-warning',
  vaccination: 'badge-accent',
  other: 'badge-neutral',
}

export default function RecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({ title: '', record_type: 'lab_report', notes: '' })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    recordsAPI.list()
      .then((r) => setRecords(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file && !form.title) { setUploadError('Title is required'); return }
    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('record_type', form.record_type)
      if (form.notes) fd.append('notes', form.notes)
      if (file) fd.append('file', file)
      const res = await recordsAPI.upload(fd)
      setRecords((prev) => [res.data, ...prev])
      setForm({ title: '', record_type: 'lab_report', notes: '' })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setShowUpload(false)
    } catch (err: unknown) {
      setUploadError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed'
      )
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record? This cannot be undone.')) return
    await recordsAPI.delete(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const typeLabel = (v: string) => RECORD_TYPES.find((t) => t.value === v)?.label ?? v

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Medical Records</h1>
          <p className="text-base-content/50 text-sm mt-0.5">Your lab reports, prescriptions, and health documents</p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="btn btn-primary gap-2"
        >
          {showUpload ? <X size={16} /> : <Upload size={16} />}
          {showUpload ? 'Cancel' : 'Upload Record'}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="card bg-base-100 shadow-sm mb-6 border border-primary/20">
          <div className="card-body">
            <h2 className="font-semibold mb-3">Upload New Record</h2>
            <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-control gap-1">
                <label className="label py-0"><span className="label-text font-medium">Title *</span></label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="input input-bordered input-sm"
                  placeholder="e.g. Blood Test – June 2025"
                />
              </div>

              <div className="form-control gap-1">
                <label className="label py-0"><span className="label-text font-medium">Type</span></label>
                <select
                  value={form.record_type}
                  onChange={(e) => setForm((f) => ({ ...f, record_type: e.target.value }))}
                  className="select select-bordered select-sm"
                >
                  {RECORD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-control gap-1 sm:col-span-2">
                <label className="label py-0">
                  <span className="label-text font-medium">File <span className="text-base-content/40">(PDF, JPEG, PNG)</span></span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="file-input file-input-bordered file-input-sm w-full"
                />
              </div>

              <div className="form-control gap-1 sm:col-span-2">
                <label className="label py-0"><span className="label-text font-medium">Notes <span className="text-base-content/40">(optional)</span></span></label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="textarea textarea-bordered textarea-sm"
                  rows={2}
                  placeholder="Additional context…"
                />
              </div>

              {uploadError && <p className="text-error text-sm sm:col-span-2">{uploadError}</p>}

              <div className="sm:col-span-2">
                <button type="submit" disabled={uploading} className="btn btn-primary gap-2">
                  <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Records list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/40 gap-3">
          <FileText size={48} strokeWidth={1} />
          <p className="text-lg font-medium">No records yet</p>
          <p className="text-sm">Upload your first health document above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => (
            <div key={rec.id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{rec.title}</p>
                      <p className="text-xs text-base-content/40 mt-0.5">{fmtDate(rec.created_at)}</p>
                    </div>
                  </div>
                  <span className={`badge badge-sm shrink-0 ${TYPE_BADGE[rec.record_type] ?? 'badge-neutral'}`}>
                    {typeLabel(rec.record_type)}
                  </span>
                </div>

                {rec.file_name && (
                  <p className="text-xs text-base-content/40 truncate">{rec.file_name}</p>
                )}

                {rec.notes && (
                  <p className="text-sm text-base-content/60 leading-snug line-clamp-2">{rec.notes}</p>
                )}

                <div className="flex gap-2 mt-auto pt-2">
                  {rec.download_url ? (
                    <a
                      href={rec.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-ghost flex-1 gap-1.5"
                    >
                      <Download size={14} /> Download
                    </a>
                  ) : (
                    <span className="btn btn-sm btn-ghost flex-1 cursor-not-allowed opacity-40 gap-1.5">
                      <Download size={14} /> No file
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="btn btn-sm btn-ghost text-error"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
