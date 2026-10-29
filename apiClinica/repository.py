import os
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from functools import lru_cache
from sqlalchemy import select, func, delete, update, or_, and_
from sqlalchemy.orm import aliased
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from datetime import date, datetime, timedelta
from alembicApi import models
from schemas import PacienteUpdateSchema, UsuarioCreateSchema, RolCreateSchema, UsuarioUpdateSchema, PacienteCreateSchema
from schemas import MedicoCreateSchema, MedicoUpdateSchema, LoginSchema, RegistroUsuarioSchema, AgendaCreateSchema, AgendaUpdateSchema
from schemas import CitaCreateSchema, CupoUpdateSchema, ListaEsperaCreateSchema
from estados import (
    EstadoAgenda,
    EstadoCita,
    EstadoCupo,
    EstadoEspera,
    ESTADOS_CITA_ACTIVOS,
)
from errores import ErrorConflicto, ErrorNoEncontrado, ErrorReglaNegocio
from dbconexion import Conexion
from typing import Any, AsyncGenerator, List
from Security.security import hash_password, verify_password

HORAS_CONFIRMACION_OFERTA = 48


def _calcular_expiracion_oferta(
    fecha_cita: datetime, ahora: datetime | None = None
) -> datetime | None:
    ahora = ahora or datetime.now()
    if fecha_cita <= ahora:
        return None
    limite_48h = ahora + timedelta(hours=HORAS_CONFIRMACION_OFERTA)
    return min(limite_48h, fecha_cita)


def _leer_secreto(nombre: str) -> str:
    ruta = f"/run/secrets/{nombre}"
    if os.path.exists(ruta):
        with open(ruta) as f:
            return f.read().strip()
    valor = os.getenv(nombre)
    if valor is None:
        raise RuntimeError(
            f"No se encontró el secreto {nombre} ni la variable de entorno {nombre}"
        )
    return valor


@lru_cache
def _get_con() -> Conexion:
    db_user = _leer_secreto("postgres_user")
    password = _leer_secreto("postgres_password")
    host = _leer_secreto("postgres_host")
    db = _leer_secreto("postgres_db")

    return Conexion(db_user, password, host, db)

def get_con() -> Conexion:
    return _get_con()

async def get_conexion() -> AsyncGenerator[AsyncSession, None]:
    async with get_con().get_session() as session:
        yield session


def _validar_agenda(agenda: models.Agenda_Medicas) -> None:
    if agenda.fecha_fin < agenda.fecha_inicio:
        raise ErrorReglaNegocio("La fecha de fin no puede ser anterior a la fecha de inicio")
    if agenda.duracion_cita <= 0:
        raise ErrorReglaNegocio("La duración de la cita debe ser mayor a cero")
    if agenda.hora_fin <= agenda.hora_inicio:
        raise ErrorReglaNegocio("La hora de fin debe ser mayor a la hora de inicio")
    inicio = datetime.combine(agenda.fecha_inicio, agenda.hora_inicio)
    fin = datetime.combine(agenda.fecha_inicio, agenda.hora_fin)
    if inicio + timedelta(minutes=agenda.duracion_cita) > fin:
        raise ErrorReglaNegocio("La franja de la agenda es menor que la duración de una cita")


async def _generar_cupos_agenda(session: AsyncSession, agenda: models.Agenda_Medicas) -> dict[str, int]:
    _validar_agenda(agenda)
    ahora = datetime.now()
    filas: list[dict[str, Any]] = []
    fecha = agenda.fecha_inicio

    while fecha <= agenda.fecha_fin:
        inicio = datetime.combine(fecha, agenda.hora_inicio)
        fin = datetime.combine(fecha, agenda.hora_fin)
        actual = inicio
        while actual + timedelta(minutes=agenda.duracion_cita) <= fin:
            if actual > ahora:
                filas.append({
                    "id_agenda_medica": agenda.id,
                    "fecha_cupo": fecha,
                    "hora_cupo": actual.time(),
                    "estado": EstadoCupo.DISPONIBLE.value,
                })
            actual += timedelta(minutes=agenda.duracion_cita)
        fecha += timedelta(days=1)

    if not filas:
        return {"agenda_id": agenda.id, "cupos_creados": 0, "cupos_omitidos": 0}

    stmt = pg_insert(models.Cupos).values(filas).on_conflict_do_nothing(
        index_elements=["id_agenda_medica", "fecha_cupo", "hora_cupo"]
    )
    result = await session.execute(stmt)
    creados = result.rowcount or 0
    return {
        "agenda_id": agenda.id,
        "cupos_creados": creados,
        "cupos_omitidos": len(filas) - creados,
    }


async def _paciente_tiene_cita_activa(session: AsyncSession, id_paciente: int, fecha: date) -> bool:
    query = (
        select(func.count(models.Citas.id))
        .select_from(models.Citas)
        .join(models.Cupos, models.Citas.id_cupo == models.Cupos.id)
        .where(
            models.Citas.id_paciente == id_paciente,
            models.Citas.estado.in_(ESTADOS_CITA_ACTIVOS),
            models.Cupos.fecha_cupo == fecha,
        )
    )
    return bool(await session.scalar(query))


async def _crear_cita_para_cupo(
    session: AsyncSession,
    cupo: models.Cupos,
    id_paciente: int,
    motivo_consulta: str | None,
) -> models.Citas:
    if await _paciente_tiene_cita_activa(session, id_paciente, cupo.fecha_cupo):
        raise ErrorReglaNegocio("El paciente ya tiene una cita activa para esa fecha")

    cita = models.Citas(
        id_cupo=cupo.id,
        id_paciente=id_paciente,
        motivo_consulta=motivo_consulta,
        estado=EstadoCita.PENDIENTE.value,
    )
    session.add(cita)
    cupo.estado = EstadoCupo.OCUPADO.value
    await session.flush()
    return cita


