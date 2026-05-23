import React, { useMemo, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, subDays } from 'date-fns'
import { toCSV, downloadCSV } from '../utils/csv'

const COLORS = ['#0ea5a4', '#60a5fa', '#f97316', '#f43f5e', '#a78bfa', '#fb7185']

export default function Reports() {
  const { variableExpenses } = useFinanceStore()
  const [days, setDays] = useState(30)

  const since = subDays(new Date(), days - 1)

  const dailyData = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      map.set(format(d, 'dd/MM'), 0)
    }
    variableExpenses.forEach(v => {
      const d = new Date(v.date)
      if (d >= since) {
        const key = format(d, 'dd/MM')
        map.set(key, (map.get(key) || 0) + v.amount)
      }
    })
    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }))
  }, [variableExpenses, days])

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    variableExpenses.forEach(v => {
      const d = new Date(v.date)
      if (d >= since) {
        map.set(v.category, (map.get(v.category) || 0) + v.amount)
      }
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [variableExpenses, days])

  function handleExport() {
    const rows = variableExpenses
      .filter(v => new Date(v.date) >= since)
      .map(v => ({ date: v.date, title: v.title, category: v.category, amount: v.amount, note: v.note || '' }))
    const csv = toCSV(rows, ['date', 'title', 'category', 'amount', 'note'])
    downloadCSV(`expenses_last_${days}_days.csv`, csv)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Relatórios</h2>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">Período:</label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100">
          <option value={7}>7 dias</option>
          <option value={14}>14 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
        <button onClick={handleExport} className="ml-auto bg-teal-500 text-white px-3 py-1 rounded">Exportar CSV</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="font-medium mb-2">Gastos diários</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={dailyData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#0ea5a4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="font-medium mb-2">Distribuição por categoria</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
