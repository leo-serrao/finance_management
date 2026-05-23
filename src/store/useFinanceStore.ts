import { create } from 'zustand'
import { Profile, VariableExpense, FixedExpense } from '../types'

type State = {
  profile?: Profile | null
  variableExpenses: VariableExpense[]
  fixedExpenses: FixedExpense[]
  setProfile: (p: Profile | null) => void
  setFixedExpenses: (f: FixedExpense[]) => void
  setVariableExpenses: (v: VariableExpense[]) => void
  addVariableExpense: (e: VariableExpense) => void
  addFixedExpense: (e: FixedExpense) => void
}

export const useFinanceStore = create<State>((set) => ({
  profile: null,
  variableExpenses: [],
  fixedExpenses: [],
  setProfile: (p) => set((s) => ({
    profile: p,
    fixedExpenses: p && (p as any).fixedExpenses !== undefined ? (p as any).fixedExpenses : s.fixedExpenses,
    variableExpenses: p && (p as any).variableExpenses !== undefined ? (p as any).variableExpenses : s.variableExpenses,
  })),
  setFixedExpenses: (f) => set({ fixedExpenses: f }),
  setVariableExpenses: (v) => set({ variableExpenses: v }),
  addVariableExpense: (e) => set((s) => ({ variableExpenses: [...s.variableExpenses, e] })),
  addFixedExpense: (e) => set((s) => ({ fixedExpenses: [...s.fixedExpenses, e] }))
}))