async def _ofertar_cupo(session: AsyncSession, cupo: models.Cupos) -> dict[str, Any] | None:
    if cupo.estado != EstadoCupo.DISPONIBLE.value:
        return None

    ahora = datetime.now()
    fecha_cita = datetime.combine(cupo.fecha_cupo, cupo.hora_cupo)
    fecha_expiracion = _calcular_expiracion_oferta(fecha_cita, ahora)
    if fecha_expiracion is None:
        return None

    agenda = await session.get(models.Agenda_Medicas, cupo.id_agenda_medica)
    if not agenda or agenda.estado != EstadoAgenda.ACTIVO.value:
        return None

    medico_cupo = await session.get(models.Medicos, agenda.id_medico)
    if not medico_cupo:
        return None
    especialidad_cupo = medico_cupo.especialidad.strip().lower()

    candidatos = (
        await session.scalars(
            select(models.Lista_Espera)
            .outerjoin(
                models.Medicos,
                models.Lista_Espera.id_medico == models.Medicos.id,
            )
            .where(
                models.Lista_Espera.estado == EstadoEspera.PENDIENTE.value,
                or_(
                    models.Lista_Espera.id_medico.is_(None),
                    func.lower(func.trim(models.Medicos.especialidad))
                    == especialidad_cupo,
                ),
            )
            .order_by(
                models.Lista_Espera.fecha_solicitud.asc(),
                models.Lista_Espera.id.asc(),
            )
            .with_for_update(of=models.Lista_Espera, skip_locked=True)
        )
    ).all()

    for candidato in candidatos:
        if await _paciente_tiene_cita_activa(session, candidato.id_paciente, cupo.fecha_cupo):
            continue

        candidato.estado = EstadoEspera.OFRECIDA.value
        candidato.id_cupo_ofrecido = cupo.id
        candidato.fecha_oferta = ahora
        candidato.fecha_expiracion = fecha_expiracion
        cupo.estado = EstadoCupo.RESERVADO.value

        paciente = await session.get(models.Pacientes, candidato.id_paciente)
        medico = await session.get(models.Medicos, agenda.id_medico)
        await session.flush()

        return {
            "id_lista_espera": candidato.id,
            "id_paciente": candidato.id_paciente,
            "paciente": f"{paciente.nombres} {paciente.apellidos}" if paciente else "",
            "id_cupo": cupo.id,
            "id_medico": agenda.id_medico,
            "medico": f"{medico.apellidos} {medico.nombres}" if medico else "",
            "fecha_cupo": cupo.fecha_cupo,
            "hora_cupo": cupo.hora_cupo,
            "fecha_expiracion": candidato.fecha_expiracion,
        }

    return None


async def _buscar_cupos_disponibles(
    session: AsyncSession,
    id_medico: int | None = None,
    limite: int = 20,
) -> list[models.Cupos]:
    ahora = datetime.now()
    query = (
        select(models.Cupos)
        .join(
            models.Agenda_Medicas,
            models.Cupos.id_agenda_medica == models.Agenda_Medicas.id,
        )
        .join(
            models.Medicos,
            models.Agenda_Medicas.id_medico == models.Medicos.id,
        )
        .where(
            models.Cupos.estado == EstadoCupo.DISPONIBLE.value,
            models.Agenda_Medicas.estado == EstadoAgenda.ACTIVO.value,
            or_(
                models.Cupos.fecha_cupo > ahora.date(),
                and_(
                    models.Cupos.fecha_cupo == ahora.date(),
                    models.Cupos.hora_cupo > ahora.time(),
                ),
            ),
        )
    )

    if id_medico is not None:
        medico = await session.get(models.Medicos, id_medico)
        if not medico:
            return []
        especialidad = medico.especialidad.strip().lower()
        query = query.where(
            func.lower(func.trim(models.Medicos.especialidad)) == especialidad
        )

    query = (
        query.order_by(
            models.Cupos.fecha_cupo.asc(),
            models.Cupos.hora_cupo.asc(),
            models.Cupos.id.asc(),
        )
        .limit(limite)
        .with_for_update(of=models.Cupos, skip_locked=True)
    )
    return list((await session.scalars(query)).all())


async def _procesar_cupos_disponibles(
    session: AsyncSession,
    id_medico: int | None = None,
    limite: int = 20,
    id_entrada: int | None = None,
) -> int:
    pendientes = await session.scalar(
        select(func.count(models.Lista_Espera.id)).where(
            models.Lista_Espera.estado == EstadoEspera.PENDIENTE.value
        )
    )
    if not pendientes:
        return 0

    ofertas = 0
    for cupo in await _buscar_cupos_disponibles(session, id_medico, limite):
        if await _ofertar_cupo(session, cupo):
            ofertas += 1
            pendientes -= 1
            if id_entrada is not None:
                entrada = await session.get(models.Lista_Espera, id_entrada)
                if entrada and entrada.estado == EstadoEspera.OFRECIDA.value:
                    break
            if pendientes <= 0:
                break

    return ofertas


async def _expirar_ofertas(session: AsyncSession) -> tuple[int, int]:
    ahora = datetime.now()
    entradas = (
        await session.scalars(
            select(models.Lista_Espera)
            .where(
                models.Lista_Espera.estado == EstadoEspera.OFRECIDA.value,
                models.Lista_Espera.fecha_expiracion.is_not(None),
                models.Lista_Espera.fecha_expiracion < ahora,
            )
            .with_for_update(skip_locked=True)
        )
    ).all()

    expiradas = 0
    nuevas = 0
    for entrada in entradas:
        entrada.estado = EstadoEspera.EXPIRADA.value
        cupo = None
        if entrada.id_cupo_ofrecido:
            cupo = await session.get(
                models.Cupos, entrada.id_cupo_ofrecido, with_for_update=True
            )
        if cupo and cupo.estado == EstadoCupo.RESERVADO.value:
            cupo.estado = EstadoCupo.DISPONIBLE.value
            if await _ofertar_cupo(session, cupo):
                nuevas += 1
        expiradas += 1

    return expiradas, nuevas


