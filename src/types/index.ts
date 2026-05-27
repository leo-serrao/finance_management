export type FixedExpense = {
  id: string
  name: string
  amount: number
  category?: string
}

export type VariableExpense = {
  id: string
  title: string
  amount: number
  category: string
  date: string // ISO
  note?: string
}

export type Profile = {
  uid?: string
  email?: string
  displayName?: string
  netSalary?: number
  payDay?: number
  fixedExpenses?: FixedExpense[]
  savingsPercent?: number
}

export type SavingBox = {
  id: string
  name: string
  amount: number
  createdAt: string // ISO
  emoji?: string
}
