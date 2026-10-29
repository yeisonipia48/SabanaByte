import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { CheckCircle2, Clock, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../components/AdminToolbar'
import AdminDataTable from '../components/AdminDataTable'
import AdminModal from '../components/AdminModal'
import AdminFormField from '../components/AdminFormField'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { adminService } from '../services/adminService'
import { listaEsperaService } from '../../../services'
import type { ListaEspera, ListaEsperaEstado, Medico, Paciente } from '../types/admin'

interface FormState {
  patientId: string
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: ListaEsperaEstado
}

const emptyForm: FormState = {
  patientId: '',
  doctorId: '',
  specialtyId: '',
  date: '',
  time: '',
  status: 'En espera',
}

function ListaEsperaModule() {
  const [items, setItems] = useState<ListaEspera[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [especialidades] = useState(() => adminService.getEspecialidades())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<ListaEspera | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ListaEspera | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listaData, pacData, medData] = await Promise.all([
        adminService.getListaEspera(),
        adminService.getPacientes(),
        adminService.getMedicos(),
      ])
      setItems(listaData)
      setPacientes(pacData)
      setMedicos(medData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar lista de espera')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      const p = pacientes.find((x) => x.id === item.patientId)
      const m = medicos.find((x) => x.id === item.doctorId)
      return (
        p?.firstName.toLowerCase().includes(term) ||
        p?.lastName.toLowerCase().includes(term) ||
        m?.firstName.toLowerCase().includes(term) ||
        m?.lastName.toLowerCase().includes(term) ||
        item.specialtyId.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term)
      )
    })
  }, [items, pacientes, medicos, search])

  const getPaciente = (id: string) => {
    const p = pacientes.find((x) => x.id === id)
    return p ? `${p.firstName} ${p.lastName}` : `Paciente #${id}`
  }
  const getMedico = (id: string) => {
    const m = medicos.find((x) => x.id === id)
    return m ? `${m.firstName} ${m.lastName}` : id ? `Médico #${id}` : 'Cualquier médico'
  }
  const getEsp = (id: string) => especialidades.find((x) => x.id === id)?.name ?? id

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openView = (item: ListaEspera) => {
    setMode('view')
    setSelected(item)
    setForm({ ...item })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (mode === 'view') {
      setModalOpen(false)
      return
    }
    try {
      if (mode === 'create') {
        if (!form.patientId) {
          alert('Por favor selecciona un paciente.')
          return
        }
        await adminService.addListaEspera(form)
        await loadData()
        setModalOpen(false)
        return
      }
      if (mode === 'edit' && selected) {
        await adminService.updateListaEspera(selected.id, form)
        await loadData()
        setModalOpen(false)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar en lista de espera')
    }
  }

  const confirmDelete = (item: ListaEspera) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await adminService.removeListaEspera(toDelete.id)
      await loadData()
      setDeleteOpen(false)
      setToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cancelar solicitud de lista de espera')
    }
  }

  const handleProcesarExpiradas = async () => {
    try {
      const res = await listaEsperaService.procesarExpiradas()
      alert(`Ofertas procesadas: ${res.ofertas_expiradas} expiradas, ${res.nuevas_ofertas} nuevas generadas.`)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al procesar ofertas expiradas')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <AdminToolbar
          title="Lista de Espera"
          searchValue={search}
          onSearchChange={setSearch}
          onCreate={openCreate}
          createLabel="Nueva solicitud"
        />
        <button
          type="button"
          onClick={handleProcesarExpiradas}
          className="inline-flex items-center gap-1.5 self-start border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 sm:self-auto"
        >
          <Clock className="h-3.5 w-3.5" />
          Procesar ofertas expiradas
        </button>
      </div>

      {loading && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Cargando solicitudes de lista de espera desde la base de datos...
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <AdminDataTable
        columns={[
          { header: 'Paciente', render: (row: ListaEspera) => getPaciente(row.patientId) },
          { header: 'Médico preferido', render: (row: ListaEspera) => getMedico(row.doctorId) },
          { header: 'Especialidad', render: (row: ListaEspera) => getEsp(row.specialtyId) },
          { header: 'Fecha cupo / solicitud', accessor: 'date' },
          { header: 'Hora cupo', accessor: 'time' },
          {
            header: 'Estado',
            render: (row: ListaEspera) => (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${
                  row.status === 'Atendido'
                    ? 'bg-emerald-50 text-emerald-700'
                    : row.status === 'Cancelado'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                }`}
              >
                {row.status}
              </span>
            ),
          },
          {
            header: 'Acciones',
            render: (row: ListaEspera) => (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => openView(row)}
                  className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-3 w-3" />
                  Ver
                </button>
                {row.status === 'En espera' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await listaEsperaService.aceptarOferta(Number(row.id))
                        await loadData()
                      } catch (err) {
                        alert(err instanceof Error ? err.message : 'No se pudo aceptar la oferta')
                      }
                    }}
                    className="inline-flex items-center gap-1 border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                    title="Aceptar cupo y convertir en cita"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Aceptar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => confirmDelete(row)}
                  className="inline-flex items-center gap-1 border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Cancelar
                </button>
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyMessage="No hay solicitudes en lista de espera."
      />

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === 'create' ? 'Nueva solicitud en lista de espera' : 'Detalle de la solicitud'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cerrar
            </button>
            {mode === 'create' ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 bg-sky-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900"
              >
                Registrar solicitud
              </button>
            ) : null}
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminFormField
            label="Paciente"
            id="patientId"
            required
            disabled={mode === 'view'}
            value={form.patientId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, patientId: event.target.value }))
            }
          >
            <option value="">Seleccionar paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.documentNumber})
              </option>
            ))}
          </AdminFormField>
          <AdminFormField
            label="Médico preferido (opcional)"
            id="doctorId"
            disabled={mode === 'view'}
            value={form.doctorId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              const doctorId = event.target.value
              const m = medicos.find((x) => x.id === doctorId)
              setForm((prev) => ({
                ...prev,
                doctorId,
                specialtyId: m?.specialtyId ?? prev.specialtyId,
              }))
            }}
          >
            <option value="">Cualquier médico disponible</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} ({m.specialtyId})
              </option>
            ))}
          </AdminFormField>
          <AdminFormField
            label="Especialidad requerida"
            id="specialtyId"
            disabled={mode === 'view'}
            value={form.specialtyId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, specialtyId: event.target.value }))
            }
          >
            <option value="">Seleccionar especialidad</option>
            {especialidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </AdminFormField>
        </div>
      </AdminModal>

      <ConfirmDeleteModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Cancelar solicitud de espera"
        description={`¿Estás seguro de que deseas cancelar la solicitud de espera del paciente ${toDelete ? getPaciente(toDelete.patientId) : ''}?`}
      />
    </div>
  )
}

export default ListaEsperaModule
