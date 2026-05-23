import React, { useEffect } from 'react'

type ToastProps = {
  message?: string
  onClose?: () => void
  actionLabel?: string
  onAction?: () => void
}

export default function Toast({ message, onClose, actionLabel, onAction }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onClose && onClose(), 5000)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null

  return (
    <div aria-live="polite" className="fixed bottom-6 right-6 z-50">
      <div className="bg-black/80 text-white px-4 py-2 rounded shadow-lg animate-slide-up flex items-center gap-3">
        <div className="flex-1">{message}</div>
        {actionLabel && onAction && (
          <button onClick={onAction} className="bg-white text-black px-2 py-1 rounded">{actionLabel}</button>
        )}
      </div>
    </div>
  )
}
