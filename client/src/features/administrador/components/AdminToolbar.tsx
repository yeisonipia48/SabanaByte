import { Plus, Search } from 'lucide-react'

interface AdminToolbarProps {
  title: string
  searchValue: string
  onSearchChange: (value: string) => void
  onCreate: () => void
  createLabel?: string
}

function AdminToolbar({
  title,
  searchValue,
  onSearchChange,
  onCreate,
  createLabel = 'Crear',
}: AdminToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <input
            type="search"
            name="search"
            aria-label="Buscar"
            autoComplete="off"
            spellCheck={false}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar…"
            className="w-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-700/25 sm:w-64 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 bg-sky-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-sky-900 active:bg-sky-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {createLabel}
        </button>
      </div>
    </div>
  )
}

export default AdminToolbar
