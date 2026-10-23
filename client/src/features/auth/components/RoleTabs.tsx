import { useRef, type KeyboardEvent } from 'react'
import type { Role } from '../types'

const ROLES: ReadonlyArray<{ id: Role; label: string }> = [
  { id: 'afiliado', label: 'Afiliados y Pacientes' },
  { id: 'empresa', label: 'Empresas y Aportantes' },
  { id: 'medico', label: 'Médicos e IPS' },
]

interface RoleTabsProps {
  value: Role
  onChange: (role: Role) => void
}

function RoleTabs({ value, onChange }: RoleTabsProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const lastIndex = ROLES.length - 1

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = index === lastIndex ? 0 : index + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = index === 0 ? lastIndex : index - 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = lastIndex
        break
      default:
        return
    }

    event.preventDefault()
    onChange(ROLES[nextIndex].id)
    buttonsRef.current[nextIndex]?.focus()
  }

  return (
    <div
      className="bg-slate-100 p-1 rounded-xl flex items-center mb-5 text-xs sm:text-sm font-semibold text-slate-600"
      role="tablist"
      aria-label="Tipo de usuario"
    >
      {ROLES.map((role, index) => {
        const isActive = role.id === value

        return (
          <button
            key={role.id}
            ref={(element) => {
              buttonsRef.current[index] = element
            }}
            id={`role-tab-${role.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="login-panel"
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(role.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex-1 py-2 px-3 text-center rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
              isActive
                ? 'bg-sky-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {role.label}
          </button>
        )
      })}
    </div>
  )
}

export default RoleTabs
