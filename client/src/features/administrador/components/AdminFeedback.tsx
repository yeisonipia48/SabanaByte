import { CheckCircle2, CircleAlert, X } from 'lucide-react'

export type AdminFeedbackType = 'success' | 'error'

interface AdminFeedbackProps {
  type: AdminFeedbackType
  message: string
  onDismiss?: () => void
}

function AdminFeedback({ type, message, onDismiss }: AdminFeedbackProps) {
  const isError = type === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`animate-fade-up flex items-start gap-2 border border-l-4 px-3 py-2.5 text-sm ${
        isError
          ? 'border-rose-200 border-l-rose-600 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:border-l-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
          : 'border-emerald-200 border-l-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:border-l-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
      }`}
    >
      {isError ? (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <p className="min-w-0 flex-1 break-words leading-relaxed">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 -mt-1 inline-flex items-center justify-center p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          aria-label="Cerrar aviso"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export default AdminFeedback
