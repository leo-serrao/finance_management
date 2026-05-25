import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import FixedExpenses from './pages/FixedExpenses'
import VariableExpenses from './pages/VariableExpenses'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Boxes from './pages/Boxes'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Header from './components/Header'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Header />

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/fixed" element={<ProtectedRoute><FixedExpenses /></ProtectedRoute>} />
            <Route path="/variable" element={<ProtectedRoute><VariableExpenses /></ProtectedRoute>} />
            <Route path="/boxes" element={<ProtectedRoute><Boxes /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
