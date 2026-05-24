import React, { useMemo, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { addVariableExpenseToUser } from '../services/expenses'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useFinanceStore } from '../store/useFinanceStore'
import { format } from 'date-fns'
import { calculate50_30_20, computeSmartDailyProjection } from '../utils/finance'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Home() {
  const { profile, fixedExpenses, variableExpenses, addVariableExpense } = useFinanceStore()
  const { user } = useAuth()

  const netSalary = profile?.netSalary ?? 0
  const payDay = profile?.payDay ?? 1

  const savingsPercent = profile?.savingsPercent ?? 0.2
  const allocations = useMemo(() => calculate50_30_20(netSalary, fixedExpenses, savingsPercent), [netSalary, fixedExpenses, savingsPercent])
  const proj = useMemo(() => computeSmartDailyProjection(netSalary, fixedExpenses, variableExpenses, payDay, savingsPercent), [netSalary, fixedExpenses, variableExpenses, payDay, savingsPercent])

  // prepare chart data: sum variable expenses per day for last 14 days
  const chartData = useMemo(() => {
    const days = 14
    const today = new Date()
    const map = new Map<string, number>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      map.set(key, 0)
    }
    variableExpenses.forEach(v => {
      const d = new Date(v.date).toISOString().slice(0, 10)
      if (map.has(d)) {
        map.set(d, (map.get(d) || 0) + v.amount)
      }
    })
    return Array.from(map.entries()).map(([date, amount]) => ({ date: format(new Date(date), 'dd/MM'), amount }))
  }, [variableExpenses])

  // highlight today's card when a new expense for today is added
  const [highlight, setHighlight] = useState(false)
  const prevTodaySpent = useRef(0)
  const todayKey = new Date().toISOString().slice(0,10)
  const todaySpent = variableExpenses.filter(v => new Date(v.date).toISOString().slice(0,10) === todayKey).reduce((s, v) => s + v.amount, 0)

  useEffect(() => {
    if (todaySpent > prevTodaySpent.current) {
      setHighlight(true)
      const t = setTimeout(() => setHighlight(false), 1200)
      return () => clearTimeout(t)
    }
    prevTodaySpent.current = todaySpent
  }, [todaySpent])

  // modal for quick add
  const [openAdd, setOpenAdd] = useState(false)
  const todayISO = new Date().toISOString().slice(0,10)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState<number>(0)
  const [newDate, setNewDate] = useState<string>(todayISO)
  const [newCategory, setNewCategory] = useState('outros')
  const [toast, setToast] = useState<string | null>(null)

  async function handleQuickAdd(e?: React.FormEvent) {
    e?.preventDefault()
    const item = { id: Date.now().toString(), title: newTitle, amount: newAmount, category: newCategory, date: new Date(newDate).toISOString() }
    addVariableExpense(item as any)
    try {
      if (user) await addVariableExpenseToUser(user.uid, item)
      setToast('Gasto adicionado')
    } catch (err) {
      console.error(err)
      setToast('Erro ao salvar gasto')
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
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-500">Saldo recomendado para guardar</div>
          <div className="text-2xl font-semibold">R$ {allocations.savings.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-500">Gasto diário disponível</div>
          <div className="text-2xl font-semibold">R$ {proj.todayBudget.toFixed(2)}</div>
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
          <div className="mt-3 text-lg font-semibold">Total restante: R$ {proj.totalRemaining.toFixed(2)}</div>
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