class UsuariosRepository:
    def __init__(self, session: AsyncSession = Depends(get_conexion)):
        self.session = session

    async def crear_usuario(self, usuario: UsuarioCreateSchema) -> models.Usuarios:
        nuevo_usuario = models.Usuarios(
            id_rol=usuario.id_rol,
            tipo_documento=usuario.tipo_documento,
            numero_documento=usuario.numero_documento,
            email=usuario.email,
            password=hash_password(usuario.password)
        )
        self.session.add(nuevo_usuario)
        await self.session.commit()
        await self.session.refresh(nuevo_usuario)
        return nuevo_usuario

    async def obtener_usuarios(self) -> List[dict[str, Any]]:
        query = select(models.Usuarios.id,
                       models.Roles.rol,
                       models.Usuarios.tipo_documento,
                       models.Usuarios.numero_documento,
                       models.Usuarios.email,
                       models.Usuarios.is_active,
                        models.Usuarios.created_at
                       ).join(models.Roles, models.Usuarios.id_rol == models.Roles.id)
        result = await self.session.execute(query)
        usuarios = result.mappings().all()
        return [dict(u) for u in usuarios]

    async def obtener_usuario_por_id(self, id_usuario: int) -> models.Usuarios:
        query = select(models.Usuarios.id,
            models.Roles.rol,
            models.Usuarios.tipo_documento,
            models.Usuarios.numero_documento,
            models.Usuarios.email,
            models.Usuarios.is_active,
             models.Usuarios.created_at
            ).join(models.Roles, models.Usuarios.id_rol == models.Roles.id).where(models.Usuarios.id == id_usuario)
        result = await self.session.execute(query)
        usuario = result.one_or_none()
        if not usuario:
            raise ValueError(f"No existe usuario con id: {id_usuario}")
    
        return usuario

    async def actualizar_usuario(self, usuario_id: int, datos: UsuarioUpdateSchema) -> models.Usuarios:
        usuario = await self.session.get(models.Usuarios, usuario_id)
        if not usuario:
            raise ValueError(f"Usuario con id {usuario_id} no encontrado")

        for dato,valor in datos.model_dump(exclude_unset=True).items():
            if dato == "password":
                valor = hash_password(valor)
            setattr(usuario, dato, valor)

        await self.session.commit()
        await self.session.refresh(usuario)
        return usuario

    async def eliminar_usuario(self, usuario_id: int) -> str:
        usuario = await self.session.get(models.Usuarios, usuario_id)
        if not usuario:
            raise ValueError(f"Usuario con id {usuario_id} no encontrado")
        await self.session.delete(usuario)
        await self.session.commit()
        return f"Usuario con id {usuario_id} eliminado: {usuario.paciente.nombres} {usuario.paciente.apellidos}" if usuario.paciente else f"Usuario con id {usuario_id} eliminado"

    async def crear_rol(self, rol: RolCreateSchema) -> models.Roles:
        nuevo_rol = models.Roles(
            rol=rol.rol
        )
        self.session.add(nuevo_rol)
        await self.session.commit()
        await self.session.refresh(nuevo_rol)
        return nuevo_rol

    async def obtener_roles(self) -> List[models.Roles]:
        query = select(models.Roles)
        result = await self.session.scalars(query)
        roles = result.all()
        return list(roles)
        
class PacientesRepository:

    def __init__(self, session: AsyncSession = Depends(get_conexion)):
        self.session = session

    async def obtener_pacientes(self) -> List[dict[str, Any]]:
        query = select(
            models.Pacientes.id,
            models.Pacientes.id_usuario,
            models.Pacientes.nombres,
            models.Pacientes.apellidos,
            models.Pacientes.fecha_nacimiento,
            models.Pacientes.telefono,
            models.Usuarios.numero_documento,
            models.Usuarios.email,
            models.Pacientes.direccion).join(models.Usuarios, models.Pacientes.id_usuario == models.Usuarios.id)
        result = await self.session.execute(query)
        pacientes = result.mappings().all()
        return [dict(p) for p in pacientes]

    async def obtener_paciente_por_id(self, id_paciente) -> models.Pacientes:
        query = select(
            models.Pacientes.id,
            models.Pacientes.id_usuario,
            models.Pacientes.nombres,
            models.Pacientes.apellidos,
            models.Pacientes.fecha_nacimiento,
            models.Pacientes.telefono,
            models.Usuarios.numero_documento,
            models.Usuarios.email,
            models.Pacientes.direccion
            ).join(models.Usuarios, models.Pacientes.id_usuario == models.Usuarios.id).where(models.Pacientes.id == id_paciente)
        result = await self.session.execute(query)
        paciente = result.one_or_none()
        if not paciente:
            raise ValueError(f"No existe paciente con id: {id_paciente}")
        return paciente


    async def crear_paciente(self, paciente: PacienteCreateSchema) -> models.Pacientes:
        nuevo_paciente = models.Pacientes(
            id_usuario=paciente.id_usuario,
            nombres=paciente.nombres,
            apellidos=paciente.apellidos,
            fecha_nacimiento=paciente.fecha_nacimiento,
            telefono=paciente.telefono,
            direccion=paciente.direccion
        )
        self.session.add(nuevo_paciente)
        await self.session.commit()
        await self.session.refresh(nuevo_paciente)
        return nuevo_paciente

    async def actualizar_paciente(self, paciente_id: int, datos: PacienteUpdateSchema) -> models.Pacientes:
        paciente = await self.session.get(models.Pacientes, paciente_id)
        if not paciente:
            raise ValueError(f"Paciente con id {paciente_id} no encontrado")

        for dato, valor in datos.model_dump(exclude_unset=True).items():
            setattr(paciente, dato, valor)

        await self.session.commit()
        await self.session.refresh(paciente)
        return paciente

    async def eliminar_paciente(self, paciente_id: int) -> str:
        paciente = await self.session.get(models.Pacientes, paciente_id)
        if not paciente:
            raise ValueError(f"Paciente con id {paciente_id} no encontrado")
        await self.session.delete(paciente)
        await self.session.commit()
        return f"Paciente con id {paciente_id} eliminado: {paciente.nombres} {paciente.apellidos}"

