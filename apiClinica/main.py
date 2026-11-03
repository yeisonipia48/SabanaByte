import asyncio
import contextlib
from fastapi import FastAPI, HTTPException, Path, Query, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from schemas import PacienteCreadoResponseSchema, PacienteCreateSchema, PacienteResponseSchema, PacienteUpdateSchema, UsuarioCreateSchema, RolCreateSchema, RolResponseSchema, UsuarioResponseSchema, UsuarioCreadoResponseSchema, UsuarioUpdateSchema
from schemas import MedicoUpdateSchema, MedicoCreateSchema, MedicoCreadoResponseSchema, MedicoResponseSchema, LoginSchema, LoginResponseSchema, RegistroUsuarioSchema
from schemas import NotificacionResponseSchema, NotificacionesNoLeidasResponseSchema
from repository import UsuariosRepository, get_con, PacientesRepository, MedicosRepository, AuthenticationRepository,AgendaRepository
from repository import CuposRepository, CitasRepository, ListaEsperaRepository, NotificacionesRepository, bucle_procesos_automaticos
from schemas import AgendaCreateSchema, AgendaCreateResponseSchema, AgendaResponseSchema, AgendaUpdateSchema
from schemas import GenerarCuposResponseSchema, CupoResponseSchema, CupoDetalleResponseSchema, CupoDisponibleResponseSchema, CupoUpdateSchema
from schemas import CitaCreateSchema, CitaResponseSchema, CitaDetalleResponseSchema, CitaEstadoUpdateSchema, CitaConOfertaResponseSchema
from schemas import ListaEsperaCreateSchema, ListaEsperaResponseSchema, ListaEsperaDetalleResponseSchema, ProcesarExpiradasResponseSchema
from schemas import ErrorResponseSchema
from errores import ErrorApi, ErrorConflicto, ErrorNoEncontrado, ErrorReglaNegocio
from alembicApi import models
from auth_deps import (
    UsuarioAutenticado,
    get_current_user,
    require_roles,
    es_admin,
    es_medico,
    es_paciente,
    verificar_acceso_paciente,
)
from contextlib import asynccontextmanager
from datetime import date
from typing import AsyncGenerator, Any, List

ERROR_400 = {
    "model": ErrorResponseSchema,
    "description": "Solicitud inválida o regla de negocio incumplida.",
}
ERROR_404 = {
    "model": ErrorResponseSchema,
    "description": "El recurso solicitado no existe.",
}
ERROR_409 = {
    "model": ErrorResponseSchema,
    "description": "Conflicto con el estado actual del recurso.",
}
ERROR_401 = {
    "model": ErrorResponseSchema,
    "description": "No autenticado o token inválido.",
}
ERROR_403 = {
    "model": ErrorResponseSchema,
    "description": "El rol del usuario no permite esta acción.",
}

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        async with get_con().get_session() as session:
            async with session.begin():
                await session.run_sync(
                    lambda sync_session: models.Notificaciones.__table__.create(
                        sync_session.connection(), checkfirst=True
                    )
                )
    except Exception:
        pass

    tarea = asyncio.create_task(bucle_procesos_automaticos())
    try:
        yield
    finally:
        tarea.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await tarea
        await get_con().engine.dispose()

app = FastAPI(
    title="API Clínica",
    version="1.0.0",
    description=(
        "API REST para la gestión de usuarios, pacientes, médicos, agendas, "
        "cupos, citas y lista de espera de una clínica.\n\n"
        "Los errores de negocio se devuelven con el formato `{\"detail\": \"...\"}`. "
        "Los errores no controlados responden con HTTP 500."
    ),
    openapi_tags=[
        {
            "name": "Autenticación",
            "description": "Inicio de sesión y registro de usuarios con perfil opcional.",
        },
        {
            "name": "Usuarios",
            "description": "Administración de usuarios y de los roles del sistema.",
        },
        {
            "name": "Pacientes",
            "description": "Administración de los perfiles de pacientes.",
        },
        {
            "name": "Médicos",
            "description": "Administración de los perfiles médicos.",
        },
        {
            "name": "Agenda",
            "description": "Creación y mantenimiento de las agendas médicas.",
        },
        {
            "name": "Cupos",
            "description": "Consulta de cupos y gestión de su disponibilidad.",
        },
        {
            "name": "Citas",
            "description": "Reserva, consulta y seguimiento de citas médicas.",
        },
        {
            "name": "Lista de espera",
            "description": "Gestión de solicitudes, ofertas y asignación de cupos.",
        },
    ],
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ErrorApi)
async def api_exception_handler(request: Request, exc: ErrorApi) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc)},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor"},
    )

