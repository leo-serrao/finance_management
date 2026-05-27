import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useFinanceStore } from '../store/useFinanceStore'
import { setUserProfile } from '../services/firestore'

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setProfile } = useFinanceStore()

  const [netSalary, setNetSalary] = useState<number>(0)
  const [payDay, setPayDay] = useState<number>(1)
  const [displayName, setDisplayName] = useState<string>(user?.displayName ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const profile = { netSalary, payDay, fixedExpenses: [], displayName: displayName || user?.displayName }
    await setUserProfile(user.uid, profile)
    setProfile({ uid: user.uid, email: user.email ?? undefined, displayName: profile.displayName, ...profile })
    navigate('/')
  }

  return (
    <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Configuração inicial</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <div className="text-sm">Nome exibido</div>
          <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Como aparecerá para outros" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        </label>
        <label className="block">
          <div className="text-sm">Salário líquido mensal</div>
          <input type="number" step="0.01" value={netSalary} onChange={e=>setNetSalary(Number(e.target.value))} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        </label>
        <label className="block">
          <div className="text-sm">Dia do mês que recebe</div>
          <input type="number" min={1} max={31} value={payDay} onChange={e=>setPayDay(Number(e.target.value))} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        </label>
        <button className="w-full bg-teal-500 text-white py-2 rounded">Salvar e continuar</button>
      </form>
    </div>
  )
}
