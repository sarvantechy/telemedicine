import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { availabilityAPI } from '../api'
import type { AvailabilitySlot, Blockout } from '../types'
import { Clock, Calendar, Plus, Trash2, ArrowLeft, Save } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface DayForm {
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration: number
  is_active: boolean
}

const DEFAULT_DAY = (dow: number): DayForm => ({
  day_of_week: dow,
  start_time: '09:00',
  end_time: '17:00',
  slot_duration: 30,
  is_active: false,
})

export default function AvailabilityPage() {
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState<DayForm[]>(DAYS.map((_, i) => DEFAULT_DAY(i)))
  const [blockouts, setBlockouts] = useState<Blockout[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [blockForm, setBlockForm] = useState({ blocked_date: '', reason: '' })
  const [blockError, setBlockError] = useState('')

  useEffect(() => {
    Promise.all([availabilityAPI.getMy(), availabilityAPI.listBlockouts()]).then(([a, b]) => {
      const loaded: AvailabilitySlot[] = a.data
      setSchedule(DAYS.map((_, i) => {
        const existing = loaded.find((s) => s.day_of_week === i)
        return existing
          ? { day_of_week: i, start_time: existing.start_time, end_time: existing.end_time, slot_duration: existing.slot_duration, is_active: true }
          : DEFAULT_DAY(i)
      }))
      setBlockouts(b.data)
    })
  }, [])

  const setDay = (i: number, field: keyof DayForm, value: string | number | boolean) =>
    setSchedule((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))

  const saveSchedule = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await availabilityAPI.set(schedule.filter((d) => d.is_active))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const addBlockout = async (e: FormEvent) => {
    e.preventDefault()
    setBlockError('')
    try {
      const res = await availabilityAPI.createBlockout({
        blocked_date: blockForm.blocked_date,
        reason: blockForm.reason || undefined,
      })
      setBlockouts((prev) => [...prev, res.data])
      setBlockForm({ blocked_date: '', reason: '' })
    } catch (err: unknown) {
      setBlockError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed'
      )
    }
  }

  const removeBlockout = async (id: string) => {
    await availabilityAPI.deleteBlockout(id)
    setBlockouts((prev) => prev.filter((b) => b.id !== id))
  }

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/doctor')} className="btn btn-ghost btn-sm btn-square">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">My Availability</h1>
          <p className="text-base-content/50 text-sm mt-0.5">Set your weekly schedule and block-off dates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly schedule */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-base mb-4">
                <Clock size={18} className="text-primary" /> Weekly Schedule
              </h2>
              <form onSubmit={saveSchedule}>
                <div className="space-y-3">
                  {schedule.map((day, i) => (
                    <div key={i} className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-colors ${
                      day.is_active ? 'border-primary/30 bg-primary/5' : 'border-base-300 bg-base-200/50'
                    }`}>
                      {/* Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer w-32">
                        <input
                          type="checkbox"
                          className="toggle toggle-primary toggle-sm"
                          checked={day.is_active}
                          onChange={(e) => setDay(i, 'is_active', e.target.checked)}
                        />
                        <span className={`text-sm font-medium ${day.is_active ? '' : 'text-base-content/40'}`}>
                          {DAYS[i].slice(0, 3)}
                        </span>
                      </label>

                      {day.is_active && (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="time"
                              value={day.start_time}
                              onChange={(e) => setDay(i, 'start_time', e.target.value)}
                              className="input input-sm input-bordered"
                            />
                            <span className="text-base-content/40 text-sm">to</span>
                            <input
                              type="time"
                              value={day.end_time}
                              onChange={(e) => setDay(i, 'end_time', e.target.value)}
                              className="input input-sm input-bordered"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={day.slot_duration}
                              onChange={(e) => setDay(i, 'slot_duration', Number(e.target.value))}
                              className="select select-sm select-bordered"
                            >
                              <option value={15}>15 min</option>
                              <option value={20}>20 min</option>
                              <option value={30}>30 min</option>
                              <option value={45}>45 min</option>
                              <option value={60}>60 min</option>
                            </select>
                            <span className="text-xs text-base-content/40">per slot</span>
                          </div>
                        </>
                      )}

                      {!day.is_active && (
                        <span className="text-xs text-base-content/30 italic">Not available</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button type="submit" disabled={saving} className="btn btn-primary gap-2">
                    <Save size={16} /> {saving ? 'Saving…' : 'Save Schedule'}
                  </button>
                  {saved && <span className="text-success text-sm font-medium">✓ Saved!</span>}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Blockouts */}
        <div className="space-y-4">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-base mb-3">
                <Calendar size={18} className="text-error" /> Block a Date
              </h2>
              <form onSubmit={addBlockout} className="space-y-3">
                <div className="form-control gap-1">
                  <label className="label py-0">
                    <span className="label-text text-sm font-medium">Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={blockForm.blocked_date}
                    onChange={(e) => setBlockForm((f) => ({ ...f, blocked_date: e.target.value }))}
                    className="input input-sm input-bordered w-full"
                  />
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0">
                    <span className="label-text text-sm font-medium">Reason <span className="text-base-content/40">(optional)</span></span>
                  </label>
                  <input
                    type="text"
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
                    className="input input-sm input-bordered w-full"
                    placeholder="e.g. Conference, Leave"
                  />
                </div>
                {blockError && <p className="text-error text-xs">{blockError}</p>}
                <button type="submit" className="btn btn-error btn-sm gap-1.5 w-full">
                  <Plus size={15} /> Block Date
                </button>
              </form>
            </div>
          </div>

          {/* Upcoming blockouts */}
          {blockouts.length > 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="font-semibold text-sm mb-3">Blocked Dates</h3>
                <div className="space-y-2">
                  {blockouts.map((b) => (
                    <div key={b.id} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium">{fmtDate(b.blocked_date)}</p>
                        {b.reason && <p className="text-base-content/50 text-xs">{b.reason}</p>}
                      </div>
                      <button
                        onClick={() => removeBlockout(b.id)}
                        className="btn btn-ghost btn-xs text-error shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
