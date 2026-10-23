from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from schemas import PacienteCreadoResponseSchema, PacienteCreateSchema, PacienteResponseSchema, PacienteUpdateSchema, UsuarioCreateSchema, RolCreateSchema, RolResponseSchema, UsuarioResponseSchema, UsuarioCreadoResponseSchema, UsuarioUpdateSchema
from schemas import MedicoUpdateSchema, MedicoCreateSchema, MedicoCreadoResponseSchema, MedicoResponseSchema, LoginSchema, RegistroUsuarioSchema
from repository import UsuariosRepository, get_con, PacientesRepository, MedicosRepository, AuthenticationRepository,AgendaRepository
from schemas import AgendaCreateSchema, AgendaCreateResponseSchema, AgendaResponseSchema
from alembicApi import models
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any, List

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await get_con().engine.dispose()

app = FastAPI(lifespan=lifespan)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor"},
    )

@app.get("/usuarios", response_model=List[UsuarioResponseSchema])
async def obtener_usuarios(repository: UsuariosRepository = Depends()) -> List[dict[str, Any]]:
    try:
        usuarios = await repository.obtener_usuarios()
        return usuarios
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
@app.get("/usuarios/{id_usuario}", response_model=UsuarioResponseSchema)
async def obtener_usuario_por_id(id_usuario:int, repository: UsuariosRepository = Depends())-> models.Usuarios:
    try:
        usuario = await repository.obtener_usuario_por_id(id_usuario)
        return usuario
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/usuarios",response_model=UsuarioCreadoResponseSchema, status_code=status.HTTP_201_CREATED)
async def crear_usuario(data: UsuarioCreateSchema, repository: UsuariosRepository = Depends()) -> models.Usuarios:
    try:
        nuevo_usuario = await repository.crear_usuario(data)
        return nuevo_usuario
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.patch("/usuarios/{usuario_id}", response_model=UsuarioCreadoResponseSchema)
async def actualizar_usuario(usuario_id:int, datos: UsuarioUpdateSchema, repository: UsuariosRepository = Depends()) -> models.Usuarios:
    try:
        usuario_actualizado = await repository.actualizar_usuario(usuario_id, datos)
        return usuario_actualizado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/usuarios/{usuario_id}", response_model=str)
async def eliminar_usuario(usuario_id: int, repository: UsuariosRepository = Depends()) -> str:
    try:
        usuario_eliminado = await repository.eliminar_usuario(usuario_id)
        return usuario_eliminado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
@app.get("/roles", response_model=List[RolResponseSchema])
async def obtener_roles(repository: UsuariosRepository = Depends()) -> List[models.Roles]:
    try:
        roles = await repository.obtener_roles()
        return roles
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/roles", response_model=RolResponseSchema, status_code=status.HTTP_201_CREATED)
async def crear_rol(data: RolCreateSchema, repository: UsuariosRepository = Depends()) -> models.Roles:
    try:
        nuevo_rol = await repository.crear_rol(data)
        return nuevo_rol
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/pacientes", response_model=List[PacienteResponseSchema])
async def obtener_pacientes(repository: PacientesRepository = Depends()) -> List[dict[str, Any]]:
    try:
        pacientes = await repository.obtener_pacientes()
        return pacientes
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/pacientes/{id_paciente}", response_model=PacienteResponseSchema)
async def obtener_paciente_por_id(id_paciente:int, repository: PacientesRepository = Depends()) -> models.Pacientes:
    try:
        paciente = await repository.obtener_paciente_por_id(id_paciente)
        return paciente
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/pacientes", response_model=PacienteCreadoResponseSchema, status_code=status.HTTP_201_CREATED)
async def crear_paciente(data: PacienteCreateSchema, repository: PacientesRepository = Depends()) -> models.Pacientes:
    try:
        nuevo_paciente = await repository.crear_paciente(data)
        return nuevo_paciente
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.patch("/pacientes/{paciente_id}", response_model=PacienteCreadoResponseSchema)
async def actualizar_paciente(paciente_id:int, datos: PacienteUpdateSchema, repository: PacientesRepository = Depends()) -> models.Pacientes:
    try:
        paciente_actualizado = await repository.actualizar_paciente(paciente_id, datos)
        return paciente_actualizado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/pacientes/{paciente_id}", response_model=str)
async def eliminar_paciente(paciente_id: int, repository: PacientesRepository = Depends()) -> str:
    try:
        paciente_eliminado = await repository.eliminar_paciente(paciente_id)
        return paciente_eliminado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/medicos", response_model=List[MedicoResponseSchema])
async def obtener_medicos(repository: MedicosRepository = Depends()) -> List[dict[str, Any]]:
    try:
        medicos = await repository.obtener_medicos()
        return medicos
    except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/medicos/{id_medico}", response_model=MedicoResponseSchema)
async def obtener_medico_por_id(id_medico:int, respository: MedicosRepository = Depends()) -> models.Medicos:
    try:
        medico = await respository.obtener_medico_por_id(id_medico)
        return medico
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/medicos", response_model=MedicoCreadoResponseSchema, status_code=status.HTTP_201_CREATED)
async def crear_medico(datos: MedicoCreateSchema, repository: MedicosRepository = Depends()) -> models.Medicos:
    try:
        nuevo_medico = await repository.crear_medico(datos)
        return nuevo_medico
    except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.patch("/medicos/{medico_id}", response_model=MedicoCreadoResponseSchema)
async def actualizar_medico(medico_id:int, datos: MedicoUpdateSchema, repository: MedicosRepository = Depends()) -> models.Medicos:
    try:
        medico_actualizado = await repository.actualizar_medico(medico_id,datos)
        return medico_actualizado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/medicos/{medico_id}", response_model=str)
async def eliminar_medico(medico_id:int, repository: MedicosRepository = Depends()) -> str:
    try:
        medico_eliminado = await repository.eliminar_medico(medico_id)
        return medico_eliminado
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/auth/login", response_model=bool, status_code=status.HTTP_202_ACCEPTED)
async def login(data: LoginSchema, repository: AuthenticationRepository = Depends()) -> bool:
    try:
        login = await repository.login(data)
        return login
    except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
@app.post("/auth/register", status_code=status.HTTP_201_CREATED, response_model=dict)
async def register(data: RegistroUsuarioSchema, repository: AuthenticationRepository = Depends()) -> dict:
    try:
        registro = await repository.register(data)
        return registro
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/agenda/{id_medico}", response_model=List[AgendaResponseSchema])
async def obtener_agenda(id_medico:int,repository: AgendaRepository = Depends()) -> List[dict[str, Any]]:
    try:
        agenda = await repository.obtener_agenda(id_medico)
        return agenda
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/agenda", status_code=status.HTTP_201_CREATED, response_model=AgendaCreateResponseSchema)
async def crear_agenda(data: AgendaCreateSchema, repository: AgendaRepository = Depends()) -> models.Agenda_Medicas:
    try:
        nueva_agenda = await repository.crear_agenda(data)
        return nueva_agenda
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))