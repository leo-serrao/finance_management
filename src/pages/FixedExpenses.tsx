import React, { useEffect, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import { addFixedExpenseToUser } from '../services/expenses'
import { deleteFixedExpenseFromUser, updateFixedExpenseInUser } from '../services/expenses'
import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'

export default function FixedExpenses() {
  const { fixedExpenses, addFixedExpense } = useFinanceStore()
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [toast, setToast] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null)
  const [editing, setEditing] = useState<any | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || amount <= 0) {
      setToast({ message: 'Preencha nome e valor maior que 0' })
      return
    }
    const item = { id: Date.now().toString(), name: name.trim(), amount }
    addFixedExpense(item as any)
    if (user) await addFixedExpenseToUser(user.uid, item)
    setToast({ message: 'Gasto adicionado' })
    setName('')
    setAmount(0)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Gastos Fixos</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4 items-center">
        <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} className="p-2 h-10 border rounded flex-1 min-w-0 bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        <CurrencyInput value={amount} onChange={setAmount} className="p-2 h-10 border rounded w-full md:w-32 bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        <button className="bg-teal-500 text-white px-4 rounded h-10 flex items-center justify-center">Adicionar</button>
      </form>

      <ul className="space-y-2">
        {fixedExpenses.map(f => (
          <li key={f.id} className="p-3 bg-white dark:bg-gray-800 rounded shadow flex justify-between items-center">
            <div className="min-w-0">
              <div className="font-medium truncate">{f.name}</div>
              <div className="text-sm text-gray-500">{f.category ?? ''}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-semibold">R$ {f.amount.toFixed(2)}</div>
              <button onClick={() => setEditing(f)} className="text-xl md:text-sm text-teal-600 p-2">✎</button>
              <button onClick={async () => {
                if (!user) return
                if (!window.confirm('Confirma excluir este gasto fixo?')) return
                try { await deleteFixedExpenseFromUser(user.uid, f.id); setToast({ message: 'Gasto excluído' }) } catch (err) { console.error(err); setToast({ message: 'Erro ao excluir' }) }
              }} className="text-base md:text-sm text-red-500 p-1">🗑</button>
            </div>
          </li>
        ))}
      </ul>

      {toast && <Toast message={toast.message} onClose={() => setToast(null)} actionLabel={toast.actionLabel} onAction={toast.onAction} />}

      {editing && (
        <Modal title="Editar gasto fixo" onClose={() => setEditing(null)}>
          <EditFixedForm
            item={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); setToast({ message: 'Gasto atualizado' }) }}
          />
        </Modal>
      )}
    </div>
  )
}

function EditFixedForm({ item, onCancel, onSaved }: { item: any; onCancel: () => void; onSaved: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState(item.name || '')
  const [amount, setAmount] = useState<number>(item.amount || 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(item.name || '')
    setAmount(item.amount || 0)
  }, [item])

  async function save() {
    if (!name.trim() || amount <= 0) {
      setError('Nome obrigatório e valor > 0')
      return
    }
    setError(null)
    try {
      if (user) await updateFixedExpenseInUser(user.uid, item.id, { name: name.trim(), amount })
      onSaved()
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar')
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-600">Nome</label>
        <input value={name} onChange={e => setName(e.target.value)} className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
      </div>
      <div>
        <label className="block text-sm text-gray-600">Valor</label>
        <CurrencyInput value={amount} onChange={v => setAmount(v)} className="p-2 border rounded w-full md:w-40 bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">Cancelar</button>
        <button onClick={save} className="px-3 py-1 rounded bg-teal-500 text-white">Salvar</button>
      </div>
    </div>
  )
}
