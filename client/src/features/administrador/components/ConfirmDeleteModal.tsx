import { AlertTriangle } from 'lucide-react'
import AdminModal from './AdminModal'

interface ConfirmDeleteModalProps {
  open: boolean
  title?: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

function ConfirmDeleteModal({
  open,
  title = 'Confirmar eliminación',
  description = '¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.',
  onConfirm,
  onCancel,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
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
            className="inline-flex items-center gap-2 border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 bg-rose-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-rose-800"
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center border border-rose-200 bg-rose-50 text-rose-700">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </AdminModal>
  )
}

export default ConfirmDeleteModal
