import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login, googleSignIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erro no login')
    }
  }

  async function handleGoogle() {
    setError(null)
    try {
      if (googleSignIn) {
        await googleSignIn()
        navigate('/')
      } else {
        setError('Login com Google indisponível')
      }
    } catch (err: any) {
      if (err && err.code === 'auth/operation-not-allowed') {
        setError('Login com Google está desabilitado no Firebase. Habilite-o em Console > Authentication > Sign-in method.')
      } else {
        setError(err.message || 'Erro no login com Google')
      }
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Entrar</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full p-2 border rounded" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-teal-500 text-white py-2 rounded">Entrar</button>
      </form>
      <div className="mt-4">
        <button onClick={handleGoogle} className="w-full bg-white dark:bg-gray-700 border py-2 rounded flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M21.805 10.023h-9.78v3.955h5.605c-.243 1.47-1.6 4.31-5.605 4.31-3.37 0-6.12-2.774-6.12-6.19 0-3.416 2.75-6.19 6.12-6.19 1.92 0 3.2.82 3.935 1.52l2.68-2.58C17.82 3.22 15.52 2 12.03 2 6.78 2 2.49 6.27 2.49 11.52s4.29 9.52 9.54 9.52c5.5 0 9.14-3.86 9.14-9.32 0-.63-.07-1.09-.36-1.7z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>
      </div>
      <div className="mt-4 text-sm">
        Não tem conta? <Link to="/register" className="text-teal-600">Criar conta</Link>
      </div>
    </div>
  )
}