class MedicosRepository:

    def __init__(self, session: AsyncSession = Depends(get_conexion)):
        self.session = session

    async def obtener_medicos(self) -> List[dict[str, Any]]:
        query = select(
                    models.Medicos.id,
                    models.Medicos.id_usuario,
                    models.Medicos.nombres,
                    models.Medicos.apellidos,
                    models.Medicos.telefono,
                    models.Usuarios.numero_documento,
                    models.Usuarios.email,
                    models.Medicos.tarjeta_profesional,
                    models.Medicos.especialidad,
                    models.Medicos.consultorio).join(models.Usuarios, models.Medicos.id_usuario == models.Usuarios.id)
        result = await self.session.execute(query)
        medicos = result.mappings().all()
        return [dict(m) for m in medicos]

    async def obtener_medico_por_id(self, id_medico) -> models.Medicos:
        query = select(
            models.Medicos.id,
            models.Medicos.id_usuario,
            models.Medicos.nombres,
            models.Medicos.apellidos,
            models.Medicos.telefono,
            models.Usuarios.numero_documento,
            models.Usuarios.email,
            models.Medicos.tarjeta_profesional,
            models.Medicos.especialidad,
            models.Medicos.consultorio
            ).join(models.Usuarios, models.Medicos.id_usuario == models.Usuarios.id).where(models.Medicos.id == id_medico)
        result = await self.session.execute(query)
        medico = result.one_or_none()
        if not medico:
            raise ValueError(f"No existe medico con id: {id_medico}")
        return medico

    async def crear_medico(self, medico: MedicoCreateSchema) -> models.Medicos:
        nuevo_medico = models.Medicos(
            id_usuario=medico.id_usuario,
            nombres=medico.nombres,
            apellidos=medico.apellidos,
            telefono=medico.telefono,
            tarjeta_profesional=medico.tarjeta_profesional,
            especialidad=medico.especialidad,
            consultorio=medico.consultorio
        )
        self.session.add(nuevo_medico)
        await self.session.commit()
        await self.session.refresh(nuevo_medico)
        return nuevo_medico

    async def actualizar_medico(self, medico_id: int, datos: MedicoUpdateSchema) -> models.Medicos:
        medico = await self.session.get(models.Medicos, medico_id)

        if not medico:
            raise ValueError(f"Medico con id {medico_id} no encontrado")

        for dato, valor in datos.model_dump(exclude_unset=True).items():
            setattr(medico, dato, valor)

        await self.session.commit()
        await self.session.refresh(medico)
        return medico
    
    async def eliminar_medico(self, medico_id:int)-> str:
        medico = await self.session.get(models.Medicos, medico_id)

        if not medico:
                    raise ValueError(f"Medico con id {medico_id} no encontrado")

        await self.session.delete(medico)
        await self.session.commit()
        return f"Paciente con id {medico_id} eliminado: {medico.nombres} {medico.apellidos}"

class AuthenticationRepository:
    def __init__(self, session: AsyncSession = Depends(get_conexion)):
        self.session = session

    async def login(self, data: LoginSchema) -> bool:
        query = select(models.Usuarios).where(models.Usuarios.numero_documento == data.numero_documento)
        result = await self.session.execute(query)
        usuario = result.scalar_one_or_none()

    
        if not usuario:
            raise ValueError('El usuario con el documento no existe')

        es_valida = verify_password(data.password, usuario.password)

        if not es_valida:
            return False

        return True

    async def register(self, data: RegistroUsuarioSchema) -> dict:
        try:
            nuevo_usuario = models.Usuarios(
                id_rol=data.id_rol,
                tipo_documento=data.tipo_documento,
                numero_documento=data.numero_documento,
                email=data.email,
                password=hash_password(data.password)
            )
            self.session.add(nuevo_usuario)
            await self.session.flush()

            query = select(models.Roles.rol).where(models.Roles.id == data.id_rol)
            result = await self.session.execute(query)
            rol = result.scalar_one_or_none()

            if rol == "paciente":
                nuevo_paciente = models.Pacientes(
                    id_usuario=nuevo_usuario.id,
                    nombres=data.nombres,
                    apellidos=data.apellidos,
                    fecha_nacimiento=data.fecha_nacimiento,
                    telefono=data.telefono,
                    direccion=data.direccion
                )
                self.session.add(nuevo_paciente)

            elif rol == "medico":
                nuevo_medico = models.Medicos(
                    id_usuario=nuevo_usuario.id,
                    nombres=data.nombres,
                    apellidos=data.apellidos,
                    telefono=data.telefono,
                    tarjeta_profesional=data.tarjeta_profesional,
                    especialidad=data.especialidad,
                    consultorio=data.consultorio
                )
                self.session.add(nuevo_medico)

            await self.session.commit()
            if rol == "paciente":
                await self.session.refresh(nuevo_paciente)
                return {"message":f"Paciente:  {nuevo_paciente.nombres} {nuevo_paciente.apellidos} registrado con exito."}
            elif rol == "medico":
                await self.session.refresh(nuevo_medico)
                return {"message":f"Medico:  {nuevo_medico.nombres} {nuevo_medico.apellidos} registrado con exito."}
            else:
                await self.session.refresh(nuevo_usuario)
                return {"message": f"Usuario: documento: {nuevo_usuario.numero_documento} correo:{nuevo_usuario.email} registrado con exito"}
        except Exception as e:
            await self.session.rollback()
            raise e
        
