import { useRef, type KeyboardEvent } from 'react'
import type { Role } from '../types'

const ROLES: ReadonlyArray<{ id: Role; label: string }> = [
  { id: 'afiliado', label: 'Afiliados y Pacientes' },

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
      className="mb-5 grid grid-cols-3 border-b border-slate-200"
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
            className={`-mb-px border-b-2 px-1.5 pb-2.5 pt-1 text-[11px] font-semibold leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 sm:px-2 sm:text-xs ${isActive
                ? 'border-sky-800 text-sky-900'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
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
