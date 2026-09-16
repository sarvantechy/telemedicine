export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: 'superadmin' | 'admin' | 'doctor' | 'patient'
  tenant_id: string
}

export interface Doctor {
  id: string
  email: string
  full_name: string
  specialization: string | null
  qualification: string | null
  consultation_fee: number | null
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  patient_name: string | null
  doctor_name: string | null
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  notes: string | null
  meeting_url: string | null
  created_at: string
}

export interface AdminStats {
  total_doctors: number
  total_patients: number
  total_appointments: number
  scheduled_appointments: number
}

export interface User {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

// ── Prescription ──────────────────────────────────────────────────────────────

export interface Medicine {
  name: string
  dose: string
  frequency: string
  duration: string
  notes?: string | null
}

export interface Prescription {
  id: string
  appointment_id: string
  doctor_id: string
  patient_id: string
  patient_name: string | null
  doctor_name: string | null
  diagnosis: string | null
  medicines: Medicine[]
  instructions: string | null
  follow_up_date: string | null
  created_at: string
}

export interface PrescriptionCreate {
  appointment_id: string
  diagnosis: string | null
  medicines: Array<Medicine & { notes: string | null }>
  instructions: string | null
  follow_up_date: string | null
}

// ── Medical Record ────────────────────────────────────────────────────────────

export interface MedicalRecord {
  id: string
  title: string
  record_type: string
  file_name: string | null
  notes: string | null
  download_url: string | null
  created_at: string
}

// ── Availability ──────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration: number
  is_active: boolean
}

export interface Blockout {
  id: string
  blocked_date: string
  reason: string | null
}

export interface TimeSlot {
  time: string
  datetime: string
  available: boolean
}