class AgendaRepository:
    def __init__(self, session: AsyncSession = Depends(get_conexion)):
        self.session = session

    #obtenemos la agenda posando el id del medico, ya que es mas optimo mostrarla por medico
    async def obtener_agenda(self, id_medico:int ) -> List[dict[str,Any]]:
        medico = func.concat(models.Medicos.apellidos, ' ', models.Medicos.nombres)
        query = select(
            models.Agenda_Medicas.id,
            medico.label("medico"),
            models.Agenda_Medicas.fecha_inicio,
            models.Agenda_Medicas.fecha_fin,
            models.Agenda_Medicas.duracion_cita,
            models.Agenda_Medicas.hora_inicio,
            models.Agenda_Medicas.hora_fin,
            models.Agenda_Medicas.estado
        ).join(models.Medicos, models.Agenda_Medicas.id_medico == models.Medicos.id).where(models.Agenda_Medicas.id_medico == id_medico)

        result = await self.session.execute(query)
        agenda = result.mappings().all()
        if not agenda:
            raise ErrorNoEncontrado(f"No hay agenda asignada al medico con id: {id_medico}")
        
        return [dict(a) for a in agenda]

    async def crear_agenda(self, data: AgendaCreateSchema) -> models.Agenda_Medicas:
        medico = await self.session.get(models.Medicos, data.id_medico)
        if not medico:
            raise ErrorNoEncontrado(f"No existe medico con id: {data.id_medico}")

        nueva_agenda = models.Agenda_Medicas(
            id_medico=data.id_medico,
            fecha_inicio = data.fecha_inicio,
            fecha_fin = data.fecha_fin,
            duracion_cita = data.duracion_cita,
            hora_inicio = data.hora_inicio,
            hora_fin = data.hora_fin,
            estado = EstadoAgenda.ACTIVO.value,
        )
        _validar_agenda(nueva_agenda)

        self.session.add(nueva_agenda)
        await self.session.flush()
        await _generar_cupos_agenda(self.session, nueva_agenda)
        await self.session.commit()
        await self.session.refresh(nueva_agenda)
        return nueva_agenda

    async def actualizar_agenda(self, data: AgendaUpdateSchema, id_agenda:int)-> models.Agenda_Medicas:
        agenda = await self.session.get(models.Agenda_Medicas, id_agenda)
        if not agenda:
            raise ErrorNoEncontrado(f"No existe agenda con id: {id_agenda}")

        cambios = data.model_dump(exclude_unset=True)
        campos_horario = {"fecha_inicio", "fecha_fin", "duracion_cita", "hora_inicio", "hora_fin"}
        cambio_horario = bool(campos_horario.intersection(cambios.keys()))

        for dato, valor in cambios.items():
            setattr(agenda, dato, valor)

        _validar_agenda(agenda)

        if cambio_horario:
            hoy = date.today()
            await self.session.execute(
                delete(models.Cupos).where(
                    models.Cupos.id_agenda_medica == id_agenda,
                    models.Cupos.estado == EstadoCupo.DISPONIBLE.value,
                    models.Cupos.fecha_cupo >= hoy,
                )
            )
            await _generar_cupos_agenda(self.session, agenda)

        await self.session.commit()
        await self.session.refresh(agenda)
        return agenda

    async def eliminar_agenda(self, id_agenda: int):
        agenda = await self.session.get(models.Agenda_Medicas, id_agenda)
        if not agenda:
            raise ErrorNoEncontrado(f"No existe agenda con id: {id_agenda}")

        total_citas = await self.session.scalar(
            select(func.count(models.Citas.id))
            .select_from(models.Citas)
            .join(models.Cupos, models.Citas.id_cupo == models.Cupos.id)
            .where(models.Cupos.id_agenda_medica == id_agenda)
        )

        if total_citas:
            agenda.estado = EstadoAgenda.INACTIVO.value
            await self.session.commit()
            return f"Agenda con id {id_agenda} desactivada porque tiene citas asociadas"

        await self.session.delete(agenda)
        await self.session.commit()
        return "Agenda eliminada"


class CuposRepository:
    def __init__(self, session: AsyncSession = Depends(get_conexion)):
        self.session = session

    async def generar_cupos(self, id_agenda: int) -> dict[str, int]:
        agenda = await self.session.get(models.Agenda_Medicas, id_agenda)
        if not agenda:
            raise ErrorNoEncontrado(f"No existe agenda con id: {id_agenda}")

        resumen = await _generar_cupos_agenda(self.session, agenda)
        await self.session.commit()
        return resumen

    async def obtener_disponibles(
        self,
        especialidad: str | None = None,
        id_medico: int | None = None,
        fecha_inicio: date | None = None,
        fecha_fin: date | None = None,
        limite: int = 200,
    ) -> List[dict[str, Any]]:
        async with self.session.begin():
            await _expirar_ofertas(self.session)

        hoy = date.today()
        ahora = datetime.now()
        fecha_inicio = fecha_inicio or hoy
        fecha_fin = fecha_fin or (hoy + timedelta(days=30))
        if fecha_fin < fecha_inicio:
            raise ErrorReglaNegocio("La fecha de fin no puede ser anterior a la fecha de inicio")

        medico_nombre = func.concat(models.Medicos.apellidos, ' ', models.Medicos.nombres)
        query = (
            select(
                models.Cupos.id.label("id_cupo"),
                models.Cupos.fecha_cupo,
                models.Cupos.hora_cupo,
                models.Agenda_Medicas.duracion_cita,
                models.Medicos.id.label("id_medico"),
                medico_nombre.label("medico"),
                models.Medicos.especialidad,
                models.Medicos.consultorio,
            )
            .join(models.Agenda_Medicas, models.Cupos.id_agenda_medica == models.Agenda_Medicas.id)
            .join(models.Medicos, models.Agenda_Medicas.id_medico == models.Medicos.id)
            .where(
                models.Cupos.estado == EstadoCupo.DISPONIBLE.value,
                models.Agenda_Medicas.estado == EstadoAgenda.ACTIVO.value,
                models.Cupos.fecha_cupo >= fecha_inicio,
                models.Cupos.fecha_cupo <= fecha_fin,
                or_(
                    models.Cupos.fecha_cupo > hoy,
                    and_(
                        models.Cupos.fecha_cupo == hoy,
                        models.Cupos.hora_cupo > ahora.time(),
                    ),
                ),
            )
            .order_by(models.Cupos.fecha_cupo.asc(), models.Cupos.hora_cupo.asc())
            .limit(limite)
        )

        if especialidad:
            query = query.where(
                func.lower(models.Medicos.especialidad) == especialidad.lower()
            )
        if id_medico:
            query = query.where(models.Medicos.id == id_medico)

        result = await self.session.execute(query)
        return [dict(c) for c in result.mappings().all()]

    async def obtener_cupo_por_id(self, id_cupo: int) -> dict[str, Any]:
        medico_nombre = func.concat(models.Medicos.apellidos, ' ', models.Medicos.nombres)
        query = (
            select(
                models.Cupos.id.label("id_cupo"),
                models.Cupos.fecha_cupo,
                models.Cupos.hora_cupo,
                models.Cupos.estado.label("estado_cupo"),
                models.Agenda_Medicas.duracion_cita,
                models.Agenda_Medicas.estado.label("estado_agenda"),
                models.Medicos.id.label("id_medico"),
                medico_nombre.label("medico"),
                models.Medicos.especialidad,
                models.Medicos.consultorio,
            )
            .join(models.Agenda_Medicas, models.Cupos.id_agenda_medica == models.Agenda_Medicas.id)
            .join(models.Medicos, models.Agenda_Medicas.id_medico == models.Medicos.id)
            .where(models.Cupos.id == id_cupo)
        )
        result = await self.session.execute(query)
        cupo = result.mappings().one_or_none()
        if not cupo:
            raise ErrorNoEncontrado(f"No existe cupo con id: {id_cupo}")
        return dict(cupo)

    async def cambiar_estado(self, id_cupo: int, data: CupoUpdateSchema) -> models.Cupos:
        async with self.session.begin():
            cupo = await self.session.get(models.Cupos, id_cupo, with_for_update=True)
            if not cupo:
                raise ErrorNoEncontrado(f"No existe cupo con id: {id_cupo}")

            if data.estado in (EstadoCupo.OCUPADO, EstadoCupo.RESERVADO):
                raise ErrorReglaNegocio(
                    "Los estados ocupado y reservado solo se asignan mediante citas u ofertas"
                )

            cita_activa = await self.session.scalar(
                select(func.count(models.Citas.id)).where(
                    models.Citas.id_cupo == id_cupo,
                    models.Citas.estado.in_(ESTADOS_CITA_ACTIVOS),
                )
            )
            if cita_activa:
                raise ErrorReglaNegocio("El cupo tiene una cita activa asociada")

            cupo.estado = data.estado.value

        return cupo


