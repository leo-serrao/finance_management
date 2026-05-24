import React, { useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import { addVariableExpenseToUser, deleteVariableExpenseFromUser, updateVariableExpenseInUser } from '../services/expenses'
import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'

export default function VariableExpenses() {
  const { variableExpenses, addVariableExpense } = useFinanceStore()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const todayISO = new Date().toISOString().slice(0,10)
  const [date, setDate] = useState<string>(todayISO)
  const [category, setCategory] = useState('outros')
  const [toast, setToast] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || amount <= 0) {
      setToast('Preencha título e valor maior que 0')
      return
    }
    const item = { id: Date.now().toString(), title: title.trim(), amount, category, date: new Date(date).toISOString() }
    addVariableExpense(item as any)
    try {
      if (user) await addVariableExpenseToUser(user.uid, item)
      setToast('Gasto adicionado')
    } catch (err) {
      setToast('Erro ao salvar gasto')
    }
    setTitle('')
    setAmount(0)
    setDate(todayISO)
  }

  async function handleDelete(id: string) {
    if (!user) return
    if (!window.confirm('Confirma excluir este gasto variável?')) return
    try {
      await deleteVariableExpenseFromUser(user.uid, id)
      setToast('Gasto excluído')
    } catch (err) {
      console.error(err)
      setToast('Erro ao excluir')
    }
  }

  function openEdit(item: any) {
    setEditing({ ...item, date: item.date ? new Date(item.date).toISOString().slice(0,10) : todayISO })
  }

  async function saveEdit() {
    if (!user || !editing) return
    try {
      const upd = { title: editing.title, amount: editing.amount, category: editing.category, date: new Date(editing.date).toISOString() }
      await updateVariableExpenseInUser(user.uid, editing.id, upd)
      setEditing(null)
      setToast('Gasto atualizado')
    } catch (err) {
      console.error(err)
      setToast('Erro ao atualizar')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Gastos Variáveis</h2>
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4 items-center">
        <input placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} className="p-2 h-10 border rounded flex-1 min-w-0 bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        <CurrencyInput value={amount} onChange={setAmount} className="p-2 h-10 border rounded w-full md:w-32 bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="p-2 h-10 border rounded w-full md:w-40 bg-white dark:bg-gray-700 text-black dark:text-gray-100 appearance-none box-border text-left leading-6 max-w-full" />
        <select value={category} onChange={e=>setCategory(e.target.value)} className="p-2 h-10 border rounded w-full md:w-40 bg-white dark:bg-gray-700 text-black dark:text-gray-100">
          <option value="alimentacao">Alimentação</option>
          <option value="transporte">Transporte</option>
          <option value="lazer">Lazer</option>
          <option value="compras">Compras</option>
          <option value="saude">Saúde</option>
          <option value="outros">Outros</option>
        </select>
        <button className="bg-teal-500 text-white px-4 rounded h-10 flex items-center justify-center">Adicionar</button>
      </form>

      <ul className="space-y-2">
        {variableExpenses.map(v => (
          <li key={v.id} className="p-3 bg-white dark:bg-gray-800 rounded shadow flex justify-between items-center">
            <div className="min-w-0">
              <div className="min-w-0 flex items-center gap-2">
                  <div className="font-medium truncate">{v.title}</div>
                  <div className="text-sm text-gray-500">{new Date(v.date).toLocaleDateString()}</div>
              </div>
              <div className="text-sm text-gray-500">{v.category.charAt(0).toUpperCase() + v.category.slice(1)}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-semibold">R$ {v.amount.toFixed(2)}</div>
              <button onClick={() => openEdit(v)} className="text-xl md:text-sm text-teal-600 p-2">✎</button>
              <button onClick={() => handleDelete(v.id)} className="text-base md:text-sm text-red-500 p-1">🗑</button>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title="Editar gasto variável" onClose={() => setEditing(null)}>
          <form onSubmit={(e)=>{ e.preventDefault(); saveEdit() }} className="space-y-2">
            <input value={editing.title} onChange={e=>setEditing({...editing, title: e.target.value})} className="w-full p-2 h-10 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
            <CurrencyInput value={editing.amount} onChange={(v)=>setEditing({...editing, amount: v})} className="w-full p-2 h-10 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
            <input type="date" value={editing.date} onChange={e=>setEditing({...editing, date: e.target.value})} className="w-full p-2 h-10 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100 appearance-none box-border text-left leading-6 max-w-full" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={()=>setEditing(null)} className="px-3 py-1 rounded border">Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-teal-500 text-white">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
      <Toast message={toast ?? undefined} onClose={() => setToast(null)} />
    </div>
  )
}