async def _verificar_acceso_entrada(
    usuario: UsuarioAutenticado,
    repository: ListaEsperaRepository,
    id_entrada: int,
) -> dict[str, Any]:
    entrada = await repository.obtener_entrada(id_entrada)
    if es_paciente(usuario) and entrada.get("id_paciente") != usuario.id_paciente:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes acceder a la solicitud de otro paciente.",
        )
    if es_medico(usuario) and entrada.get("id_medico") != usuario.id_medico:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes acceder a la solicitud de otro médico.",
        )
    return entrada


@app.get(
    "/usuarios",
    response_model=List[UsuarioResponseSchema],
    summary="Listar usuarios",
    tags=["Usuarios"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador"))],
)
async def obtener_usuarios(repository: UsuariosRepository = Depends()) -> List[dict[str, Any]]:
    """Devuelve todos los usuarios registrados junto con el nombre de su rol."""
    try:
        usuarios = await repository.obtener_usuarios()
        return usuarios
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get(
    "/usuarios/{id_usuario}",
    response_model=UsuarioResponseSchema,
    summary="Obtener usuario por ID",
    tags=["Usuarios"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(get_current_user)],
)
async def obtener_usuario_por_id(
    id_usuario: int = Path(..., description="Identificador del usuario.", examples=[42]),
    repository: UsuariosRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Usuarios:
    """Busca un usuario por su identificador.

    Un usuario solo puede consultar su propio registro, salvo el administrador.
    """
    if not es_admin(usuario_actual) and usuario_actual.id != id_usuario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes consultar otro usuario.",
        )
    try:
        usuario = await repository.obtener_usuario_por_id(id_usuario)
        return usuario
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post(
    "/usuarios",
    response_model=UsuarioCreadoResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Crear usuario",
    tags=["Usuarios"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador"))],
)
async def crear_usuario(data: UsuarioCreateSchema, repository: UsuariosRepository = Depends()) -> models.Usuarios:
    """Crea un usuario con el rol indicado.
    El correo y el número de documento deben ser únicos.
    """
    try:
        nuevo_usuario = await repository.crear_usuario(data)
        return nuevo_usuario
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.patch(
    "/usuarios/{usuario_id}",
    response_model=UsuarioCreadoResponseSchema,
    summary="Actualizar usuario",
    tags=["Usuarios"],
    responses={400: ERROR_400, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def actualizar_usuario(
    usuario_id: int = Path(..., description="Identificador del usuario.", examples=[42]),
    datos: UsuarioUpdateSchema = ...,
    repository: UsuariosRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Usuarios:
    """Actualiza parcialmente los datos de un usuario.
    Solo se modifican los campos enviados en el cuerpo de la solicitud.
    """
    if not es_admin(usuario_actual) and usuario_actual.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes modificar otro usuario.",
        )
    if not es_admin(usuario_actual) and datos.id_rol is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el administrador puede cambiar el rol.",
        )
    try:
        usuario_actualizado = await repository.actualizar_usuario(usuario_id, datos)
        return usuario_actualizado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete(
    "/usuarios/{usuario_id}",
    response_model=str,
    summary="Eliminar usuario",
    tags=["Usuarios"],
    responses={400: ERROR_400, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador"))],
)
async def eliminar_usuario(
    usuario_id: int = Path(..., description="Identificador del usuario.", examples=[42]),
    repository: UsuariosRepository = Depends(),
) -> str:
    """Elimina un usuario y devuelve un mensaje de confirmación."""
    try:
        usuario_eliminado = await repository.eliminar_usuario(usuario_id)
        return usuario_eliminado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get(
    "/roles",
    response_model=List[RolResponseSchema],
    summary="Listar roles",
    tags=["Usuarios"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador"))],
)
async def obtener_roles(repository: UsuariosRepository = Depends()) -> List[models.Roles]:
    """Devuelve los roles disponibles para asignar a un usuario."""
    try:
        roles = await repository.obtener_roles()
        return roles
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post(
    "/roles",
    response_model=RolResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Crear rol",
    tags=["Usuarios"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador"))],
)
async def crear_rol(data: RolCreateSchema, repository: UsuariosRepository = Depends()) -> models.Roles:
    """Crea un rol nuevo en el sistema."""
    try:
        nuevo_rol = await repository.crear_rol(data)
        return nuevo_rol
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get(
    "/pacientes",
    response_model=List[PacienteResponseSchema],
    summary="Listar pacientes",
    tags=["Pacientes"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(get_current_user)],
)
async def obtener_pacientes(
    repository: PacientesRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> List[dict[str, Any]]:
    """Devuelve los perfiles de pacientes con sus datos de contacto.

    El paciente solo puede ver su propio perfil.
    """
    try:
        if es_paciente(usuario_actual):
            if usuario_actual.id_paciente is None:
                return []
            paciente = await repository.obtener_paciente_por_id(
                usuario_actual.id_paciente
            )
            return [dict(paciente._mapping)]
        pacientes = await repository.obtener_pacientes()
        return pacientes
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get(
    "/pacientes/{id_paciente}",
    response_model=PacienteResponseSchema,
    summary="Obtener paciente por ID",
    tags=["Pacientes"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(get_current_user)],
)
async def obtener_paciente_por_id(
    id_paciente: int = Path(..., description="Identificador del paciente.", examples=[12]),
    repository: PacientesRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Pacientes:
    """Busca un paciente por su identificador."""
    verificar_acceso_paciente(usuario_actual, id_paciente)
    try:
        paciente = await repository.obtener_paciente_por_id(id_paciente)
        return paciente
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post(
    "/pacientes",
    response_model=PacienteCreadoResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Crear paciente",
    tags=["Pacientes"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador"))],
)
async def crear_paciente(data: PacienteCreateSchema, repository: PacientesRepository = Depends()) -> models.Pacientes:
    """Crea el perfil de un paciente asociado a un usuario existente."""
    try:
        nuevo_paciente = await repository.crear_paciente(data)
        return nuevo_paciente
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.patch(
    "/pacientes/{paciente_id}",
    response_model=PacienteCreadoResponseSchema,
    summary="Actualizar paciente",
    tags=["Pacientes"],
    responses={400: ERROR_400, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def actualizar_paciente(
    paciente_id: int = Path(..., description="Identificador del paciente.", examples=[12]),
    datos: PacienteUpdateSchema = ...,
    repository: PacientesRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Pacientes:
    """Actualiza parcialmente el perfil de un paciente."""
    verificar_acceso_paciente(usuario_actual, paciente_id)
    try:
        paciente_actualizado = await repository.actualizar_paciente(paciente_id, datos)
        return paciente_actualizado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete(
    "/pacientes/{paciente_id}",
    response_model=str,
    summary="Eliminar paciente",
    tags=["Pacientes"],
    responses={400: ERROR_400, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador"))],
)
async def eliminar_paciente(
    paciente_id: int = Path(..., description="Identificador del paciente.", examples=[12]),
    repository: PacientesRepository = Depends(),
) -> str:
    """Elimina un perfil de paciente y devuelve un mensaje de confirmación."""
    try:
        paciente_eliminado = await repository.eliminar_paciente(paciente_id)
        return paciente_eliminado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get(
    "/medicos",
    response_model=List[MedicoResponseSchema],
    summary="Listar médicos",
    tags=["Médicos"],
    responses={400: ERROR_400, 401: ERROR_401},
    dependencies=[Depends(get_current_user)],
)
async def obtener_medicos(repository: MedicosRepository = Depends()) -> List[dict[str, Any]]:
    """Devuelve todos los perfiles médicos registrados."""
    try:
        medicos = await repository.obtener_medicos()
        return medicos
    except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get(
    "/medicos/{id_medico}",
    response_model=MedicoResponseSchema,
    summary="Obtener médico por ID",
    tags=["Médicos"],
    responses={400: ERROR_400, 401: ERROR_401},
    dependencies=[Depends(get_current_user)],
)
async def obtener_medico_por_id(
    id_medico: int = Path(..., description="Identificador del médico.", examples=[9]),
    respository: MedicosRepository = Depends(),
) -> models.Medicos:
    """Busca un médico por su identificador.

    Si el médico no existe, la implementación actual responde con HTTP 400.
    """
    try:
        medico = await respository.obtener_medico_por_id(id_medico)
        return medico
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post(
    "/medicos",
    response_model=MedicoCreadoResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Crear médico",
    tags=["Médicos"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador"))],
)
async def crear_medico(datos: MedicoCreateSchema, repository: MedicosRepository = Depends()) -> models.Medicos:
    """Crea el perfil de un médico asociado a un usuario existente."""
    try:
        nuevo_medico = await repository.crear_medico(datos)
        return nuevo_medico
    except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.patch(
    "/medicos/{medico_id}",
    response_model=MedicoCreadoResponseSchema,
    summary="Actualizar médico",
    tags=["Médicos"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador", "medico"))],
)
async def actualizar_medico(
    medico_id: int = Path(..., description="Identificador del médico.", examples=[9]),
    datos: MedicoUpdateSchema = ...,
    repository: MedicosRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Medicos:
    """Actualiza parcialmente el perfil de un médico.

    Un médico solo puede actualizar su propio perfil.
    """
    if es_medico(usuario_actual) and usuario_actual.id_medico != medico_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes modificar el perfil de otro médico.",
        )
    try:
        medico_actualizado = await repository.actualizar_medico(medico_id,datos)
        return medico_actualizado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete(
    "/medicos/{medico_id}",
    response_model=str,
    summary="Eliminar médico",
    tags=["Médicos"],
    responses={400: ERROR_400, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador"))],
)
async def eliminar_medico(
    medico_id: int = Path(..., description="Identificador del médico.", examples=[9]),
    repository: MedicosRepository = Depends(),
) -> str:
    """Elimina un perfil médico y devuelve un mensaje de confirmación."""
    try:
        medico_eliminado = await repository.eliminar_medico(medico_id)
        return medico_eliminado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post(
    "/auth/login",
    response_model=LoginResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión",
    tags=["Autenticación"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
)
async def login(data: LoginSchema, repository: AuthenticationRepository = Depends()) -> dict[str, Any]:
    """Verifica las credenciales y devuelve un token JWT con el rol del usuario."""
    try:
        usuario = await repository.login(data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )

    if not usuario["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está inactiva. Contacta a la IPS.",
        )

    from Security.security import create_access_token

    token, expires_in = create_access_token(
        user_id=usuario["id"], rol=usuario["rol"]
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "usuario": usuario,
    }

@app.post(
    "/auth/register",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    summary="Registrar paciente",
    tags=["Autenticación"],
    responses={400: ERROR_400},
)
async def register(data: RegistroUsuarioSchema, repository: AuthenticationRepository = Depends()) -> dict:
    """Registra un paciente desde el portal público.

    El rol se fuerza a `paciente` en el servidor; el cliente no puede
    autoasignarse roles administrativos o médicos.
    """
    try:
        registro = await repository.register(data, rol_forzado="paciente")
        return registro
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )

@app.post(
    "/auth/bootstrap",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    summary="Crear el primer administrador",
    tags=["Autenticación"],
    responses={400: ERROR_400, 409: ERROR_409},
)
async def bootstrap_admin(
    data: RegistroUsuarioSchema,
    repository: AuthenticationRepository = Depends(),
) -> dict:
    """Crea el primer usuario administrador cuando el sistema está vacío.

    Si ya existe al menos un usuario, responde con HTTP 409. Este endpoint
    evita quedar bloqueado sin acceso administrativo en una instalación nueva.
    """
    if await repository.hay_usuarios():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El sistema ya tiene usuarios; usa el registro de personal.",
        )
    try:
        return await repository.register(data, rol_forzado="administrador")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )

@app.post(
    "/auth/register-staff",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    summary="Registrar personal (solo administrador)",
    tags=["Autenticación"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador"))],
)
async def register_staff(
    data: RegistroUsuarioSchema,
    repository: AuthenticationRepository = Depends(),
) -> dict:
    """Registra médicos o usuarios administrativos.

    Solo el personal administrativo autenticado puede invocar este endpoint.
    """
    try:
        return await repository.register(data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )

@app.get(
    "/agenda/{id_medico}",
    response_model=List[AgendaResponseSchema],
    summary="Listar agendas de un médico",
    tags=["Agenda"],
    responses={401: ERROR_401, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def obtener_agenda(
    id_medico: int = Path(..., description="Identificador del médico.", examples=[9]),
    repository: AgendaRepository = Depends(),
) -> List[dict[str, Any]]:
    """Devuelve las agendas asociadas a un médico."""
    return await repository.obtener_agenda(id_medico)

@app.post(
    "/agenda",
    status_code=status.HTTP_201_CREATED,
    response_model=AgendaCreateResponseSchema,
    summary="Crear agenda",
    tags=["Agenda"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador", "medico"))],
)
async def crear_agenda(
    data: AgendaCreateSchema,
    repository: AgendaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Agenda_Medicas:
    """Crea una agenda para un médico.

    La fecha final no puede ser anterior a la inicial, la hora final debe ser
    mayor que la inicial y la franja debe alcanzar para la duración de la cita.
    Un médico solo puede crear agendas para sí mismo.
    """
    if es_medico(usuario_actual):
        if usuario_actual.id_medico is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario no tiene perfil de médico.",
            )
        data = data.model_copy(update={"id_medico": usuario_actual.id_medico})
    return await repository.crear_agenda(data)

@app.patch(
    "/agenda/{id_agenda}",
    response_model=AgendaCreateResponseSchema,
    summary="Actualizar agenda",
    tags=["Agenda"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador", "medico"))],
)
async def actualizar_agenda(
    id_agenda: int = Path(..., description="Identificador de la agenda.", examples=[21]),
    data: AgendaUpdateSchema = ...,
    repository: AgendaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
)->models.Agenda_Medicas:
    """Actualiza parcialmente una agenda existente.

    Un médico solo puede modificar sus propias agendas.
    """
    if es_medico(usuario_actual):
        agenda = await repository.obtener_agenda_por_id(id_agenda)
        if agenda.id_medico != usuario_actual.id_medico:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes modificar la agenda de otro médico.",
            )
    return await repository.actualizar_agenda(data, id_agenda)

@app.delete(
    "/agenda/{id_agenda}",
    response_model=str,
    summary="Eliminar agenda",
    tags=["Agenda"],
    responses={401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador", "medico"))],
)
async def eliminar_agenda(
    id_agenda: int = Path(..., description="Identificador de la agenda.", examples=[21]),
    repository: AgendaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> str:
    """Elimina una agenda y devuelve un mensaje de confirmación.

    Un médico solo puede eliminar sus propias agendas.
    """
    if es_medico(usuario_actual):
        agenda = await repository.obtener_agenda_por_id(id_agenda)
        if agenda.id_medico != usuario_actual.id_medico:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes eliminar la agenda de otro médico.",
            )
    return await repository.eliminar_agenda(id_agenda)

@app.post(
    "/agenda/{id_agenda}/generar-cupos",
    response_model=GenerarCuposResponseSchema,
    summary="Generar cupos de una agenda",
    tags=["Agenda"],
    responses={401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador", "medico"))],
)
async def generar_cupos(
    id_agenda: int = Path(..., description="Identificador de la agenda.", examples=[21]),
    repository: CuposRepository = Depends(),
    agenda_repository: AgendaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> dict[str, int]:
    """Genera los cupos de una agenda según su franja y duración de cita.

    No duplica cupos que ya existan para la misma fecha y hora.
    Un médico solo puede generar los cupos de sus propias agendas.
    """
    if es_medico(usuario_actual):
        agenda = await agenda_repository.obtener_agenda_por_id(id_agenda)
        if agenda.id_medico != usuario_actual.id_medico:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes generar cupos de la agenda de otro médico.",
            )
    return await repository.generar_cupos(id_agenda)

@app.get(
    "/cupos/disponibles",
    response_model=List[CupoDisponibleResponseSchema],
    summary="Listar cupos disponibles",
    tags=["Cupos"],
    responses={400: ERROR_400, 401: ERROR_401},
    dependencies=[Depends(get_current_user)],
)
async def obtener_cupos_disponibles(
    especialidad: str | None = Query(
        None,
        description="Filtra por especialidad médica.",
        examples=["Cardiología"],
    ),
    id_medico: int | None = Query(
        None,
        description="Filtra por identificador del médico.",
        examples=[9],
    ),
    fecha_inicio: date | None = Query(
        None,
        description="Fecha mínima del cupo en formato ISO 8601.",
        examples=["2026-03-02"],
    ),
    fecha_fin: date | None = Query(
        None,
        description="Fecha máxima del cupo en formato ISO 8601.",
        examples=["2026-03-06"],
    ),
    repository: CuposRepository = Depends(),
) -> List[dict[str, Any]]:
    """Devuelve los cupos disponibles, con filtros opcionales por especialidad,
    médico y rango de fechas."""
    return await repository.obtener_disponibles(
        especialidad=especialidad,
        id_medico=id_medico,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )

@app.get(
    "/cupos/{id_cupo}",
    response_model=CupoDetalleResponseSchema,
    summary="Obtener cupo por ID",
    tags=["Cupos"],
    responses={401: ERROR_401, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def obtener_cupo(
    id_cupo: int = Path(..., description="Identificador del cupo.", examples=[301]),
    repository: CuposRepository = Depends(),
) -> dict[str, Any]:
    """Devuelve el detalle de un cupo, incluido el médico y la agenda."""
    return await repository.obtener_cupo_por_id(id_cupo)

@app.patch(
    "/cupos/{id_cupo}",
    response_model=CupoResponseSchema,
    summary="Cambiar estado de un cupo",
    tags=["Cupos"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador", "medico"))],
)
async def actualizar_cupo(
    id_cupo: int = Path(..., description="Identificador del cupo.", examples=[301]),
    data: CupoUpdateSchema = ...,
    repository: CuposRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Cupos:
    """Actualiza el estado de un cupo.

    No se puede cancelar un cupo que tenga una cita activa asociada.
    Un médico solo puede modificar cupos de sus propias agendas.
    """
    if es_medico(usuario_actual):
        cupo = await repository.obtener_cupo_por_id(id_cupo)
        if cupo.get("id_medico") != usuario_actual.id_medico:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes modificar cupos de otro médico.",
            )
    return await repository.cambiar_estado(id_cupo, data)

@app.post(
    "/citas",
    status_code=status.HTTP_201_CREATED,
    response_model=CitaResponseSchema,
    summary="Crear cita",
    tags=["Citas"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404, 409: ERROR_409},
    dependencies=[Depends(get_current_user)],
)
async def crear_cita(
    data: CitaCreateSchema,
    repository: CitasRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Citas:
    """Reserva un cupo disponible para un paciente.

    El cupo debe estar disponible, pertenecer a una agenda activa y no haber
    pasado. Si otro usuario toma el cupo primero, se devuelve HTTP 409.
    Un paciente solo puede reservar para sí mismo.
    """
    if es_paciente(usuario_actual):
        if usuario_actual.id_paciente is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario no tiene perfil de paciente.",
            )
        data = data.model_copy(update={"id_paciente": usuario_actual.id_paciente})
    return await repository.crear_cita(data)

@app.get(
    "/citas",
    response_model=List[CitaDetalleResponseSchema],
    summary="Listar citas",
    tags=["Citas"],
    responses={401: ERROR_401},
    dependencies=[Depends(get_current_user)],
)
async def obtener_citas(
    id_paciente: int | None = Query(
        None,
        description="Filtra por identificador del paciente.",
        examples=[12],
    ),
    id_medico: int | None = Query(
        None,
        description="Filtra por identificador del médico.",
        examples=[9],
    ),
    estado: str | None = Query(
        None,
        description="Filtra por estado de la cita.",
        examples=["pendiente"],
    ),
    fecha: date | None = Query(
        None,
        description="Filtra por una fecha exacta en formato ISO 8601.",
        examples=["2026-03-02"],
    ),
    fecha_inicio: date | None = Query(
        None,
        description="Fecha mínima de la cita en formato ISO 8601.",
        examples=["2026-03-02"],
    ),
    fecha_fin: date | None = Query(
        None,
        description="Fecha máxima de la cita en formato ISO 8601.",
        examples=["2026-03-06"],
    ),
    repository: CitasRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> List[dict[str, Any]]:
    """Devuelve citas con sus datos de paciente, médico y cupo.

    Los filtros son opcionales y se pueden combinar. Pacientes y médicos solo
    ven sus propias citas.
    """
    if es_paciente(usuario_actual):
        if usuario_actual.id_paciente is None:
            return []
        id_paciente = usuario_actual.id_paciente
    elif es_medico(usuario_actual):
        if usuario_actual.id_medico is None:
            return []
        id_medico = usuario_actual.id_medico
    return await repository.obtener_citas(
        id_paciente=id_paciente,
        id_medico=id_medico,
        estado=estado,
        fecha=fecha,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )

@app.get(
    "/citas/{id_cita}",
    response_model=CitaDetalleResponseSchema,
    summary="Obtener cita por ID",
    tags=["Citas"],
    responses={401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def obtener_cita(
    id_cita: int = Path(..., description="Identificador de la cita.", examples=[88]),
    repository: CitasRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> dict[str, Any]:
    """Devuelve el detalle de una cita."""
    cita = await repository.obtener_cita_por_id(id_cita)
    if es_paciente(usuario_actual) and cita.get("id_paciente") != usuario_actual.id_paciente:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes consultar la cita de otro paciente.",
        )
    if es_medico(usuario_actual) and cita.get("id_medico") != usuario_actual.id_medico:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes consultar la cita de otro médico.",
        )
    return cita

@app.patch(
    "/citas/{id_cita}/cancelar",
    response_model=CitaConOfertaResponseSchema,
    summary="Cancelar cita",
    tags=["Citas"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def cancelar_cita(
    id_cita: int = Path(..., description="Identificador de la cita.", examples=[88]),
    repository: CitasRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> dict[str, Any]:
    """Cancela una cita y libera su cupo.

    Si hay solicitudes compatibles en lista de espera, se ofrece el cupo al
    primer paciente en orden FIFO que requiera la misma especialidad. El plazo
    de confirmación es de 48 horas, pero nunca posterior a la hora de la cita;
    si faltan menos de 48 horas, el plazo de 48 horas se invalida y el paciente
    debe confirmar antes de la cita. Las citas cuya hora ya pasó no se ofrecen.
    """
    cita_actual = await repository.obtener_cita_por_id(id_cita)
    if es_paciente(usuario_actual) and cita_actual.get("id_paciente") != usuario_actual.id_paciente:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes cancelar la cita de otro paciente.",
        )
    if es_medico(usuario_actual) and cita_actual.get("id_medico") != usuario_actual.id_medico:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes cancelar la cita de otro médico.",
        )
    cita, oferta = await repository.cancelar_cita(id_cita)
    return {"cita": cita, "oferta": oferta}

@app.patch(
    "/citas/{id_cita}/asistencia",
    response_model=CitaConOfertaResponseSchema,
    summary="Registrar asistencia de una cita",
    tags=["Citas"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(require_roles("administrador", "medico"))],
)
async def actualizar_asistencia(
    id_cita: int = Path(..., description="Identificador de la cita.", examples=[88]),
    data: CitaEstadoUpdateSchema = ...,
    repository: CitasRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> dict[str, Any]:
    """Actualiza el estado de asistencia de una cita.

    Los estados permitidos son `confirmada`, `atendida` y `no_asistio`.
    Si la cita se marca como `no_asistio`, se libera el cupo y se ofrece al
    primer paciente en orden FIFO que requiera la misma especialidad. El plazo
    de confirmación es de 48 horas, acotado a la hora de la cita; si la hora ya
    pasó no se genera oferta.
    """
    cita_actual = await repository.obtener_cita_por_id(id_cita)
    if es_medico(usuario_actual) and cita_actual.get("id_medico") != usuario_actual.id_medico:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes registrar asistencia de la cita de otro médico.",
        )
    cita, oferta = await repository.actualizar_estado_cita(id_cita, data.estado)
    return {"cita": cita, "oferta": oferta}

@app.get(
    "/medicos/{id_medico}/jornada",
    response_model=List[CitaDetalleResponseSchema],
    summary="Consultar jornada de un médico",
    tags=["Citas"],
    responses={401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador", "medico"))],
)
async def obtener_jornada(
    id_medico: int = Path(..., description="Identificador del médico.", examples=[9]),
    fecha: date = Query(..., description="Fecha de la jornada en formato ISO 8601.", examples=["2026-03-02"]),
    repository: CitasRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> List[dict[str, Any]]:
    """Devuelve las citas programadas de un médico para una fecha.

    Un médico solo puede consultar su propia jornada.
    """
    if es_medico(usuario_actual):
        if usuario_actual.id_medico is None:
            return []
        id_medico = usuario_actual.id_medico
    return await repository.obtener_jornada(id_medico, fecha)

@app.post(
    "/lista-espera",
    status_code=status.HTTP_201_CREATED,
    response_model=ListaEsperaResponseSchema,
    summary="Crear solicitud en lista de espera",
    tags=["Lista de espera"],
    responses={401: ERROR_401, 403: ERROR_403, 404: ERROR_404, 409: ERROR_409},
    dependencies=[Depends(get_current_user)],
)
async def crear_lista_espera(
    data: ListaEsperaCreateSchema,
    repository: ListaEsperaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Lista_Espera:
    """Registra a un paciente en la lista de espera.

    Un paciente no puede tener más de una solicitud activa a la vez. Si hay
    cupos disponibles compatibles, la solicitud se crea y se le ofrece
    inmediatamente el cupo más próximo; el paciente decide si lo acepta o lo
    rechaza. Si no hay cupos compatibles, la solicitud queda pendiente en
    orden FIFO. Un paciente solo puede registrarse a sí mismo.
    """
    if es_paciente(usuario_actual):
        if usuario_actual.id_paciente is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario no tiene perfil de paciente.",
            )
        data = data.model_copy(update={"id_paciente": usuario_actual.id_paciente})
    return await repository.crear_entrada(data)

@app.get(
    "/lista-espera",
    response_model=List[ListaEsperaDetalleResponseSchema],
    summary="Listar solicitudes de espera",
    tags=["Lista de espera"],
    responses={401: ERROR_401},
    dependencies=[Depends(get_current_user)],
)
async def obtener_lista_espera(
    id_medico: int | None = Query(
        None,
        description="Filtra por identificador del médico preferido.",
        examples=[9],
    ),
    estado: str | None = Query(
        None,
        description="Filtra por estado de la solicitud.",
        examples=["pendiente"],
    ),
    repository: ListaEsperaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> List[dict[str, Any]]:
    """Devuelve las solicitudes de lista de espera con sus datos de paciente,
    médico y cupo ofrecido. Pacientes y médicos solo ven lo que les compete."""
    id_paciente = None
    if es_paciente(usuario_actual):
        id_paciente = usuario_actual.id_paciente
        if id_paciente is None:
            return []
    elif es_medico(usuario_actual):
        id_medico = usuario_actual.id_medico
        if id_medico is None:
            return []
    return await repository.obtener_lista(
        id_medico=id_medico, estado=estado, id_paciente=id_paciente
    )

@app.post(
    "/lista-espera/procesar-expiradas",
    response_model=ProcesarExpiradasResponseSchema,
    summary="Procesar ofertas expiradas",
    tags=["Lista de espera"],
    responses={401: ERROR_401, 403: ERROR_403},
    dependencies=[Depends(require_roles("administrador"))],
)
async def procesar_expiradas(repository: ListaEsperaRepository = Depends()) -> dict[str, int]:
    """Marca las ofertas vencidas como expiradas y genera nuevas ofertas.

    Devuelve la cantidad de ofertas expiradas y de nuevas ofertas creadas.
    """
    return await repository.procesar_expiradas()

@app.get(
    "/lista-espera/{id_entrada}",
    response_model=ListaEsperaDetalleResponseSchema,
    summary="Obtener solicitud de espera por ID",
    tags=["Lista de espera"],
    responses={401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def obtener_entrada_lista_espera(
    id_entrada: int = Path(..., description="Identificador de la solicitud.", examples=[55]),
    repository: ListaEsperaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> dict[str, Any]:
    """Devuelve el detalle de una solicitud de lista de espera."""
    return await _verificar_acceso_entrada(usuario_actual, repository, id_entrada)

@app.delete(
    "/lista-espera/{id_entrada}",
    response_model=ListaEsperaResponseSchema,
    summary="Cancelar solicitud de espera",
    tags=["Lista de espera"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def cancelar_entrada_lista_espera(
    id_entrada: int = Path(..., description="Identificador de la solicitud.", examples=[55]),
    repository: ListaEsperaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Lista_Espera:
    """Cancela una solicitud de lista de espera."""
    await _verificar_acceso_entrada(usuario_actual, repository, id_entrada)
    return await repository.cancelar_entrada(id_entrada)

@app.post(
    "/lista-espera/{id_entrada}/aceptar",
    response_model=CitaResponseSchema,
    summary="Aceptar oferta de cupo",
    tags=["Lista de espera"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def aceptar_oferta(
    id_entrada: int = Path(..., description="Identificador de la solicitud.", examples=[55]),
    repository: ListaEsperaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Citas:
    """Acepta el cupo ofrecido y crea la cita correspondiente."""
    await _verificar_acceso_entrada(usuario_actual, repository, id_entrada)
    return await repository.aceptar_oferta(id_entrada)

@app.post(
    "/lista-espera/{id_entrada}/rechazar",
    response_model=ListaEsperaResponseSchema,
    summary="Rechazar oferta de cupo",
    tags=["Lista de espera"],
    responses={400: ERROR_400, 401: ERROR_401, 403: ERROR_403, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def rechazar_oferta(
    id_entrada: int = Path(..., description="Identificador de la solicitud.", examples=[55]),
    repository: ListaEsperaRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> models.Lista_Espera:
    """Rechaza la oferta de cupo y devuelve la solicitud a la lista de espera."""
    await _verificar_acceso_entrada(usuario_actual, repository, id_entrada)
    return await repository.rechazar_oferta(id_entrada)


@app.get(
    "/notificaciones",
    response_model=List[NotificacionResponseSchema],
    summary="Listar notificaciones del paciente",
    tags=["Notificaciones"],
    responses={401: ERROR_401},
    dependencies=[Depends(get_current_user)],
)
async def listar_notificaciones(
    solo_no_leidas: bool = Query(False, description="Devuelve solo las no leídas."),
    repository: NotificacionesRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> List[dict[str, Any]]:
    """Devuelve las notificaciones internas del paciente autenticado."""
    if usuario_actual.id_paciente is None:
        return []
    return await repository.listar(usuario_actual.id_paciente, solo_no_leidas)


@app.get(
    "/notificaciones/no-leidas",
    response_model=NotificacionesNoLeidasResponseSchema,
    summary="Contar notificaciones no leídas",
    tags=["Notificaciones"],
    responses={401: ERROR_401},
    dependencies=[Depends(get_current_user)],
)
async def contar_notificaciones_no_leidas(
    repository: NotificacionesRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> dict[str, int]:
    """Devuelve cuántas notificaciones sin leer tiene el paciente."""
    if usuario_actual.id_paciente is None:
        return {"no_leidas": 0}
    return {"no_leidas": await repository.contar_no_leidas(usuario_actual.id_paciente)}


@app.patch(
    "/notificaciones/{id_notificacion}/leida",
    response_model=NotificacionResponseSchema,
    summary="Marcar notificación como leída",
    tags=["Notificaciones"],
    responses={401: ERROR_401, 404: ERROR_404},
    dependencies=[Depends(get_current_user)],
)
async def marcar_notificacion_leida(
    id_notificacion: int = Path(..., description="Identificador de la notificación."),
    repository: NotificacionesRepository = Depends(),
    usuario_actual: UsuarioAutenticado = Depends(get_current_user),
) -> dict[str, Any]:
    """Marca como leída una notificación del paciente autenticado."""
    if usuario_actual.id_paciente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario no tiene perfil de paciente.",
        )
    return await repository.marcar_leida(id_notificacion, usuario_actual.id_paciente)