class CitasRepository:
    def __init__(self, session: AsyncSession = Depends(get_conexion)):
        self.session = session

    async def crear_cita(self, data: CitaCreateSchema) -> models.Citas:
        try:
            async with self.session.begin():
                await _expirar_ofertas(self.session)

                cupo = await self.session.scalar(
                    select(models.Cupos)
                    .where(models.Cupos.id == data.id_cupo)
                    .with_for_update()
                )
                if not cupo:
                    raise ErrorNoEncontrado(f"No existe cupo con id: {data.id_cupo}")

                agenda = await self.session.get(
                    models.Agenda_Medicas, cupo.id_agenda_medica
                )
                if not agenda or agenda.estado != EstadoAgenda.ACTIVO.value:
                    raise ErrorReglaNegocio("La agenda del cupo no está activa")

                if cupo.estado != EstadoCupo.DISPONIBLE.value:
                    raise ErrorConflicto("El cupo ya no está disponible")

                if datetime.combine(cupo.fecha_cupo, cupo.hora_cupo) <= datetime.now():
                    raise ErrorReglaNegocio("El cupo seleccionado ya pasó")

                paciente = await self.session.get(models.Pacientes, data.id_paciente)
                if not paciente:
                    raise ErrorNoEncontrado(f"No existe paciente con id: {data.id_paciente}")

                cita = await _crear_cita_para_cupo(
                    self.session, cupo, data.id_paciente, data.motivo_consulta
                )
        except IntegrityError as exc:
            raise ErrorConflicto("El cupo fue reservado por otro usuario") from exc

        return cita

    def _query_detalle(self):
        paciente_nombre = func.concat(
            models.Pacientes.nombres, ' ', models.Pacientes.apellidos
        )
        medico_nombre = func.concat(
            models.Medicos.apellidos, ' ', models.Medicos.nombres
        )
        return (
            select(
                models.Citas.id,
                models.Citas.id_cupo,
                models.Citas.id_paciente,
                models.Citas.motivo_consulta,
                models.Citas.estado,
                models.Citas.created_at,
                models.Citas.updated_at,
                paciente_nombre.label("paciente"),
                models.Usuarios.numero_documento,
                models.Usuarios.email,
                models.Medicos.id.label("id_medico"),
                medico_nombre.label("medico"),
                models.Medicos.especialidad,
                models.Medicos.consultorio,
                models.Cupos.fecha_cupo,
                models.Cupos.hora_cupo,
            )
            .join(models.Pacientes, models.Citas.id_paciente == models.Pacientes.id)
            .join(models.Usuarios, models.Pacientes.id_usuario == models.Usuarios.id)
            .join(models.Cupos, models.Citas.id_cupo == models.Cupos.id)
            .join(models.Agenda_Medicas, models.Cupos.id_agenda_medica == models.Agenda_Medicas.id)
            .join(models.Medicos, models.Agenda_Medicas.id_medico == models.Medicos.id)
        )

    async def obtener_citas(
        self,
        id_paciente: int | None = None,
        id_medico: int | None = None,
        estado: str | None = None,
        fecha: date | None = None,
        fecha_inicio: date | None = None,
        fecha_fin: date | None = None,
    ) -> List[dict[str, Any]]:
        query = self._query_detalle()
        if id_paciente:
            query = query.where(models.Citas.id_paciente == id_paciente)
        if id_medico:
            query = query.where(models.Medicos.id == id_medico)
        if estado:
            query = query.where(models.Citas.estado == estado)
        if fecha:
            query = query.where(models.Cupos.fecha_cupo == fecha)
        if fecha_inicio:
            query = query.where(models.Cupos.fecha_cupo >= fecha_inicio)
        if fecha_fin:
            query = query.where(models.Cupos.fecha_cupo <= fecha_fin)

        query = query.order_by(
            models.Cupos.fecha_cupo.asc(), models.Cupos.hora_cupo.asc()
        )
        result = await self.session.execute(query)
        return [dict(c) for c in result.mappings().all()]

    async def obtener_cita_por_id(self, id_cita: int) -> dict[str, Any]:
        query = self._query_detalle().where(models.Citas.id == id_cita)
        result = await self.session.execute(query)
        cita = result.mappings().one_or_none()
        if not cita:
            raise ErrorNoEncontrado(f"No existe cita con id: {id_cita}")
        return dict(cita)

    async def obtener_jornada(self, id_medico: int, fecha: date) -> List[dict[str, Any]]:
        query = (
            self._query_detalle()
            .where(models.Medicos.id == id_medico, models.Cupos.fecha_cupo == fecha)
            .order_by(models.Cupos.hora_cupo.asc())
        )
        result = await self.session.execute(query)
        return [dict(c) for c in result.mappings().all()]

    async def cancelar_cita(self, id_cita: int) -> tuple[models.Citas, dict[str, Any] | None]:
        async with self.session.begin():
            cita = await self.session.scalar(
                select(models.Citas)
                .where(models.Citas.id == id_cita)
                .with_for_update()
            )
            if not cita:
                raise ErrorNoEncontrado(f"No existe cita con id: {id_cita}")

            if cita.estado not in ESTADOS_CITA_ACTIVOS:
                raise ErrorReglaNegocio(
                    f"La cita no se puede cancelar porque está en estado {cita.estado}"
                )

            oferta = None
            cupo = await self.session.get(models.Cupos, cita.id_cupo, with_for_update=True)
            cita.estado = EstadoCita.CANCELADA.value
            if cupo:
                cupo.estado = EstadoCupo.DISPONIBLE.value
                oferta = await _ofertar_cupo(self.session, cupo)

        await self.session.refresh(cita)
        return cita, oferta

    async def actualizar_estado_cita(
        self, id_cita: int, nuevo_estado: str
    ) -> tuple[models.Citas, dict[str, Any] | None]:
        async with self.session.begin():
            cita = await self.session.scalar(
                select(models.Citas)
                .where(models.Citas.id == id_cita)
                .with_for_update()
            )
            if not cita:
                raise ErrorNoEncontrado(f"No existe cita con id: {id_cita}")

            oferta = None
            if nuevo_estado == EstadoCita.CONFIRMADA.value:
                if cita.estado != EstadoCita.PENDIENTE.value:
                    raise ErrorReglaNegocio(
                        f"Solo se confirma una cita pendiente, estado actual: {cita.estado}"
                    )
                cita.estado = EstadoCita.CONFIRMADA.value

            elif nuevo_estado in (EstadoCita.ATENDIDA.value, EstadoCita.NO_ASISTIO.value):
                if cita.estado not in ESTADOS_CITA_ACTIVOS:
                    raise ErrorReglaNegocio(
                        f"La cita ya está cerrada con estado {cita.estado}"
                    )
                cita.estado = nuevo_estado

                if nuevo_estado == EstadoCita.NO_ASISTIO.value:
                    cupo = await self.session.get(
                        models.Cupos, cita.id_cupo, with_for_update=True
                    )
                    if cupo:
                        cupo.estado = EstadoCupo.DISPONIBLE.value
                        oferta = await _ofertar_cupo(self.session, cupo)
            else:
                raise ErrorReglaNegocio(f"Estado de cita no permitido: {nuevo_estado}")

        await self.session.refresh(cita)
        return cita, oferta


