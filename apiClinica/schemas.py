from pydantic import BaseModel, ConfigDict
from datetime import datetime, date, time

class UsuarioCreateSchema(BaseModel):
    id_rol: int
    tipo_documento: str
    numero_documento: str
    email: str
    password: str

class UsuarioCreadoResponseSchema(BaseModel):
    id: int
    id_rol: int
    tipo_documento: str
    numero_documento: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UsuarioResponseSchema(BaseModel):
    id: int
    rol: str
    tipo_documento: str
    numero_documento: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UsuarioUpdateSchema(BaseModel):
    id_rol: int | None = None
    tipo_documento: str | None = None
    numero_documento: str | None = None
    email: str | None = None
    password: str | None = None
    is_active: bool | None = True


class RolCreateSchema(BaseModel):
    rol: str

class RolResponseSchema(BaseModel):
    id: int
    rol: str

    model_config = ConfigDict(from_attributes=True)

class PacienteCreateSchema(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    fecha_nacimiento: date
    telefono: str
    direccion: str | None = None

class PacienteCreadoResponseSchema(BaseModel):
    id: int
    id_usuario: int
    nombres: str
    apellidos: str
    fecha_nacimiento: date
    telefono: str
    direccion: str | None = None

    model_config = ConfigDict(from_attributes=True)

class PacienteUpdateSchema(BaseModel):
    nombres: str | None = None
    apellidos: str | None = None
    fecha_nacimiento: date | None = None
    telefono: str | None = None
    direccion: str | None = None

class PacienteResponseSchema(BaseModel):
    id: int
    id_usuario: int
    nombres: str
    apellidos: str
    fecha_nacimiento: date
    telefono: str
    numero_documento: str
    email: str
    direccion: str | None = None

    model_config = ConfigDict(from_attributes=True)

class MedicoCreateSchema(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    telefono: str
    tarjeta_profesional:str
    especialidad: str
    consultorio:str

class MedicoCreadoResponseSchema(BaseModel):
    id:int
    id_usuario: int
    nombres: str
    apellidos: str
    telefono: str
    tarjeta_profesional:str
    especialidad: str
    consultorio:str

    model_config = ConfigDict(from_attributes=True)

class MedicoUpdateSchema(BaseModel):
    nombres: str | None = None
    apellidos: str | None = None
    telefono: str | None = None
    tarjeta_profesional:str | None = None
    especialidad: str | None = None
    consultorio:str | None = None

class MedicoResponseSchema(BaseModel):
    id: int
    id_usuario: int
    nombres: str
    apellidos: str
    telefono: str
    numero_documento: str
    email: str
    tarjeta_profesional:str
    especialidad: str
    consultorio:str

    model_config = ConfigDict(from_attributes=True)

class LoginSchema(BaseModel):
    numero_documento:str
    password:str

class RegistroUsuarioSchema(BaseModel):
    id_rol: int
    tipo_documento: str
    numero_documento: str
    email: str
    password: str
    
    # Datos opcionales que llegarán según el rol
    nombres: str | None = None
    apellidos: str | None = None
    fecha_nacimiento: date | None = None  # Solo para pacientes
    telefono: str | None = None
    direccion: str | None = None          # Solo para pacientes
    tarjeta_profesional: str | None = None # Solo para médicos
    especialidad: str | None = None       # Solo para médicos
    consultorio: str | None = None        # Solo para médicos

class AgendaCreateSchema(BaseModel):
    id_medico: int
    fecha_inicio: date
    fecha_fin: date
    duracion_cita: int
    hora_inicio: time 
    hora_fin: time

class AgendaCreateResponseSchema(BaseModel):
    id: int
    id_medico: int
    fecha_inicio: date
    fecha_fin: date
    duracion_cita: int
    hora_inicio: time 
    hora_fin: time
    estado: str

    model_config = ConfigDict(from_attributes=True)

class AgendaResponseSchema(BaseModel):
    id: int
    medico: str
    fecha_inicio: date
    fecha_fin: date
    duracion_cita: int
    hora_inicio: time 
    hora_fin: time
    estado: str

    model_config = ConfigDict(from_attributes=True)

class AgendaUpdateSchema(BaseModel):
    id_medico: int | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    duracion_cita: int | None = None
    hora_inicio: time  | None = None
    hora_fin: time | None = None

    