from enum import StrEnum


class EstadoAgenda(StrEnum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"


class EstadoCupo(StrEnum):
    DISPONIBLE = "disponible"
    RESERVADO = "reservado"
    OCUPADO = "ocupado"
    CANCELADO = "cancelado"


class EstadoCita(StrEnum):
    PENDIENTE = "pendiente"
    CONFIRMADA = "confirmada"
    ATENDIDA = "atendida"
    CANCELADA = "cancelada"
    NO_ASISTIO = "no_asistio"


class EstadoEspera(StrEnum):
    PENDIENTE = "pendiente"
    OFRECIDA = "ofrecida"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    EXPIRADA = "expirada"
    CANCELADA = "cancelada"


ESTADOS_CITA_ACTIVOS = (EstadoCita.PENDIENTE.value, EstadoCita.CONFIRMADA.value)
ESTADOS_CITA_FINALES = (
    EstadoCita.ATENDIDA.value,
    EstadoCita.CANCELADA.value,
    EstadoCita.NO_ASISTIO.value,
)
ESTADOS_ESPERA_ACTIVOS = (EstadoEspera.PENDIENTE.value, EstadoEspera.OFRECIDA.value)
