import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { getUserByEmail, createSharedGroup, subscribeToSharedGroups } from '../services/sharedGroups'
import { SharedGroup } from '../types/shared'

export default function SharedGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<SharedGroup[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [toast, setToast] = useState<{ message: string; variant?: string } | null>(null)
  
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToSharedGroups(user.uid, (gs) => {
      setGroups(gs)
    }, (err) => {
      console.error('SharedGroups listener error', err)
      setToast({ message: 'Sem permissão para ler grupos compartilhados', variant: 'error' })
    })
    return () => unsub()
  }, [user])

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name.trim() || !email.trim()) { setToast({ message: 'Preencha nome e email', variant: 'warning' }); return }
    try {
      let other = null
      try {
        other = await getUserByEmail(email.trim())
      } catch (err) {
        console.error('Error fetching user by email', err)
        setToast({ message: 'Erro ao buscar usuário por email (permissão?)', variant: 'error' })
        return
      }
      if (!other) { setToast({ message: 'Usuário não encontrado', variant: 'error' }); return }
      if (!user) { setToast({ message: 'Usuário não autenticado', variant: 'error' }); return }
      const members = [user.uid, other.id].filter(Boolean) as string[]

      const groupData = { name: name.trim(), members }

      // basic validation against rules
      if (!Array.isArray(groupData.members) || groupData.members.length === 0) {
        setToast({ message: 'members inválido', variant: 'error' })
        return
      }
      if (!groupData.members.includes(user.uid)) {
        setToast({ message: 'Seu UID deve estar em members', variant: 'error' })
        return
      }

      await createSharedGroup(groupData)
      setToast({ message: 'Grupo criado', variant: 'success' })
      setOpen(false)
      setName('')
      setEmail('')
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao criar grupo', variant: 'error' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Compartilhados</h2>
        <div>
          <button onClick={() => setOpen(true)} className="bg-teal-500 text-white px-3 py-1 rounded">+ Novo grupo</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groups.map(g => (
          <Link to={`/shared/${g.id}`} key={g.id} className="block p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md">
            <div className="text-lg font-medium">{g.name}</div>
            <div className="text-sm text-gray-500 mt-2">Membros: {g.members?.length ?? 0}</div>
          </Link>
        ))}
        {groups.length === 0 && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">Nenhum grupo encontrado</div>
        )}
      </div>

      {open && (
        <Modal title="Novo grupo compartilhado" onClose={() => setOpen(false)}>
          <form onSubmit={(e)=>handleCreate(e)} className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do grupo" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email do outro usuário" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-black dark:text-gray-100" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setOpen(false)} className="px-3 py-1 rounded border">Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-teal-500 text-white">Criar</button>
            </div>
          </form>
        </Modal>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
