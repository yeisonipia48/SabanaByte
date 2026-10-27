import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface BaseProps {
  label: string
  error?: string
  required?: boolean
}

interface InputFieldProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'password' | 'date' | 'time' | 'tel' | 'number'
}

interface SelectFieldProps extends BaseProps, SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

interface TextareaFieldProps extends BaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}

function AdminFormField(props: InputFieldProps | SelectFieldProps | TextareaFieldProps) {
  const { label, error, required, ...rest } = props as BaseProps & Record<string, unknown>
  const id = (rest as { id?: string }).id

  const baseInputClasses =
    'w-full border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2'

  const stateClasses = error
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25'
    : 'border-slate-300 focus:border-sky-700 focus:ring-sky-700/25'

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
      >
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      {'children' in props ? (
        <select
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
          id={id}
          className={`${baseInputClasses} ${stateClasses}`}
        >
          {props.children}
        </select>
      ) : 'rows' in props ? (
        <textarea
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={id}
          className={`${baseInputClasses} ${stateClasses}`}
        />
      ) : (
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          id={id}
          className={`${baseInputClasses} ${stateClasses}`}
        />
      )}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  )
}

export default AdminFormField
