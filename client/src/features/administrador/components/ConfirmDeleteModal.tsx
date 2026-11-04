import { AlertTriangle, Loader2 } from 'lucide-react'
import AdminModal from './AdminModal'

interface ConfirmDeleteModalProps {
  open: boolean
  title?: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  loading?: boolean
  error?: string | null
}

function ConfirmDeleteModal({
  open,
  title = 'Confirmar eliminación',
  description = '¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.',
  onConfirm,
  onCancel,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  loading = false,
  error = null,
}: ConfirmDeleteModalProps) {
  return (
    <AdminModal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex items-center gap-2 bg-rose-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-rose-800 active:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
            {loading ? 'Eliminando…' : confirmText}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="min-w-0 flex-1 break-words text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
        {error ? (
          <p
            role="alert"
            aria-live="assertive"
            className="border border-rose-200 border-l-4 border-l-rose-600 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:border-l-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {error}
          </p>
        ) : null}
      </div>
    </AdminModal>
  )
}

export default ConfirmDeleteModal
