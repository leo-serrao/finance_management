import React, { useMemo, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import ConfirmModal from '../components/ConfirmModal'
import { addSavingBoxToUser, updateSavingBoxInUser, deleteSavingBoxFromUser } from '../services/savingBoxes'
import { calculate50_30_20 } from '../utils/finance'

export default function Boxes() {
  const { profile, savingBoxes, addSavingBox, updateSavingBox, removeSavingBox } = useFinanceStore()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>('')
  const [amount, setAmount] = useState<number>(0)
  const [toast, setToast] = useState<{ message: string; variant?: 'success'|'error'|'warning'|'info' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name?: string } | null>(null)

  const netSalary = profile?.netSalary ?? 0
  const fixedExpenses = profile?.fixedExpenses ?? []
  const savingsPercent = profile?.savingsPercent ?? 0.2
  const recommended = calculate50_30_20(netSalary, fixedExpenses, savingsPercent).savings

  const totalDistributed = useMemo(() => savingBoxes.reduce((s, b) => s + b.amount, 0), [savingBoxes])
  const remaining = Math.round((recommended - totalDistributed) * 100) / 100

  function openNew() {
    setEditing(null)
    setName('')
    setEmoji('')
    setAmount(0)
    setOpen(true)
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name.trim() || amount <= 0) { setToast({ message: 'Preencha nome e valor maior que 0', variant: 'warning' }); return }
    if (amount > remaining) { setToast({ message: 'Valor excede o recomendado restante', variant: 'error' }); return }
    const box = { id: editing?.id ?? Date.now().toString(), name: name.trim(), amount, createdAt: new Date().toISOString(), emoji: emoji || undefined }
    try {
      if (user) {
        if (editing) {
          await updateSavingBoxInUser(user.uid, box.id, box)
        } else {
          await addSavingBoxToUser(user.uid, box)
        }
      }
      if (editing) updateSavingBox(box as any)
      else addSavingBox(box as any)
      setToast({ message: editing ? 'Caixinha atualizada' : 'Caixinha criada', variant: 'success' })
      setOpen(false)
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao salvar caixinha', variant: 'error' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Caixinhas</h2>
        <div>
          <button onClick={openNew} className="bg-teal-500 text-white px-3 py-1 rounded">+ Nova caixinha</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-500">Recomendado para guardar</div>
          <div className="text-2xl font-semibold">R$ {recommended.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total em caixinhas</div>
          <div className="text-2xl font-semibold">R$ {totalDistributed.toFixed(2)}</div>
        </div>
        <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow ${remaining < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
          <div className="text-sm text-gray-500">Restante não distribuído</div>
          <div className="text-2xl font-semibold">R$ {remaining.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {savingBoxes.map(b => (
          <div key={b.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col justify-between">
            <div>
              <div className="text-lg font-medium truncate flex items-center gap-2">
                <span className="text-2xl">{b.emoji ?? ' '}</span>
                <span className="truncate">{b.name}</span>
              </div>
              <div className="text-sm text-gray-500 mt-2">R$ {b.amount.toFixed(2)}</div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => { setEditing(b); setName(b.name); setEmoji(b.emoji ?? ''); setAmount(b.amount); setOpen(true) }} className="px-3 py-1 rounded border">Editar</button>
              <button onClick={() => setConfirmDelete({ id: b.id, name: b.name })} className="px-3 py-1 rounded bg-red-500 text-white">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Modal title={editing ? 'Editar caixinha' : 'Nova caixinha'} onClose={() => setOpen(false)}>
          <form onSubmit={(e)=>handleSave(e)} className="space-y-2">
            <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
            <div>
              <label className="block text-sm text-gray-600 mb-1">Emoji (opcional)</label>
              <div className="flex items-center gap-2">
                <input placeholder="Digite um emoji ou escolha abaixo" value={emoji} onChange={e=>setEmoji(e.target.value)} className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
              </div>
              <div className="mt-2 flex gap-2">
                {['🚗','✈️','🛡','💻','🏠','🎮','📱','💰'].map(em => (
                  <button key={em} type="button" onClick={() => setEmoji(em)} className="px-2 py-1 rounded border text-lg">{em}</button>
                ))}
              </div>
            </div>
            <CurrencyInput value={amount} onChange={setAmount} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={()=>setOpen(false)} className="px-3 py-1 rounded border">Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-teal-500 text-white">Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir caixinha"
        message={`Tem certeza que deseja excluir ${confirmDelete?.name ?? 'esta caixinha'}?`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!user || !confirmDelete) return
          try {
            await deleteSavingBoxFromUser(user.uid, confirmDelete.id)
            removeSavingBox(confirmDelete.id)
            setToast({ message: 'Caixinha excluída', variant: 'success' })
          } catch (err) {
            console.error(err)
            setToast({ message: 'Erro ao excluir caixinha', variant: 'error' })
          } finally {
            setConfirmDelete(null)
          }
        }}
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
