import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register as registerService } from '../services/auth'
import { setUserProfile } from '../services/firestore'
import { useFinanceStore } from '../store/useFinanceStore'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setProfile } = useFinanceStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) return setError('Senhas não conferem')
    try {
      const cred = await registerService(email, password)
      const uid = cred.user.uid
      const profile = { netSalary: 0, payDay: 1, fixedExpenses: [] }
      await setUserProfile(uid, profile)
      setProfile({ uid, email, ...profile })
      navigate('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Erro no cadastro')
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Criar conta</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full p-2 border rounded" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} />
        <input type="password" className="w-full p-2 border rounded" placeholder="Confirmar senha" value={confirm} onChange={e=>setConfirm(e.target.value)} />
        <button className="w-full bg-teal-500 text-white py-2 rounded">Criar conta</button>
      </form>
    </div>
  )
}
