import type { ReactNode } from 'react'

interface Column<T> {
  header: string
  accessor?: keyof T
  render?: (row: T) => ReactNode
  className?: string
}

interface AdminDataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  loading?: boolean
  skeletonRows?: number
  getRowKey?: (row: T) => string | number
}

function AdminDataTable<T>({
  columns,
  data,
  emptyMessage = 'Sin registros',
  loading = false,
  skeletonRows = 5,
  getRowKey,
}: AdminDataTableProps<T>) {
  return (
    <div className="overflow-x-auto border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table
        className="min-w-full divide-y divide-slate-200 text-sm tabular-nums dark:divide-slate-800"
        aria-busy={loading}
      >
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 ${
                  column.className ?? ''
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="animate-pulse motion-reduce:animate-none">
                {columns.map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <div
                      className={`h-3 rounded bg-slate-200/80 dark:bg-slate-700/60 ${
                        colIndex % 3 === 0
                          ? 'w-3/4'
                          : colIndex % 3 === 1
                            ? 'w-1/2'
                            : 'w-2/3'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={getRowKey ? getRowKey(row) : rowIndex}
                className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 py-2.5 text-slate-700 dark:text-slate-300 ${column.className ?? ''}`}
                  >
                    {column.render
                      ? column.render(row)
                      : column.accessor
                        ? String((row as Record<string, unknown>)[column.accessor as string] ?? '')
                        : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default AdminDataTable
