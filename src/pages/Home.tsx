import React, { useMemo, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { addVariableExpenseToUser } from '../services/expenses'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useFinanceStore } from '../store/useFinanceStore'
import { format } from 'date-fns'
import { calculate50_30_20, computeSmartDailyProjection } from '../utils/finance'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getLocalISODate, getLocalISODateFromDate } from '../utils/date'
import { subscribeToUserSharedAdjustments } from '../services/sharedUserAdjustments'
import { subscribeToUserDebtSettlements } from '../services/userDebtSettlements'

export default function Home() {
  const { profile, fixedExpenses, variableExpenses, addVariableExpense, savingBoxes } = useFinanceStore()
  const navigate = useNavigate()
  const { user } = useAuth()

  // debug logs removed

  const netSalary = profile?.netSalary ?? 0
  const payDay = profile?.payDay ?? 1

  const savingsPercent = profile?.savingsPercent ?? 0.2
  const allocations = useMemo(() => calculate50_30_20(netSalary, fixedExpenses, savingsPercent), [netSalary, fixedExpenses, savingsPercent])
  const [sharedAdjustments, setSharedAdjustments] = useState<{ id: string; date: string; amount: number; groupId?: string; expenseId?: string; isPayer?: boolean }[]>([])
  const [sharedPayments, setSharedPayments] = useState<any[]>([])

  const mergedVariableExpenses = useMemo(() => {
    const adjustmentsAsVars = (sharedAdjustments || []).map(a => ({ id: a.id, title: 'Compartilhado', amount: a.amount, category: 'shared', date: a.date }))
    // merge arrays; do not mutate original
    return [...variableExpenses, ...adjustmentsAsVars]
  }, [variableExpenses, sharedAdjustments])

  const proj = useMemo(() => computeSmartDailyProjection(netSalary, fixedExpenses, mergedVariableExpenses, payDay, savingsPercent), [netSalary, fixedExpenses, mergedVariableExpenses, payDay, savingsPercent])
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  // Shared summary for current month
  const sharedSummary = useMemo(() => {
    if (!sharedAdjustments || sharedAdjustments.length === 0) return { total: 0, youOwe: 0, owedToYou: 0 }
    const today = new Date()
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const filtered = sharedAdjustments.filter(a => a.date.startsWith(monthKey))
    const total = filtered.reduce((s, a) => s + Math.abs(a.amount), 0)
    const youOweGross = filtered.filter(a => !a.isPayer).reduce((s, a) => s + Math.abs(a.amount), 0)
    const owedToYouGross = filtered.filter(a => a.isPayer).reduce((s, a) => s + Math.abs(a.amount), 0)
    // consider payments recorded this month
    const paymentsThisMonth = (sharedPayments || []).filter(p => p.createdAt && p.createdAt.startsWith(monthKey))
    const paidByMe = paymentsThisMonth.filter(p => p.fromUserId === user?.uid).reduce((s, p) => s + (p.amount || 0), 0)
    const receivedByMe = paymentsThisMonth.filter(p => p.toUserId === user?.uid).reduce((s, p) => s + (p.amount || 0), 0)
    const youOweGrossAfterPayments = Math.max(0, youOweGross - paidByMe)
    const owedToYouGrossAfterPayments = Math.max(0, owedToYouGross - receivedByMe)
    // compute net amounts after payments
    const net = Math.round((youOweGrossAfterPayments - owedToYouGrossAfterPayments) * 100) / 100
    const youOwe = net > 0 ? net : 0
    const owedToYou = net < 0 ? -net : 0
    return { total: Math.round(total * 100) / 100, youOwe, owedToYou, youOweGross: Math.round(youOweGrossAfterPayments*100)/100, owedToYouGross: Math.round(owedToYouGrossAfterPayments*100)/100 }
  }, [sharedAdjustments, sharedPayments, user])

  // prepare chart data: sum variable expenses per day for last 14 days
  const chartData = useMemo(() => {
    const days = 14
    const today = new Date()
    const map = new Map<string, number>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = getLocalISODateFromDate(d)
      map.set(key, 0)
    }
    // include shared adjustments in the chart (use mergedVariableExpenses)
    mergedVariableExpenses.forEach(v => {
      const key = v.date.split('T')[0]
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + v.amount)
      }
    })
    return Array.from(map.entries()).map(([date, amount]) => {
      const [year, month, day] = date.split('-')

      return {
        date: `${day}/${month}`,
        amount
      }
    })
  }, [variableExpenses])

  // highlight today's card when a new expense for today is added
  const [highlight, setHighlight] = useState(false)
  const prevTodaySpent = useRef(0)
  const todayKey = getLocalISODate()
  const todaySpent = mergedVariableExpenses
    .filter(v => v.date.split('T')[0] === todayKey)
    .reduce((s, v) => s + v.amount, 0)

  useEffect(() => {
    if (todaySpent > prevTodaySpent.current) {
      setHighlight(true)
      const t = setTimeout(() => setHighlight(false), 1200)
      return () => clearTimeout(t)
    }
    prevTodaySpent.current = todaySpent
  }, [todaySpent])

  useEffect(() => {
    let unsub1: (()=>void) | null = null
    let unsub2: (()=>void) | null = null
    if (user) {
      unsub1 = subscribeToUserSharedAdjustments(user.uid, (adj) => {
        setSharedAdjustments(adj)
      }, (err) => console.error('shared adjustments error', err))
      unsub2 = subscribeToUserDebtSettlements(user.uid, (items) => {
        setSharedPayments(items)
      }, (err) => console.error('shared payments error', err))
    }
    return () => { if (unsub1) unsub1(); if (unsub2) unsub2() }
  }, [user])

  // modal for quick add
  const [openAdd, setOpenAdd] = useState(false)
  const todayISO = getLocalISODate()
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState<number>(0)
  const [newDate, setNewDate] = useState<string>(todayISO)
  const [newCategory, setNewCategory] = useState('outros')
  const [toast, setToast] = useState<{ message: string; variant?: 'success'|'error'|'warning'|'info' } | null>(null)

  async function handleQuickAdd(e?: React.FormEvent) {
    e?.preventDefault()
    const item = { id: Date.now().toString(), title: newTitle, amount: newAmount, category: newCategory, date: newDate }
    addVariableExpense(item as any)
    try {
      if (user) await addVariableExpenseToUser(user.uid, item)
      setToast({ message: 'Gasto adicionado', variant: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao salvar gasto', variant: 'error' })
    }
    setNewTitle('')
    setNewAmount(0)
    setNewDate(todayISO)
    setNewCategory('outros')
    setOpenAdd(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div>
          <button onClick={() => setOpenAdd(true)} className="bg-teal-500 text-white px-3 py-1 rounded">+ Novo gasto</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col items-start">
          <div className="text-sm text-gray-500">Saldo recomendado para guardar</div>
          <div className="text-2xl font-semibold">R$ {allocations.savings.toFixed(2)}</div>
          {savingBoxes && savingBoxes.length > 0 && (
            <button
              onClick={() => navigate('/boxes')}
              aria-label="Ver caixinhas"
              className="mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center gap-2 cursor-pointer group hover:underline hover:underline-offset-2"
              style={{ textDecorationSkipInk: 'auto' }}
            >
              <span className="text-left">R$ {savingBoxes.reduce((s, b) => s + b.amount, 0).toFixed(2)} distribuídos em caixinhas</span>
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 4.21a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06L10.44 10 7.21 6.27a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-500">Gastos compartilhados (mês)</div>
          <div className="text-2xl font-semibold">{currency.format(sharedSummary.total)}</div>
          <div className="text-sm text-gray-500 mt-2">Você deve: {currency.format(sharedSummary.youOwe)}</div>
          <div className="text-sm text-gray-500">Devem para você: {currency.format(sharedSummary.owedToYou)}</div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-500">Gasto diário disponível</div>
          <div className={`text-2xl font-semibold ${proj.todayBudget < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{currency.format(proj.todayBudget)}</div>
          <div className={`text-sm mt-2 ${proj.tomorrowBudget > proj.todayBudget ? 'text-emerald-600 dark:text-emerald-400' : proj.tomorrowBudget < proj.todayBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-300'}`}>
            Amanhã: {currency.format(proj.tomorrowBudget)}
            <span className="ml-2 text-xs">{proj.tomorrowBudget > proj.todayBudget ? '↑ você gastou menos hoje' : proj.tomorrowBudget < proj.todayBudget ? '↓ hoje você extrapolou o orçamento' : 'mesmo que hoje'}</span>
          </div>
        </div>
        <div className={"p-4 bg-white dark:bg-gray-800 rounded-lg shadow " + (highlight ? 'today-highlight' : '')}>
          <div className="text-sm text-gray-500">Gasto feito hoje</div>
          <div className="text-2xl font-semibold">R$ {todaySpent.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-500">Dias até pagamento</div>
          <div className="text-2xl font-semibold">{proj.daysRemaining}</div>
        </div>
      </div>

      {openAdd && (
        <Modal title="Adicionar gasto variável" onClose={() => setOpenAdd(false)}>
          <form onSubmit={(e)=>handleQuickAdd(e)} className="space-y-2">
            <input placeholder="Título" value={newTitle} onChange={e=>setNewTitle(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
            <CurrencyInput value={newAmount} onChange={setNewAmount} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
            <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} className="w-full p-2 h-10 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100 appearance-none box-border text-left leading-6 max-w-full" />
            <select value={newCategory} onChange={e=>setNewCategory(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100">
              <option value="alimentacao">Alimentação</option>
              <option value="transporte">Transporte</option>
              <option value="lazer">Lazer</option>
              <option value="compras">Compras</option>
              <option value="saude">Saúde</option>
              <option value="outros">Outros</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={()=>setOpenAdd(false)} className="px-3 py-1 rounded border">Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-teal-500 text-white">Adicionar</button>
            </div>
          </form>
        </Modal>
      )}

      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow order-1 md:order-2">
          <h3 className="font-medium mb-2">Resumo</h3>
          <div className="text-sm text-gray-500">Gastos fixos: R$ {allocations.totalFixed.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Disponível para variáveis: R$ {allocations.availableForVariables.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Gastos variáveis totais: R$ {proj.totalVariableSpent.toFixed(2)}</div>
          <div className={`mt-3 text-lg font-semibold ${proj.totalRemaining < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>Total restante: {currency.format(proj.totalRemaining)}</div>
        </div>

        <div className="md:col-span-2 p-4 bg-white dark:bg-gray-800 rounded shadow order-2 md:order-1">
          <h3 className="font-medium mb-2">Gastos (14 dias)</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#0ea5a4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      <Toast message={toast ?? undefined} onClose={() => setToast(null)} />
    </div>
  )
}
