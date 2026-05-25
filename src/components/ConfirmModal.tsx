import React from 'react'

export default function ConfirmModal({ open, title, message, onCancel, onConfirm }: { open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4 transform transition-transform duration-200">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{message}</p>
            </div>
            <button onClick={onCancel} className="text-gray-500">✕</button>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onCancel} className="px-3 py-1 rounded border">Cancelar</button>
            <button onClick={onConfirm} className="px-3 py-1 rounded bg-red-500 text-white">Excluir</button>
          </div>
        </div>
      </div>
    </div>
  )
}
