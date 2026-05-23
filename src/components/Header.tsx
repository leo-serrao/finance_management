import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="p-4 border-b bg-white/60 dark:bg-gray-800/60">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-lg font-semibold">Finance Manager</h1>

        {/* Desktop nav */}
        <nav className="hidden md:flex space-x-4 items-center">
          <Link to="/">Dashboard</Link>
          <Link to="/fixed">Fixos</Link>
          <Link to="/variable">Variáveis</Link>
          <Link to="/reports">Relatórios</Link>
          <button onClick={toggle} aria-label="Toggle theme" className="px-2 py-1 rounded border">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          {!user ? (
            <Link to="/login">Login</Link>
          ) : (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
              <Link to="/settings" className="ml-2 text-sm text-gray-600 dark:text-gray-300">Configurações</Link>
              <button onClick={handleLogout} className="ml-2 bg-red-500 text-white px-3 py-1 rounded">Sair</button>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button onClick={toggle} aria-label="Toggle theme" className="px-2 py-1 rounded border">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <button onClick={() => setOpen(v => !v)} aria-label="Open menu" className="p-2 rounded border">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={open ? 'M6 18L18 6M6 6l12 12' : 'M3 12h18M3 6h18M3 18h18'} /></svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden mt-2 border-t bg-white dark:bg-gray-800/90">
          <div className="container mx-auto p-3 space-y-2">
            <Link to="/" onClick={() => setOpen(false)} className="block">Dashboard</Link>
            <Link to="/fixed" onClick={() => setOpen(false)} className="block">Fixos</Link>
            <Link to="/variable" onClick={() => setOpen(false)} className="block">Variáveis</Link>
            <Link to="/reports" onClick={() => setOpen(false)} className="block">Relatórios</Link>
            {!user ? (
              <Link to="/login" onClick={() => setOpen(false)} className="block">Login</Link>
            ) : (
              <>
                <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
                <Link to="/settings" onClick={() => setOpen(false)} className="block">Configurações</Link>
                <button onClick={() => { setOpen(false); handleLogout() }} className="w-full text-left bg-red-500 text-white px-3 py-1 rounded">Sair</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
