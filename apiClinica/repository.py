from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from functools import lru_cache
from sqlalchemy import select
from alembicApi import models
from schemas import PacienteUpdateSchema, UsuarioCreateSchema, RolCreateSchema, UsuarioUpdateSchema, PacienteCreateSchema
from schemas import MedicoCreateSchema, MedicoUpdateSchema, LoginSchema, RegistroUsuarioSchema
from dbconexion import Conexion
from typing import Any, AsyncGenerator, List, Dict
from Security.security import hash_password, verify_password

@lru_cache
def _get_con() -> Conexion:
    with open('/run/secrets/postgres_user') as f:
        db_user = f.read().strip()
    with open('/run/secrets/postgres_password') as f:
        password = f.read().strip()
    with open('/run/secrets/postgres_host') as f:
        host = f.read().strip() 
    with open('/run/secrets/postgres_db') as f:
        db = f.read().strip()

    return Conexion(db_user, password, host, db)

def get_con() -> Conexion:
    return _get_con()

async def get_conexion() -> AsyncGenerator[AsyncSession, None]:
    async with get_con().get_session() as session:
        yield session

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
                return {"message":f"Medico:  {nuevo_paciente.nombres} {nuevo_medico.apellidos} registrado con exito."}
            else:
                await self.session.refresh(nuevo_usuario)
                return {"message": f"Usuario: documento: {nuevo_usuario.numero_documento} correo:{nuevo_usuario.email} registrado con exito"}
        except Exception as e:
            await self.session.rollback()
            raise e
        



    