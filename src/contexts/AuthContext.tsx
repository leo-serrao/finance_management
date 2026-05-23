import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '../services/firebase'
import * as authService from '../services/auth'
import { getUserProfile, setUserProfile } from '../services/firestore'
import { useFinanceStore } from '../store/useFinanceStore'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

type AuthContextValue = {
  user: FirebaseUser | null
  loading: boolean
  register: (email: string, password: string) => Promise<any>
  login: (email: string, password: string) => Promise<any>
  googleSignIn?: () => Promise<any>
  logout: () => Promise<any>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { setProfile, setFixedExpenses, setVariableExpenses } = useFinanceStore()

  useEffect(() => {
    let unsubFixed: (() => void) | null = null
    let unsubVariable: (() => void) | null = null

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const profile = await getUserProfile(u.uid)
        if (profile) setProfile({ uid: u.uid, email: u.email ?? undefined, ...(profile as any) })

        // real-time listeners for expenses
        const fixedCol = collection(db, 'users', u.uid, 'fixedExpenses')
        const variableCol = collection(db, 'users', u.uid, 'variableExpenses')

        unsubFixed = onSnapshot(fixedCol, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          setFixedExpenses(items as any)
        })

        unsubVariable = onSnapshot(variableCol, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          setVariableExpenses(items as any)
        })
      } else {
        setProfile(null as any)
        if (unsubFixed) unsubFixed()
        if (unsubVariable) unsubVariable()
      }
      setLoading(false)
    })

    return () => {
      unsub()
      if (unsubFixed) unsubFixed()
      if (unsubVariable) unsubVariable()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, register: authService.register, login: authService.login, googleSignIn: authService.signInWithGoogle, logout: authService.logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
