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
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            name="search"
            aria-label="Buscar"
            autoComplete="off"
            spellCheck={false}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar…"
            className="w-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-700/25 sm:w-64"
          />
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 bg-sky-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-sky-900"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {createLabel}
        </button>
      </div>
    </div>
  )
}

export default AdminToolbar
