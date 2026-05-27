import React, { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFinanceStore } from '../store/useFinanceStore'
import { useTheme } from '../contexts/ThemeContext'

export default function Header() {
  const { user, logout } = useAuth()
  const { profile } = useFinanceStore()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const location = useLocation()
  const financeActive =
    location.pathname.startsWith('/fixed') ||
    location.pathname.startsWith('/variable') ||
    location.pathname.startsWith('/boxes')

  const [open, setOpen] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm transition ${
      isActive
        ? 'bg-teal-500 text-white'
        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`

  return (
    <header
      className="
        sticky top-0 z-40
        border-b border-gray-200/50 dark:border-gray-700/50
        bg-white/70 dark:bg-gray-900/70
        backdrop-blur-xl
      "
    >
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-8">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold">
              $
            </div>

            <div>
              <div className="font-semibold leading-tight text-sm sm:text-base">
                Finance Manager
              </div>

              <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">
                Controle financeiro
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">

            <NavLink to="/" className={navClass}>
              Dashboard
            </NavLink>

            {/* Finance dropdown */}
            <div className="relative">
              <button
                onClick={() => setFinanceOpen(v => !v)}
                className={`
                  px-3 py-2 rounded-lg text-sm transition
                  flex items-center gap-1
                  ${
                    financeActive
                      ? 'bg-teal-500 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                Finanças
                <span className="text-xs">▼</span>
              </button>

              {financeOpen && (
                <div
                  className="
                    absolute top-12 left-0 w-52
                    rounded-xl border
                    border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900
                    shadow-xl overflow-hidden
                  "
                >
                  <NavLink
                    to="/fixed"
                    onClick={() => setFinanceOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-3 text-sm transition ${
                        isActive
                          ? 'bg-teal-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    Gastos Fixos
                  </NavLink>

                  <NavLink
                    to="/variable"
                    onClick={() => setFinanceOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-3 text-sm transition ${
                        isActive
                          ? 'bg-teal-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    Gastos Variáveis
                  </NavLink>

                  <NavLink
                    to="/boxes"
                    onClick={() => setFinanceOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-3 text-sm transition ${
                        isActive
                          ? 'bg-teal-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    Caixinhas
                  </NavLink>
                </div>
              )}
            </div>

            <NavLink to="/shared" className={navClass}>
              Compartilhados
            </NavLink>

            <NavLink to="/reports" className={navClass}>
              Relatórios
            </NavLink>

          </nav>
        </div>

        {/* RIGHT */}
        <div className="hidden md:flex items-center gap-3">

          {/* Theme */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="
              w-10 h-10 rounded-xl border
              border-gray-200 dark:border-gray-700
              flex items-center justify-center
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition
            "
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {!user ? (
            <Link
              to="/login"
              className="
                px-4 py-2 rounded-xl
                bg-teal-500 text-white text-sm
                hover:bg-teal-600 transition
              "
            >
              Login
            </Link>
          ) : (
            <div className="relative">

              <button
                onClick={() => setProfileOpen(v => !v)}
                className="
                  flex items-center gap-3
                  px-3 py-2 rounded-xl
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  transition
                "
              >
                <div
                  className="
                    w-9 h-9 rounded-full
                    bg-teal-500 text-white
                    flex items-center justify-center
                    font-semibold text-sm
                  "
                >
                  {(profile?.displayName ?? user.email ?? 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="text-left">
                  <div className="text-sm font-medium leading-tight">
                    {profile?.displayName ?? 'Usuário'}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </div>
                </div>

                <span className="text-xs">▼</span>
              </button>

              {profileOpen && (
                <div
                  className="
                    absolute right-0 top-14 w-60
                    rounded-xl border
                    border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900
                    shadow-xl overflow-hidden
                  "
                >
                  <NavLink
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="
                      block px-4 py-3 text-sm
                      hover:bg-gray-100 dark:hover:bg-gray-800
                    "
                  >
                    Configurações
                  </NavLink>

                  <button
                    onClick={handleLogout}
                    className="
                      w-full text-left
                      px-4 py-3 text-sm text-red-500
                      hover:bg-red-50 dark:hover:bg-red-950/30
                    "
                  >
                    Sair
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-10 h-10 flex items-center justify-center rounded border"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Open menu"
            className="w-10 h-10 flex items-center justify-center rounded border"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d={open
                  ? 'M6 18L18 6M6 6l12 12'
                  : 'M3 12h18M3 6h18M3 18h18'}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden border-t bg-white dark:bg-gray-900 shadow-lg">
          <div className="p-4 space-y-2">
      
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Dashboard
            </Link>

            <Link
              to="/fixed"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Fixos
            </Link>

            <Link
              to="/boxes"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Caixinhas
            </Link>

            <Link
              to="/shared"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Compartilhados
            </Link>

            <Link
              to="/variable"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
            Variáveis
          </Link>

            <Link
              to="/reports"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Relatórios
            </Link>

            {!user ? (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-4 py-3 bg-teal-500 text-white"
              >
                Login
              </Link>
            ) : (
              <>
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">

                  <Link
                    to="/settings"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    Configurações
                  </Link>

                  <div className="px-2 pt-3 text-sm text-gray-500 break-all">
                    {profile?.displayName ?? user.email}
                  </div>

                  <button
                    onClick={() => {
                      setOpen(false)
                      handleLogout()
                    }}
                    className="mt-3 w-full rounded-lg bg-red-500 py-3 font-medium text-white hover:bg-red-600 transition"
                  >
                    Sair
                  </button>

                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
