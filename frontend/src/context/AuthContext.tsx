import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser } from '../types'

interface AuthState {
  user: AuthUser | null
  token: string | null
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('tm_token')
    const raw = localStorage.getItem('tm_user')
    const user = raw ? (JSON.parse(raw) as AuthUser) : null
    return { token, user }
  })

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem('tm_token', token)
    localStorage.setItem('tm_user', JSON.stringify(user))
    setState({ token, user })
  }

  const logout = () => {
    localStorage.removeItem('tm_token')
    localStorage.removeItem('tm_user')
    setState({ token: null, user: null })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
