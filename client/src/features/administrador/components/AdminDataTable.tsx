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
}

function AdminDataTable<T>({ columns, data, emptyMessage = 'Sin registros' }: AdminDataTableProps<T>) {
  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${
                  column.className ?? ''
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50/60">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className={`px-4 py-2.5 text-slate-700 ${column.className ?? ''}`}>
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
