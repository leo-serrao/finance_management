import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { SharedGroup, SharedExpense } from '../types/shared'
import { subscribeToSharedExpenses, createSharedExpense, deleteSharedExpense, updateSharedExpense } from '../services/sharedExpenses'
import { calculateBalances, calculateSettlements, applyPaymentsToSettlements } from '../services/sharedBalance'
import { subscribeToDebtSettlements, createDebtSettlement, deleteDebtSettlement } from '../services/debtSettlements'
import { DebtSettlement } from '../types/shared'
import { getUserProfile } from '../services/firestore'
import CurrencyInput from '../components/CurrencyInput'
import { getLocalISODate } from '../utils/date'

export default function SharedGroupDetails() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState<SharedGroup | null>(null)
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [toast, setToast] = useState<{ message: string; variant?: string } | null>(null)
  const [openNew, setOpenNew] = useState(false)
  const [form, setForm] = useState({ title: '', amount: 0, paidBy: '', date: getLocalISODate() })
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    const d = doc(db, 'sharedGroups', groupId)
    const unsub = onSnapshot(d, snap => {
      if (!snap.exists()) { setGroup(null); return }
      const data = { id: snap.id, ...(snap.data() as any) } as SharedGroup
      setGroup(data)
    }, (err) => {
      console.error('group listener error', err)
      setToast({ message: 'Sem permissão para ler grupo', variant: 'error' })
    })
    return () => unsub()
  }, [groupId])

  useEffect(() => {
    if (!groupId) return
    const unsub = subscribeToSharedExpenses(groupId, (items) => {
      setExpenses(items)
      // fetch profiles for participants
      const uids = new Set<string>()
      items.forEach(i => i.participants.forEach(p => uids.add(p)))
      if (group) group.members.forEach(m => uids.add(m))
      uids.forEach(async uid => {
        if (profiles[uid]) return
        const p = await getUserProfile(uid)
        setProfiles(prev => ({ ...prev, [uid]: p }))
      })
    }, (err) => {
      console.error('expenses listener error', err)
      setToast({ message: 'Sem permissão para ler despesas', variant: 'error' })
    })
    return () => unsub()
  }, [groupId, group])

  useEffect(() => {
    // default paidBy to current user or first group member
    if (!group) return
    setForm(f => ({ ...f, paidBy: f.paidBy || (user?.uid ?? group.members[0] ?? '') }))
  }, [group, user])

  const balances = calculateBalances(expenses)
  const settlements = calculateSettlements(balances)
  const [payments, setPayments] = useState<DebtSettlement[]>([])
  const [paymentsPermissionDenied, setPaymentsPermissionDenied] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payAmount, setPayAmount] = useState<number>(0)
  const [payFrom, setPayFrom] = useState<string | null>(null)
  const [payTo, setPayTo] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    const unsub = subscribeToDebtSettlements(groupId, (items) => {
      setPayments(items)
      setPaymentsPermissionDenied(false)
    }, (err) => {
      console.error('debt settlements listen error', err)
      setPaymentsPermissionDenied(true)
      setToast({ message: 'Sem permissão para ler quitações. Verifique as regras do Firestore.', variant: 'error' })
    })
    return () => unsub()
  }, [groupId])

  const adjustedSettlements = applyPaymentsToSettlements(settlements, payments.map(p => ({ fromUserId: p.fromUserId, toUserId: p.toUserId, amount: p.amount })))

  async function handleDeletePayment(paymentId?: string) {
    if (!groupId || !paymentId) return
    try {
      await deleteDebtSettlement(groupId, paymentId)
      setToast({ message: 'Pagamento removido', variant: 'success' })
    } catch (err) {
      console.error('delete payment error', err)
      setToast({ message: 'Erro ao remover pagamento (verifique permissões)', variant: 'error' })
    }
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!groupId) return
    try {
      const participants = group?.members || []
      if (!form.title || !form.amount || !form.paidBy || participants.length === 0) {
        setToast({ message: 'Preencha todos os campos', variant: 'warning' })
        return
      }
      // ensure date is full ISO timestamp (set to midnight local)
      const isoDate = form.date ? `${form.date}T00:00:00` : new Date().toISOString()
      const payload: Omit<SharedExpense, 'id' | 'createdAt'> = {
        title: form.title,
        amount: Number(form.amount),
        paidBy: form.paidBy,
        participants,
        date: isoDate
      }
      if (editingExpenseId) {
        await updateSharedExpense(groupId, editingExpenseId, payload)
        setToast({ message: 'Despesa atualizada', variant: 'success' })
      } else {
        await createSharedExpense(groupId, payload)
        setToast({ message: 'Despesa criada', variant: 'success' })
      }
      setOpenNew(false)
      setForm({ title: '', amount: 0, paidBy: user?.uid ?? '', date: getLocalISODate() })
      setEditingExpenseId(null)
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao criar despesa', variant: 'error' })
    }
  }

  function handleEditClick(exp: SharedExpense) {
    setEditingExpenseId(exp.id ?? null)
    setForm({ title: exp.title, amount: exp.amount, paidBy: exp.paidBy, date: exp.date.split('T')[0] })
    setOpenNew(true)
  }

  async function handleDeleteClick(exp: SharedExpense) {
    if (!groupId || !exp.id) return
    try {
      await deleteSharedExpense(groupId, exp.id)
      setToast({ message: 'Despesa excluída', variant: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao excluir despesa', variant: 'error' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to="/shared" className="text-sm text-teal-500">&larr; Voltar</Link>
          <h2 className="text-2xl font-bold">{group?.name ?? 'Grupo'}</h2>
        </div>
        <div>
          <button onClick={() => setOpenNew(true)} className="bg-teal-500 text-white px-3 py-1 rounded">+ Nova despesa</button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold">Saldo</h3>
        {settlements.length === 0 && <div>Nenhum saldo entre vocês</div>}
        {settlements.map(s => {
          const remaining = adjustedSettlements.find(a => a.from === s.from && a.to === s.to)?.amount ?? 0
          return (
            <div key={`${s.from}-${s.to}`} className="text-sm flex items-center justify-between">
              <div>
                {profiles[s.from]?.displayName ?? profiles[s.from]?.email ?? s.from} deve R$ {s.amount.toFixed(2)} para {profiles[s.to]?.displayName ?? profiles[s.to]?.email ?? s.to}
                {remaining === 0 && <span className="ml-2 text-xs text-green-600">(Quitado)</span>}
                {remaining > 0 && <span className="ml-2 text-xs text-gray-500">(Restante R$ {remaining.toFixed(2)})</span>}
              </div>
              <div className="flex items-center gap-2">
                <button disabled={paymentsPermissionDenied || remaining <= 0} onClick={() => { setPayFrom(s.from); setPayTo(s.to); setPayAmount(remaining > 0 ? remaining : s.amount); setPayModalOpen(true) }} className={`text-sm px-2 py-1 rounded border ${paymentsPermissionDenied ? 'opacity-50 cursor-not-allowed' : 'text-teal-600'}`}>{remaining > 0 ? 'Quitar dívida' : 'Quitar dívida'}</button>
              </div>
            </div>
          )
        })}

        <div className="mt-3">
          <h4 className="font-semibold">Pagamentos registrados</h4>
          {payments.length === 0 && <div className="text-sm text-gray-500">Nenhum pagamento</div>}
          {payments.map(p => (
            <div key={p.id} className="text-sm flex items-center justify-between">
              <div>
                {profiles[p.fromUserId]?.displayName ?? p.fromUserId} {' → '} {profiles[p.toUserId]?.displayName ?? p.toUserId}: R$ {p.amount.toFixed(2)}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDeletePayment(p.id)} className="text-sm text-red-500 px-2 py-1 rounded border">Remover</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold">Despesas</h3>
        <div className="space-y-2">
          {expenses.map(ex => (
                      <div key={ex.id} className="p-3 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => handleEditClick(ex)} className="text-sm text-teal-600 px-2 py-1 rounded border">✎ Editar</button>
                          <button onClick={() => handleDeleteClick(ex)} className="text-sm text-red-500 px-2 py-1 rounded border">🗑 Excluir</button>
                        </div>
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{ex.title}</div>
                  <div className="text-sm text-gray-500">{new Date(ex.date).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">R$ {ex.amount.toFixed(2)}</div>
                  <div className="text-sm">Pago por: {profiles[ex.paidBy]?.displayName ?? profiles[ex.paidBy]?.email ?? ex.paidBy}</div>
                </div>
              </div>
              {/* participants implicit for group; omitted in compact view */}
            </div>
          ))}
          {expenses.length === 0 && <div className="p-3 bg-white dark:bg-gray-800 rounded">Nenhuma despesa</div>}
        </div>
      </div>

      {openNew && (
        <Modal title="Nova despesa" onClose={() => setOpenNew(false)}>
          <form onSubmit={(e)=>handleCreate(e)} className="space-y-3">
            <input value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} placeholder="Título" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />

            <div>
              <CurrencyInput value={form.amount} onChange={v=>setForm(f=>({ ...f, amount: v }))} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" placeholder="Valor" />
              {group && group.members && group.members.length > 0 && (
                <div className="text-sm text-gray-500 mt-1">Cada participante pagará: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((form.amount || 0) / group.members.length)}</div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Quem pagou?</label>
              <select value={form.paidBy} onChange={e=>setForm(f=>({ ...f, paidBy: e.target.value }))} className="w-full p-2 mt-1 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100">
                {group?.members?.map(uid => (
                  <option key={uid} value={uid}>{profiles[uid]?.displayName ?? profiles[uid]?.email ?? uid}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Data</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({ ...f, date: e.target.value }))} className="w-full p-2 h-10 mt-1 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100 appearance-none box-border text-left leading-6 max-w-full" />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setOpenNew(false)} className="px-3 py-1 rounded border">Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-teal-500 text-white">Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {payModalOpen && (
        <Modal title="Quitar dívida" onClose={() => setPayModalOpen(false)}>
          <div className="space-y-3">
            <div className="text-sm">De: {profiles[payFrom ?? '']?.displayName ?? payFrom}</div>
            <div className="text-sm">Para: {profiles[payTo ?? '']?.displayName ?? payTo}</div>
            <div>
              <label className="text-sm">Valor</label>
              <CurrencyInput value={payAmount} onChange={setPayAmount} className="w-full p-2 mt-1" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPayModalOpen(false)} className="px-3 py-1 rounded border">Cancelar</button>
              <button onClick={async () => {
                if (!groupId || !payFrom || !payTo) return
                try {
                  await createDebtSettlement(groupId, { fromUserId: payFrom, toUserId: payTo, amount: payAmount, groupId })
                  setToast({ message: 'Pagamento registrado', variant: 'success' })
                  setPayModalOpen(false)
                } catch (err) {
                  console.error('create payment error', err)
                  const code = (err && (err as any).code) || ''
                  if (code === 'permission-denied' || (err && (err as any).message && (err as any).message.includes('Missing or insufficient permissions'))) {
                    setPaymentsPermissionDenied(true)
                    setToast({ message: 'Sem permissão para registrar quitação. Atualize as regras do Firestore.', variant: 'error' })
                  } else {
                    setToast({ message: 'Erro ao registrar pagamento', variant: 'error' })
                  }
                }
              }} className="px-3 py-1 rounded bg-teal-500 text-white">Confirmar</button>
            </div>
          </div>
        </Modal>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
