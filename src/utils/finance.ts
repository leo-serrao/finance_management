import { differenceInCalendarDays, addMonths, subMonths, lastDayOfMonth } from 'date-fns'
import { FixedExpense, VariableExpense } from '../types'

export type Allocations = {
  needs: number
  wants: number
  savings: number
  totalFixed: number
  availableForVariables: number
}

export function calculate50_30_20(netSalary: number, fixedExpenses: FixedExpense[] = [], savingsPercent: number = 0.2): Allocations {
  const baseSavings = netSalary * savingsPercent
  // keep needs:wants ratio at 50:30 relative weights
  const needsWeight = 0.5
  const wantsWeight = 0.3
  const totalWeight = needsWeight + wantsWeight
  const remaining = netSalary - baseSavings
  const baseNeeds = remaining * (needsWeight / totalWeight)
  const baseWants = remaining * (wantsWeight / totalWeight)

  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0)

  let needs = baseNeeds
  let wants = baseWants
  let savings = baseSavings

  // fixed expenses consume the needs bucket first
  const remainingNeeds = needs - totalFixed
  if (remainingNeeds >= 0) {
    needs = Math.max(0, remainingNeeds)
  } else {
    // fixed > needs: consume wants then savings proportionally
    let deficit = -remainingNeeds
    wants = Math.max(0, wants - deficit)
    if (wants === 0 && deficit > baseWants) {
      deficit = deficit - baseWants
      savings = Math.max(0, savings - deficit)
    }
    needs = 0
  }

  const availableForVariables = Math.max(0, needs + wants)

  return {
    needs,
    wants,
    savings,
    totalFixed,
    availableForVariables
  }
}

export function getNextPayDate(from: Date, payDay: number): Date {
  const year = from.getFullYear()
  const month = from.getMonth()
  const day = from.getDate()

  let candidate = new Date(year, month, payDay)
  if (day > payDay) {
    // next month
    candidate = new Date(year, month + 1, payDay)
  }

  // if payDay exceeds month length, use last day of month
  const last = lastDayOfMonth(candidate)
  if (payDay > last.getDate()) {
    return last
  }
  return candidate
}

export function daysUntil(next: Date, from: Date = new Date()): number {
  const diff = differenceInCalendarDays(next, from)
  return Math.max(0, diff)
}

export type DailyProjection = {
  date: string
  budget: number
}

export function computeDailyProjection(
  netSalary: number,
  fixedExpenses: FixedExpense[],
  variableExpenses: VariableExpense[],
  payDay: number,
  savingsPercent: number = 0.2,
  today: Date = new Date()
): { todayBudget: number; daysRemaining: number; totalRemaining: number; projection: DailyProjection[] } {
  const allocations = calculate50_30_20(netSalary, fixedExpenses)
  // note: calculate50_30_20 accepts savingsPercent as third param; pass through
  const allocations2 = calculate50_30_20(netSalary, fixedExpenses, savingsPercent)
  const nextPay = getNextPayDate(today, payDay)
  const daysLeft = daysUntil(nextPay, today) + 1 // include today

  // compute total spent so far in this pay period (from previous pay date exclusive)
  const prevPay = new Date(nextPay)
  prevPay.setMonth(nextPay.getMonth() - 1)

  const spentSoFar = variableExpenses
    .filter((v) => new Date(v.date) >= prevPay && new Date(v.date) < today)
    .reduce((s, v) => s + v.amount, 0)

  const totalAvailable = allocations2.availableForVariables

  const totalRemaining = Math.max(0, totalAvailable - spentSoFar)

  const todayBudget = daysLeft > 0 ? totalRemaining / daysLeft : 0

  const projection: DailyProjection[] = []
  for (let i = 0; i < daysLeft; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    projection.push({ date: d.toISOString().slice(0, 10), budget: Math.round((totalRemaining / daysLeft) * 100) / 100 })
  }

  return { todayBudget: Math.round(todayBudget * 100) / 100, daysRemaining: daysLeft, totalRemaining: Math.round(totalRemaining * 100) / 100, projection }
}

export function computeSmartDailyProjection(
  netSalary: number,
  fixedExpenses: FixedExpense[],
  variableExpenses: VariableExpense[],
  payDay: number,
  savingsPercent: number = 0.2,
  today: Date = new Date()
): { todayBudget: number; daysRemaining: number; totalRemaining: number; projection: DailyProjection[] } {
  const allocations = calculate50_30_20(netSalary, fixedExpenses, savingsPercent)
  const nextPay = getNextPayDate(today, payDay)
  const daysLeft = daysUntil(nextPay, today) + 1 // include today

  const prevPay = new Date(nextPay)
  prevPay.setMonth(nextPay.getMonth() - 1)

  // group spent per day within period
  const spentByDay = new Map<string, number>()
  variableExpenses.forEach(v => {
    const d = new Date(v.date)
    if (d >= prevPay && d <= nextPay) {
      const key = d.toISOString().slice(0, 10)
      spentByDay.set(key, (spentByDay.get(key) || 0) + v.amount)
    }
  })

  const spentSoFar = Array.from(spentByDay.entries())
    .filter(([date]) => new Date(date) <= today)
    .reduce((s, [, amt]) => s + amt, 0)

  const totalAvailable = allocations.availableForVariables
  const totalRemaining = Math.max(0, totalAvailable - spentSoFar)

  const daysRemaining = daysLeft
  const baseline = daysRemaining > 0 ? totalRemaining / daysRemaining : 0

  const projection: DailyProjection[] = []
  const todayKey = today.toISOString().slice(0, 10)

  // today's spend
  const todaySpend = spentByDay.get(todayKey) || 0

  const futureDays = Math.max(0, daysRemaining - 1)

  if (daysRemaining === 0) {
    return { todayBudget: 0, daysRemaining: 0, totalRemaining: 0, projection: [] }
  }

  // Calculate today's budget considering today's spend
  let todayBudget = Math.max(0, baseline - todaySpend)

  // If today underspent, redistribute surplus to future days; if overspent, reduce future budgets
  if (todaySpend < baseline) {
    const surplus = baseline - todaySpend
    const futureBudget = futureDays > 0 ? baseline + surplus / futureDays : 0
    projection.push({ date: todayKey, budget: Math.round(todayBudget * 100) / 100 })
    for (let i = 1; i < daysRemaining; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      projection.push({ date: d.toISOString().slice(0, 10), budget: Math.round(futureBudget * 100) / 100 })
    }
    return { todayBudget: Math.round(todayBudget * 100) / 100, daysRemaining, totalRemaining: Math.round(totalRemaining * 100) / 100, projection }
  }

  if (todaySpend > baseline) {
    const deficit = todaySpend - baseline
    const futureBudgetRaw = futureDays > 0 ? Math.max(0, baseline - deficit / futureDays) : 0
    projection.push({ date: todayKey, budget: Math.round(Math.max(0, baseline - todaySpend) * 100) / 100 })
    for (let i = 1; i < daysRemaining; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      projection.push({ date: d.toISOString().slice(0, 10), budget: Math.round(futureBudgetRaw * 100) / 100 })
    }
    return { todayBudget: Math.round(Math.max(0, baseline - todaySpend) * 100) / 100, daysRemaining, totalRemaining: Math.round(totalRemaining * 100) / 100, projection }
  }

  // equal spend
  for (let i = 0; i < daysRemaining; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    projection.push({ date: d.toISOString().slice(0, 10), budget: Math.round(baseline * 100) / 100 })
  }

  return { todayBudget: Math.round(baseline * 100) / 100, daysRemaining, totalRemaining: Math.round(totalRemaining * 100) / 100, projection }
}