class ListaEsperaRepository:
    def __init__(self, session: AsyncSession = Depends(get_conexion)):
        self.session = session

    def _query_detalle(self):
        paciente_nombre = func.concat(
            models.Pacientes.nombres, ' ', models.Pacientes.apellidos
        )
        medico_preferido = aliased(models.Medicos, name="medico_preferido")
        medico_oferta = aliased(models.Medicos, name="medico_oferta")
        agenda_oferta = aliased(models.Agenda_Medicas, name="agenda_oferta")
        medico_nombre = func.concat(
            medico_preferido.apellidos, ' ', medico_preferido.nombres
        )
        medico_oferta_nombre = func.concat(
            medico_oferta.apellidos, ' ', medico_oferta.nombres
        )
        return (
            select(
                models.Lista_Espera.id,
                models.Lista_Espera.id_paciente,
                models.Lista_Espera.id_medico,
                models.Lista_Espera.prioridad,
                models.Lista_Espera.id_cupo_ofrecido,
                models.Lista_Espera.fecha_solicitud,
                models.Lista_Espera.fecha_oferta,
                models.Lista_Espera.fecha_expiracion,
                models.Lista_Espera.estado,
                models.Lista_Espera.created_at,
                paciente_nombre.label("paciente"),
                models.Usuarios.numero_documento,
                models.Usuarios.email,
                medico_nombre.label("medico"),
                medico_preferido.especialidad.label("especialidad"),
                medico_oferta_nombre.label("medico_ofrecido"),
                medico_oferta.especialidad.label("especialidad_ofrecida"),
                models.Cupos.fecha_cupo,
                models.Cupos.hora_cupo,
            )
            .join(models.Pacientes, models.Lista_Espera.id_paciente == models.Pacientes.id)
            .join(models.Usuarios, models.Pacientes.id_usuario == models.Usuarios.id)
            .outerjoin(
                medico_preferido,
                models.Lista_Espera.id_medico == medico_preferido.id,
            )
            .outerjoin(
                models.Cupos,
                models.Lista_Espera.id_cupo_ofrecido == models.Cupos.id,
            )
            .outerjoin(
                agenda_oferta,
                models.Cupos.id_agenda_medica == agenda_oferta.id,
            )
            .outerjoin(
                medico_oferta,
                agenda_oferta.id_medico == medico_oferta.id,
            )
        )

    async def crear_entrada(self, data: ListaEsperaCreateSchema) -> models.Lista_Espera:
        async with self.session.begin():
            paciente = await self.session.get(models.Pacientes, data.id_paciente)
            if not paciente:
                raise ErrorNoEncontrado(f"No existe paciente con id: {data.id_paciente}")

            if data.id_medico:
                medico = await self.session.get(models.Medicos, data.id_medico)
                if not medico:
                    raise ErrorNoEncontrado(f"No existe medico con id: {data.id_medico}")

            filtros = [
                models.Lista_Espera.id_paciente == data.id_paciente,
                models.Lista_Espera.estado.in_(
                    [EstadoEspera.PENDIENTE.value, EstadoEspera.OFRECIDA.value]
                ),
            ]
            if data.id_medico is None:
                filtros.append(models.Lista_Espera.id_medico.is_(None))
            else:
                filtros.append(models.Lista_Espera.id_medico == data.id_medico)

            duplicada = await self.session.scalar(
                select(func.count(models.Lista_Espera.id)).where(*filtros)
            )
            if duplicada:
                raise ErrorConflicto("El paciente ya tiene una solicitud activa en lista de espera")

            entrada = models.Lista_Espera(
                id_paciente=data.id_paciente,
                id_medico=data.id_medico,
                prioridad=data.prioridad,
                estado=EstadoEspera.PENDIENTE.value,
            )
            self.session.add(entrada)
            await self.session.flush()

            await _procesar_cupos_disponibles(
                self.session, data.id_medico, id_entrada=entrada.id
            )

        return entrada

    async def obtener_lista(
        self,
        id_medico: int | None = None,
        estado: str | None = None,
    ) -> List[dict[str, Any]]:
        async with self.session.begin():
            await _expirar_ofertas(self.session)
            await _procesar_cupos_disponibles(self.session, id_medico)

        query = self._query_detalle()
        if id_medico:
            query = query.where(
                or_(
                    models.Lista_Espera.id_medico == id_medico,
                    models.Lista_Espera.id_medico.is_(None),
                )
            )
        if estado:
            query = query.where(models.Lista_Espera.estado == estado)

        query = query.order_by(
            models.Lista_Espera.fecha_solicitud.asc(),
            models.Lista_Espera.id.asc(),
        )
        result = await self.session.execute(query)
        return [dict(e) for e in result.mappings().all()]

    async def obtener_entrada(self, id_entrada: int) -> dict[str, Any]:
        query = self._query_detalle().where(models.Lista_Espera.id == id_entrada)
        result = await self.session.execute(query)
        entrada = result.mappings().one_or_none()
        if not entrada:
            raise ErrorNoEncontrado(f"No existe entrada en lista de espera con id: {id_entrada}")
        return dict(entrada)

    async def cancelar_entrada(self, id_entrada: int) -> models.Lista_Espera:
        async with self.session.begin():
            entrada = await self.session.get(
                models.Lista_Espera, id_entrada, with_for_update=True
            )
            if not entrada:
                raise ErrorNoEncontrado(
                    f"No existe entrada en lista de espera con id: {id_entrada}"
                )
            if entrada.estado not in (
                EstadoEspera.PENDIENTE.value,
                EstadoEspera.OFRECIDA.value,
            ):
                raise ErrorReglaNegocio(
                    f"La solicitud no se puede cancelar porque está en estado {entrada.estado}"
                )

            if entrada.estado == EstadoEspera.OFRECIDA.value and entrada.id_cupo_ofrecido:
                cupo = await self.session.get(
                    models.Cupos, entrada.id_cupo_ofrecido, with_for_update=True
                )
                if cupo and cupo.estado == EstadoCupo.RESERVADO.value:
                    cupo.estado = EstadoCupo.DISPONIBLE.value
                    await _ofertar_cupo(self.session, cupo)

            entrada.estado = EstadoEspera.CANCELADA.value

        return entrada

    async def aceptar_oferta(self, id_entrada: int) -> models.Citas:
        error: Exception | None = None
        cita: models.Citas | None = None

        async with self.session.begin():
            entrada = await self.session.get(
                models.Lista_Espera, id_entrada, with_for_update=True
            )
            if not entrada:
                raise ErrorNoEncontrado(
                    f"No existe entrada en lista de espera con id: {id_entrada}"
                )
            if entrada.estado != EstadoEspera.OFRECIDA.value or not entrada.id_cupo_ofrecido:
                raise ErrorReglaNegocio("La solicitud no tiene una oferta activa")

            vencida = (
                entrada.fecha_expiracion is not None
                and entrada.fecha_expiracion < datetime.now()
            )
            cupo = await self.session.get(
                models.Cupos, entrada.id_cupo_ofrecido, with_for_update=True
            )

            if vencida:
                entrada.estado = EstadoEspera.EXPIRADA.value
                if cupo and cupo.estado == EstadoCupo.RESERVADO.value:
                    cupo.estado = EstadoCupo.DISPONIBLE.value
                    await _ofertar_cupo(self.session, cupo)
                error = ErrorReglaNegocio("La oferta expiró y fue reasignada")
            elif not cupo:
                raise ErrorNoEncontrado("El cupo ofrecido ya no existe")
            elif datetime.combine(cupo.fecha_cupo, cupo.hora_cupo) <= datetime.now():
                raise ErrorReglaNegocio("El cupo ofrecido ya pasó")
            else:
                cita = await _crear_cita_para_cupo(
                    self.session, cupo, entrada.id_paciente, None
                )
                entrada.estado = EstadoEspera.ACEPTADA.value

        if error:
            raise error
        if cita is None:
            raise ErrorReglaNegocio("No fue posible aceptar la oferta")
        return cita

    async def rechazar_oferta(self, id_entrada: int) -> models.Lista_Espera:
        async with self.session.begin():
            entrada = await self.session.get(
                models.Lista_Espera, id_entrada, with_for_update=True
            )
            if not entrada:
                raise ErrorNoEncontrado(
                    f"No existe entrada en lista de espera con id: {id_entrada}"
                )
            if entrada.estado != EstadoEspera.OFRECIDA.value or not entrada.id_cupo_ofrecido:
                raise ErrorReglaNegocio("La solicitud no tiene una oferta activa")

            cupo = await self.session.get(
                models.Cupos, entrada.id_cupo_ofrecido, with_for_update=True
            )
            entrada.estado = EstadoEspera.RECHAZADA.value
            if cupo and cupo.estado == EstadoCupo.RESERVADO.value:
                cupo.estado = EstadoCupo.DISPONIBLE.value
                await _ofertar_cupo(self.session, cupo)

        return entrada

    async def procesar_expiradas(self) -> dict[str, int]:
        async with self.session.begin():
            expiradas, nuevas = await _expirar_ofertas(self.session)
        return {"ofertas_expiradas": expiradas, "nuevas_ofertas": nuevas}
