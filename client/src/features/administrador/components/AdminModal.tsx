import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface AdminModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

function AdminModal({ open, title, onClose, children, footer }: AdminModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="relative z-10 w-full max-w-2xl max-h-[90dvh] overflow-hidden border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <h2
            id="admin-modal-title"
            className="text-base font-semibold text-slate-900 sm:text-lg"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center border border-slate-300 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[calc(90dvh-130px)] overflow-y-auto px-4 py-4 sm:px-6">
          {children}
        </div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdminModal
