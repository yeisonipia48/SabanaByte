interface ModuleFallbackProps {
  label?: string
}

function ModuleFallback({ label = 'Cargando módulo…' }: ModuleFallbackProps) {
  return (
    <div
      className="animate-fade-in space-y-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-20 animate-pulse rounded border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export default ModuleFallback
