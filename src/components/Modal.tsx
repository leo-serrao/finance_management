import React from 'react'

export default function Modal({ title, children, onClose }: { title?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded p-4 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="text-gray-500 text-xl p-1">✕</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
