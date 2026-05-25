import React, { useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import { setUserProfile } from '../services/firestore'
import { deleteFixedExpenseFromUser, addFixedExpenseToUser, updateFixedExpenseInUser } from '../services/expenses'
import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

export default function Settings() {
  const { profile, fixedExpenses, addFixedExpense, setProfile } = useFinanceStore()
  const { user } = useAuth()
  const [netSalary, setNetSalary] = useState<number>(profile?.netSalary ?? 0)
  const [payDay, setPayDay] = useState<number>(profile?.payDay ?? 1)
  const [savingsPct, setSavingsPct] = useState<number>((profile?.savingsPercent ?? 0.2) * 100)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [addError, setAddError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant?: 'success'|'error'|'warning'|'info'; actionLabel?: string; onAction?: () => void } | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name?: string } | null>(null)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const data = { netSalary, payDay, savingsPercent: (savingsPct ?? 20) / 100 }
    try {
      await setUserProfile(user.uid, data)
      // update local store immediately so UI reflects changes without reload
      setProfile({ uid: user.uid, email: user.email ?? undefined, ...data } as any)
      setToast({ message: 'Perfil salvo', variant: 'success' })
    } catch (err) {
      console.error('Failed to save profile', err)
      setToast({ message: 'Erro ao salvar perfil', variant: 'error' })
    }
  }

  async function handleAddFixed(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!name.trim() || amount <= 0) {
      setAddError('Nome obrigatório e valor deve ser maior que 0')
      return
    }
    setAddError(null)
    const item = { name: name.trim(), amount, category: '' }
    try {
      await addFixedExpenseToUser(user.uid, item)
      // store will be updated via onSnapshot listener
    } catch (err) {
      console.error('Failed to add fixed expense', err)
    }
    setName('')
    setAmount(0)
  }

  function handleDeleteFixed(id: string) {
    const found = fixedExpenses.find(f => f.id === id)
    if (!found) return
    setConfirmDelete({ id: id, name: found.name })
  }

  async function confirmDeleteFixed(id: string) {
    if (!user) return
    const found = fixedExpenses.find(f => f.id === id)
    if (!found) return
    try {
      await deleteFixedExpenseFromUser(user.uid, id)
      // allow undo
          setToast({ message: 'Gasto fixo excluído', variant: 'success', actionLabel: 'Desfazer', onAction: async () => {
        try {
          await addFixedExpenseToUser(user.uid, { name: found.name, amount: found.amount, category: found.category })
          setToast({ message: 'Exclusão desfeita', variant: 'success' })
        } catch (err) { console.error(err) }
      }})
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao excluir', variant: 'error' })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Configurações / Perfil</h2>

      <form onSubmit={handleSaveProfile} className="max-w-md bg-white dark:bg-gray-800 p-4 rounded shadow mb-6">
        <label className="block mb-2">
          <div className="text-sm">Salário líquido mensal</div>
          <CurrencyInput value={netSalary} onChange={setNetSalary} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        </label>
        <label className="block mb-2">
          <div className="text-sm">Dia do mês que recebe</div>
          <input type="number" min={1} max={31} value={payDay} onChange={e=>setPayDay(Number(e.target.value))} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        </label>
        <label className="block mb-2">
          <div className="text-sm">Percentual para poupar (%)</div>
          <input type="number" min={0} max={100} value={savingsPct} onChange={e=>setSavingsPct(Number(e.target.value))} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
        </label>
        <button className="bg-teal-500 text-white px-4 py-2 rounded">Salvar perfil</button>
      </form>

      <section className="max-w-lg">
        <h3 className="text-lg font-medium mb-2">Gastos fixos</h3>
        <form onSubmit={handleAddFixed} className="flex flex-wrap gap-2 mb-4 items-center">
          <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} className="p-2 h-10 border rounded flex-1 min-w-0 bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
          <CurrencyInput value={amount} onChange={setAmount} className="p-2 h-10 border rounded w-full md:w-32 bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
          <button className="bg-teal-500 text-white px-4 rounded h-10 flex items-center justify-center">Adicionar</button>
        </form>
        {addError && <div className="text-sm text-red-500 mb-4">{addError}</div>}

        <ul className="space-y-2">
          {fixedExpenses.map(f => (
            <li key={f.id} className="p-3 bg-white dark:bg-gray-800 rounded shadow flex justify-between items-center">
              <div className="flex-1">
                <div className="font-medium">{f.name}</div>
                <div className="text-sm text-gray-500">{f.category ?? ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-semibold">R$ {f.amount.toFixed(2)}</div>
                <button onClick={() => setEditing(f)} className="text-xl md:text-sm text-teal-600 p-2">✎</button>
                <button onClick={() => handleDeleteFixed(f.id)} className="text-sm text-red-500 p-2">🗑</button>
              </div>
            </li>
          ))}
        </ul>
        {editing && (
          <Modal title="Editar gasto fixo" onClose={() => setEditing(null)}>
            <form onSubmit={async (e) => { e.preventDefault(); if (!user) return; try { await updateFixedExpenseInUser(user.uid, editing.id, { name: editing.name, amount: editing.amount }); setEditing(null); setToast({ message: 'Gasto atualizado', variant: 'success' }) } catch (err) { console.error(err); setToast({ message: 'Erro ao atualizar', variant: 'error' }) } }} className="space-y-2">
              <input value={editing.name} onChange={e=>setEditing({...editing, name: e.target.value})} className="w-full p-2 border rounded" />
              <CurrencyInput value={editing.amount} onChange={(v)=>setEditing({...editing, amount: v})} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={()=>setEditing(null)} className="px-3 py-1 rounded border">Cancelar</button>
                <button type="submit" className="px-3 py-1 rounded bg-teal-500 text-white">Salvar</button>
              </div>
            </form>
          </Modal>
        )}
      </section>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir gasto"
        message={`Tem certeza que deseja excluir ${confirmDelete?.name ?? 'este gasto'}? Essa ação não poderá ser desfeita.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && confirmDeleteFixed(confirmDelete.id)}
      />
    </div>
  )
}

