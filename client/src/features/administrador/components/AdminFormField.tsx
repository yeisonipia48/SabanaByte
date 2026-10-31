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

const AUTOCOMPLETE_BY_ID: Record<string, string> = {
  firstName: 'given-name',
  lastName: 'family-name',
  email: 'email',
  phone: 'tel',
  birthDate: 'bday',
  address: 'street-address',
  password: 'new-password',
}

function AdminFormField(props: InputFieldProps | SelectFieldProps | TextareaFieldProps) {
  const { label, error, required, ...rest } = props as BaseProps & Record<string, unknown>
  const id = (rest as { id?: string }).id
  const errorId = id ? `${id}-error` : undefined

  const baseInputClasses =
    'w-full border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100'

  const stateClasses = error
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25'
    : 'border-slate-300 focus:border-sky-700 focus:ring-sky-700/25 dark:border-slate-700'

  const sharedProps = {
    ...rest,
    id,
    name: (rest as { name?: string }).name ?? id,
    autoComplete:
      (rest as { autoComplete?: string }).autoComplete ??
      (id ? AUTOCOMPLETE_BY_ID[id] ?? 'off' : 'off'),
    spellCheck:
      (rest as { spellCheck?: boolean }).spellCheck ??
      (id === 'email' || id === 'documentNumber' ? false : undefined),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
      >
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      {'children' in props ? (
        <select
          {...(sharedProps as SelectHTMLAttributes<HTMLSelectElement>)}
          className={`${baseInputClasses} ${stateClasses}`}
        >
          {props.children}
        </select>
      ) : 'rows' in props ? (
        <textarea
          {...(sharedProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          className={`${baseInputClasses} ${stateClasses}`}
        />
      ) : (
        <input
          {...(sharedProps as InputHTMLAttributes<HTMLInputElement>)}
          className={`${baseInputClasses} ${stateClasses}`}
        />
      )}
      {error ? (
        <p id={errorId} className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default AdminFormField
