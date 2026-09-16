import axios from 'axios'
import type { PrescriptionCreate } from './types'

const http = axios.create()

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('tm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tm_token')
      localStorage.removeItem('tm_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: (tenant_slug: string, email: string, password: string) =>
    http.post('/api/auth/login', { tenant_slug, email, password }),
  setup: (email: string, full_name: string, password: string) =>
    http.post('/api/auth/setup', { email, full_name, password }),
}

export const usersAPI = {
  me: () => http.get('/api/users/me'),
  list: (role?: string) => http.get('/api/users', { params: role ? { role } : {} }),
  listDoctors: () => http.get('/api/users/doctors'),
  create: (data: { email: string; full_name: string; role: string; password: string }) =>
    http.post('/api/users', data),
  adminStats: () => http.get('/api/users/admin/stats'),
}

export const appointmentsAPI = {
  list: () => http.get('/api/appointments'),
  book: (data: {
    doctor_id: string
    scheduled_at: string
    duration_minutes?: number
    notes?: string
    meeting_url?: string
  }) => http.post('/api/appointments', data),
  update: (id: string, data: { status?: string; notes?: string; meeting_url?: string }) =>
    http.patch(`/api/appointments/${id}`, data),
}

export const prescriptionsAPI = {
  create: (data: PrescriptionCreate) => http.post('/api/prescriptions/', data),
  getByAppointment: (appointmentId: string) => http.get(`/api/prescriptions/appointment/${appointmentId}`),
  getMy: () => http.get('/api/prescriptions/my'),
  getById: (id: string) => http.get(`/api/prescriptions/${id}`),
}

export const recordsAPI = {
  upload: (formData: FormData) =>
    http.post('/api/records/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => http.get('/api/records/'),
  delete: (id: string) => http.delete(`/api/records/${id}`),
}

export const availabilityAPI = {
  getMy: () => http.get('/api/availability/my'),
  set: (slots: object[]) => http.put('/api/availability/', slots),
  getSlots: (doctorId: string, date: string) =>
    http.get(`/api/availability/${doctorId}/slots`, { params: { date } }),
  createBlockout: (data: object) => http.post('/api/availability/blockout', data),
  listBlockouts: () => http.get('/api/availability/blockouts'),
  deleteBlockout: (id: string) => http.delete(`/api/availability/blockout/${id}`),
}
