from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, date, time
from typing import Literal
from estados import EstadoCupo


class ErrorResponseSchema(BaseModel):
    """Formato de error que devuelve la API cuando una operación no puede completarse."""

    detail: str = Field(
        ...,
        description="Mensaje legible que explica el motivo del error.",
        examples=["No existe usuario con id: 99"],
    )


class UsuarioCreateSchema(BaseModel):
    id_rol: int = Field(
        ...,
        description="Identificador del rol que se asignará al usuario.",
        examples=[2],
    )
    tipo_documento: str = Field(
        ...,
        description="Tipo de documento de identidad.",
        examples=["CC"],
    )
    numero_documento: str = Field(
        ...,
        description="Número de documento único del usuario.",
        examples=["1023456789"],
    )
    email: str = Field(
        ...,
        description="Correo electrónico único del usuario.",
        examples=["ana.gomez@example.com"],
    )
    password: str = Field(
        ...,
        description="Contraseña en texto plano. La API la almacena cifrada.",
        examples=["ClaveSegura123"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id_rol": 2,
                "tipo_documento": "CC",
                "numero_documento": "1023456789",
                "email": "ana.gomez@example.com",
                "password": "ClaveSegura123",
            }
        }
    )


class UsuarioCreadoResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único del usuario.",
        examples=[42],
    )
    id_rol: int = Field(
        ...,
        description="Identificador del rol asignado.",
        examples=[2],
    )
    tipo_documento: str = Field(
        ...,
        description="Tipo de documento de identidad.",
        examples=["CC"],
    )
    numero_documento: str = Field(
        ...,
        description="Número de documento del usuario.",
        examples=["1023456789"],
    )
    email: str = Field(
        ...,
        description="Correo electrónico del usuario.",
        examples=["ana.gomez@example.com"],
    )
    is_active: bool = Field(
        ...,
        description="Indica si el usuario puede iniciar sesión.",
        examples=[True],
    )
    created_at: datetime = Field(
        ...,
        description="Fecha y hora de creación del usuario.",
        examples=["2026-02-25T14:30:00"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 42,
                "id_rol": 2,
                "tipo_documento": "CC",
                "numero_documento": "1023456789",
                "email": "ana.gomez@example.com",
                "is_active": True,
                "created_at": "2026-02-25T14:30:00",
            }
        },
    )


class UsuarioResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único del usuario.",
        examples=[42],
    )
    rol: str = Field(
        ...,
        description="Nombre del rol asignado al usuario.",
        examples=["paciente"],
    )
    tipo_documento: str = Field(
        ...,
        description="Tipo de documento de identidad.",
        examples=["CC"],
    )
    numero_documento: str = Field(
        ...,
        description="Número de documento del usuario.",
        examples=["1023456789"],
    )
    email: str = Field(
        ...,
        description="Correo electrónico del usuario.",
        examples=["ana.gomez@example.com"],
    )
    is_active: bool = Field(
        ...,
        description="Indica si el usuario puede iniciar sesión.",
        examples=[True],
    )
    created_at: datetime = Field(
        ...,
        description="Fecha y hora de creación del usuario.",
        examples=["2026-02-25T14:30:00"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 42,
                "rol": "paciente",
                "tipo_documento": "CC",
                "numero_documento": "1023456789",
                "email": "ana.gomez@example.com",
                "is_active": True,
                "created_at": "2026-02-25T14:30:00",
            }
        },
    )


class UsuarioUpdateSchema(BaseModel):
    id_rol: int | None = Field(
        None,
        description="Nuevo rol del usuario. Si se omite, no cambia.",
        examples=[2],
    )
    tipo_documento: str | None = Field(
        None,
        description="Nuevo tipo de documento. Si se omite, no cambia.",
        examples=["CC"],
    )
    numero_documento: str | None = Field(
        None,
        description="Nuevo número de documento. Si se omite, no cambia.",
        examples=["1023456789"],
    )
    email: str | None = Field(
        None,
        description="Nuevo correo electrónico. Si se omite, no cambia.",
        examples=["ana.gomez@example.com"],
    )
    password: str | None = Field(
        None,
        description="Nueva contraseña. Si se omite, no cambia.",
        examples=["NuevaClave456"],
    )
    is_active: bool | None = Field(
        True,
        description="Nuevo estado de la cuenta. Si se omite, no cambia.",
        examples=[True],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "ana.gomez@example.com",
                "is_active": True,
            }
        }
    )


class RolCreateSchema(BaseModel):
    rol: str = Field(
        ...,
        description="Nombre del rol que se desea crear.",
        examples=["recepcionista"],
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"rol": "recepcionista"}}
    )


class RolResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único del rol.",
        examples=[3],
    )
    rol: str = Field(
        ...,
        description="Nombre del rol.",
        examples=["recepcionista"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={"example": {"id": 3, "rol": "recepcionista"}},
    )


class PacienteCreateSchema(BaseModel):
    id_usuario: int = Field(
        ...,
        description="Identificador del usuario al que pertenece el perfil.",
        examples=[42],
    )
    nombres: str = Field(
        ...,
        description="Nombres del paciente.",
        examples=["Ana María"],
    )
    apellidos: str = Field(
        ...,
        description="Apellidos del paciente.",
        examples=["Gómez Ruiz"],
    )
    fecha_nacimiento: date = Field(
        ...,
        description="Fecha de nacimiento del paciente.",
        examples=["1994-08-17"],
    )
    telefono: str = Field(
        ...,
        description="Número de teléfono de contacto.",
        examples=["+57 300 123 4567"],
    )
    direccion: str | None = Field(
        None,
        description="Dirección de residencia del paciente.",
        examples=["Calle 45 # 12-34, Bogotá"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id_usuario": 42,
                "nombres": "Ana María",
                "apellidos": "Gómez Ruiz",
                "fecha_nacimiento": "1994-08-17",
                "telefono": "+57 300 123 4567",
                "direccion": "Calle 45 # 12-34, Bogotá",
            }
        }
    )


class PacienteCreadoResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único del perfil de paciente.",
        examples=[12],
    )
    id_usuario: int = Field(
        ...,
        description="Identificador del usuario asociado.",
        examples=[42],
    )
    nombres: str = Field(
        ...,
        description="Nombres del paciente.",
        examples=["Ana María"],
    )
    apellidos: str = Field(
        ...,
        description="Apellidos del paciente.",
        examples=["Gómez Ruiz"],
    )
    fecha_nacimiento: date = Field(
        ...,
        description="Fecha de nacimiento del paciente.",
        examples=["1994-08-17"],
    )
    telefono: str = Field(
        ...,
        description="Teléfono de contacto del paciente.",
        examples=["+57 300 123 4567"],
    )
    direccion: str | None = Field(
        None,
        description="Dirección de residencia del paciente.",
        examples=["Calle 45 # 12-34, Bogotá"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 12,
                "id_usuario": 42,
                "nombres": "Ana María",
                "apellidos": "Gómez Ruiz",
                "fecha_nacimiento": "1994-08-17",
                "telefono": "+57 300 123 4567",
                "direccion": "Calle 45 # 12-34, Bogotá",
            }
        },
    )


class PacienteUpdateSchema(BaseModel):
    nombres: str | None = Field(
        None,
        description="Nuevos nombres del paciente. Si se omite, no cambia.",
        examples=["Ana María"],
    )
    apellidos: str | None = Field(
        None,
        description="Nuevos apellidos del paciente. Si se omite, no cambia.",
        examples=["Gómez Ruiz"],
    )
    fecha_nacimiento: date | None = Field(
        None,
        description="Nueva fecha de nacimiento. Si se omite, no cambia.",
        examples=["1994-08-17"],
    )
    telefono: str | None = Field(
        None,
        description="Nuevo teléfono de contacto. Si se omite, no cambia.",
        examples=["+57 300 123 4567"],
    )
    direccion: str | None = Field(
        None,
        description="Nueva dirección de residencia. Si se omite, no cambia.",
        examples=["Calle 45 # 12-34, Bogotá"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "telefono": "+57 300 765 4321",
                "direccion": "Carrera 10 # 20-30, Bogotá",
            }
        }
    )


class PacienteResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único del perfil de paciente.",
        examples=[12],
    )
    id_usuario: int = Field(
        ...,
        description="Identificador del usuario asociado.",
        examples=[42],
    )
    nombres: str = Field(
        ...,
        description="Nombres del paciente.",
        examples=["Ana María"],
    )
    apellidos: str = Field(
        ...,
        description="Apellidos del paciente.",
        examples=["Gómez Ruiz"],
    )
    fecha_nacimiento: date = Field(
        ...,
        description="Fecha de nacimiento del paciente.",
        examples=["1994-08-17"],
    )
    telefono: str = Field(
        ...,
        description="Teléfono de contacto del paciente.",
        examples=["+57 300 123 4567"],
    )
    numero_documento: str = Field(
        ...,
        description="Número de documento del usuario asociado.",
        examples=["1023456789"],
    )
    email: str = Field(
        ...,
        description="Correo electrónico del paciente.",
        examples=["ana.gomez@example.com"],
    )
    direccion: str | None = Field(
        None,
        description="Dirección de residencia del paciente.",
        examples=["Calle 45 # 12-34, Bogotá"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 12,
                "id_usuario": 42,
                "nombres": "Ana María",
                "apellidos": "Gómez Ruiz",
                "fecha_nacimiento": "1994-08-17",
                "telefono": "+57 300 123 4567",
                "numero_documento": "1023456789",
                "email": "ana.gomez@example.com",
                "direccion": "Calle 45 # 12-34, Bogotá",
            }
        },
    )


class MedicoCreateSchema(BaseModel):
    id_usuario: int = Field(
        ...,
        description="Identificador del usuario al que pertenece el perfil médico.",
        examples=[57],
    )
    nombres: str = Field(
        ...,
        description="Nombres del médico.",
        examples=["Carlos Andrés"],
    )
    apellidos: str = Field(
        ...,
        description="Apellidos del médico.",
        examples=["Rodríguez Peña"],
    )
    telefono: str = Field(
        ...,
        description="Teléfono de contacto del médico.",
        examples=["+57 310 555 0199"],
    )
    tarjeta_profesional: str = Field(
        ...,
        description="Número de tarjeta profesional único.",
        examples=["TP-987654"],
    )
    especialidad: str = Field(
        ...,
        description="Especialidad médica.",
        examples=["Cardiología"],
    )
    consultorio: str = Field(
        ...,
        description="Consultorio donde atiende el médico.",
        examples=["Consultorio 302"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id_usuario": 57,
                "nombres": "Carlos Andrés",
                "apellidos": "Rodríguez Peña",
                "telefono": "+57 310 555 0199",
                "tarjeta_profesional": "TP-987654",
                "especialidad": "Cardiología",
                "consultorio": "Consultorio 302",
            }
        }
    )


class MedicoCreadoResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único del perfil médico.",
        examples=[9],
    )
    id_usuario: int = Field(
        ...,
        description="Identificador del usuario asociado.",
        examples=[57],
    )
    nombres: str = Field(
        ...,
        description="Nombres del médico.",
        examples=["Carlos Andrés"],
    )
    apellidos: str = Field(
        ...,
        description="Apellidos del médico.",
        examples=["Rodríguez Peña"],
    )
    telefono: str = Field(
        ...,
        description="Teléfono de contacto del médico.",
        examples=["+57 310 555 0199"],
    )
    tarjeta_profesional: str = Field(
        ...,
        description="Número de tarjeta profesional.",
        examples=["TP-987654"],
    )
    especialidad: str = Field(
        ...,
        description="Especialidad médica.",
        examples=["Cardiología"],
    )
    consultorio: str = Field(
        ...,
        description="Consultorio donde atiende el médico.",
        examples=["Consultorio 302"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 9,
                "id_usuario": 57,
                "nombres": "Carlos Andrés",
                "apellidos": "Rodríguez Peña",
                "telefono": "+57 310 555 0199",
                "tarjeta_profesional": "TP-987654",
                "especialidad": "Cardiología",
                "consultorio": "Consultorio 302",
            }
        },
    )


class MedicoUpdateSchema(BaseModel):
    nombres: str | None = Field(
        None,
        description="Nuevos nombres del médico. Si se omite, no cambia.",
        examples=["Carlos Andrés"],
    )
    apellidos: str | None = Field(
        None,
        description="Nuevos apellidos del médico. Si se omite, no cambia.",
        examples=["Rodríguez Peña"],
    )
    telefono: str | None = Field(
        None,
        description="Nuevo teléfono de contacto. Si se omite, no cambia.",
        examples=["+57 310 555 0199"],
    )
    tarjeta_profesional: str | None = Field(
        None,
        description="Nueva tarjeta profesional. Si se omite, no cambia.",
        examples=["TP-987654"],
    )
    especialidad: str | None = Field(
        None,
        description="Nueva especialidad médica. Si se omite, no cambia.",
        examples=["Cardiología"],
    )
    consultorio: str | None = Field(
        None,
        description="Nuevo consultorio. Si se omite, no cambia.",
        examples=["Consultorio 302"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "telefono": "+57 310 555 0100",
                "consultorio": "Consultorio 305",
            }
        }
    )


class MedicoResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único del perfil médico.",
        examples=[9],
    )
    id_usuario: int = Field(
        ...,
        description="Identificador del usuario asociado.",
        examples=[57],
    )
    nombres: str = Field(
        ...,
        description="Nombres del médico.",
        examples=["Carlos Andrés"],
    )
    apellidos: str = Field(
        ...,
        description="Apellidos del médico.",
        examples=["Rodríguez Peña"],
    )
    telefono: str = Field(
        ...,
        description="Teléfono de contacto del médico.",
        examples=["+57 310 555 0199"],
    )
    numero_documento: str = Field(
        ...,
        description="Número de documento del usuario asociado.",
        examples=["98765432"],
    )
    email: str = Field(
        ...,
        description="Correo electrónico del médico.",
        examples=["carlos.rodriguez@example.com"],
    )
    tarjeta_profesional: str = Field(
        ...,
        description="Número de tarjeta profesional.",
        examples=["TP-987654"],
    )
    especialidad: str = Field(
        ...,
        description="Especialidad médica.",
        examples=["Cardiología"],
    )
    consultorio: str = Field(
        ...,
        description="Consultorio donde atiende el médico.",
        examples=["Consultorio 302"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 9,
                "id_usuario": 57,
                "nombres": "Carlos Andrés",
                "apellidos": "Rodríguez Peña",
                "telefono": "+57 310 555 0199",
                "numero_documento": "98765432",
                "email": "carlos.rodriguez@example.com",
                "tarjeta_profesional": "TP-987654",
                "especialidad": "Cardiología",
                "consultorio": "Consultorio 302",
            }
        },
    )


class LoginSchema(BaseModel):
    numero_documento: str = Field(
        ...,
        description="Número de documento registrado por el usuario.",
        examples=["1023456789"],
    )
    password: str = Field(
        ...,
        description="Contraseña del usuario.",
        examples=["ClaveSegura123"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "numero_documento": "1023456789",
                "password": "ClaveSegura123",
            }
        }
    )


class RegistroUsuarioSchema(BaseModel):
    id_rol: int = Field(
        ...,
        description="Identificador del rol seleccionado en la tabla de roles.",
        examples=[2],
    )
    tipo_documento: str = Field(
        ...,
        description="Tipo de documento de identidad.",
        examples=["CC"],
    )
    numero_documento: str = Field(
        ...,
        description="Número de documento único del usuario.",
        examples=["1023456789"],
    )
    email: str = Field(
        ...,
        description="Correo electrónico único del usuario.",
        examples=["ana.gomez@example.com"],
    )
    password: str = Field(
        ...,
        description="Contraseña en texto plano. La API la almacena cifrada.",
        examples=["ClaveSegura123"],
    )

    nombres: str | None = Field(
        None,
        description="Nombres del paciente o médico. Obligatorio para esos roles.",
        examples=["Ana María"],
    )
    apellidos: str | None = Field(
        None,
        description="Apellidos del paciente o médico. Obligatorio para esos roles.",
        examples=["Gómez Ruiz"],
    )
    fecha_nacimiento: date | None = Field(
        None,
        description="Fecha de nacimiento. Solo aplica al rol paciente.",
        examples=["1994-08-17"],
    )
    telefono: str | None = Field(
        None,
        description="Teléfono de contacto. Obligatorio para pacientes y médicos.",
        examples=["+57 300 123 4567"],
    )
    direccion: str | None = Field(
        None,
        description="Dirección de residencia. Solo aplica al rol paciente.",
        examples=["Calle 45 # 12-34, Bogotá"],
    )
    tarjeta_profesional: str | None = Field(
        None,
        description="Tarjeta profesional. Solo aplica al rol médico.",
        examples=["TP-987654"],
    )
    especialidad: str | None = Field(
        None,
        description="Especialidad médica. Solo aplica al rol médico.",
        examples=["Cardiología"],
    )
    consultorio: str | None = Field(
        None,
        description="Consultorio de atención. Solo aplica al rol médico.",
        examples=["Consultorio 302"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "summary": "Registro de paciente",
                    "value": {
                        "id_rol": 2,
                        "tipo_documento": "CC",
                        "numero_documento": "1023456789",
                        "email": "ana.gomez@example.com",
                        "password": "ClaveSegura123",
                        "nombres": "Ana María",
                        "apellidos": "Gómez Ruiz",
                        "fecha_nacimiento": "1994-08-17",
                        "telefono": "+57 300 123 4567",
                        "direccion": "Calle 45 # 12-34, Bogotá",
                    },
                },
                {
                    "summary": "Registro de médico",
                    "value": {
                        "id_rol": 3,
                        "tipo_documento": "CC",
                        "numero_documento": "98765432",
                        "email": "carlos.rodriguez@example.com",
                        "password": "ClaveSegura123",
                        "nombres": "Carlos Andrés",
                        "apellidos": "Rodríguez Peña",
                        "telefono": "+57 310 555 0199",
                        "tarjeta_profesional": "TP-987654",
                        "especialidad": "Cardiología",
                        "consultorio": "Consultorio 302",
                    },
                },
            ]
        }
    )


class AgendaCreateSchema(BaseModel):
    id_medico: int = Field(
        ...,
        description="Identificador del médico que tendrá la agenda.",
        examples=[9],
    )
    fecha_inicio: date = Field(
        ...,
        description="Primer día cubierto por la agenda.",
        examples=["2026-03-02"],
    )
    fecha_fin: date = Field(
        ...,
        description="Último día cubierto por la agenda.",
        examples=["2026-03-06"],
    )
    duracion_cita: int = Field(
        ...,
        description="Duración de cada cita en minutos.",
        examples=[30],
    )
    hora_inicio: time = Field(
        ...,
        description="Hora de inicio de la atención diaria.",
        examples=["08:00:00"],
    )
    hora_fin: time = Field(
        ...,
        description="Hora de finalización de la atención diaria.",
        examples=["12:00:00"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id_medico": 9,
                "fecha_inicio": "2026-03-02",
                "fecha_fin": "2026-03-06",
                "duracion_cita": 30,
                "hora_inicio": "08:00:00",
                "hora_fin": "12:00:00",
            }
        }
    )


class AgendaCreateResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único de la agenda.",
        examples=[21],
    )
    id_medico: int = Field(
        ...,
        description="Identificador del médico asociado.",
        examples=[9],
    )
    fecha_inicio: date = Field(
        ...,
        description="Primer día cubierto por la agenda.",
        examples=["2026-03-02"],
    )
    fecha_fin: date = Field(
        ...,
        description="Último día cubierto por la agenda.",
        examples=["2026-03-06"],
    )
    duracion_cita: int = Field(
        ...,
        description="Duración de cada cita en minutos.",
        examples=[30],
    )
    hora_inicio: time = Field(
        ...,
        description="Hora de inicio de la atención diaria.",
        examples=["08:00:00"],
    )
    hora_fin: time = Field(
        ...,
        description="Hora de finalización de la atención diaria.",
        examples=["12:00:00"],
    )
    estado: str = Field(
        ...,
        description="Estado de la agenda: activo o inactivo.",
        examples=["activo"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 21,
                "id_medico": 9,
                "fecha_inicio": "2026-03-02",
                "fecha_fin": "2026-03-06",
                "duracion_cita": 30,
                "hora_inicio": "08:00:00",
                "hora_fin": "12:00:00",
                "estado": "activo",
            }
        },
    )


class AgendaResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único de la agenda.",
        examples=[21],
    )
    medico: str = Field(
        ...,
        description="Nombre completo del médico.",
        examples=["Rodríguez Peña Carlos Andrés"],
    )
    fecha_inicio: date = Field(
        ...,
        description="Primer día cubierto por la agenda.",
        examples=["2026-03-02"],
    )
    fecha_fin: date = Field(
        ...,
        description="Último día cubierto por la agenda.",
        examples=["2026-03-06"],
    )
    duracion_cita: int = Field(
        ...,
        description="Duración de cada cita en minutos.",
        examples=[30],
    )
    hora_inicio: time = Field(
        ...,
        description="Hora de inicio de la atención diaria.",
        examples=["08:00:00"],
    )
    hora_fin: time = Field(
        ...,
        description="Hora de finalización de la atención diaria.",
        examples=["12:00:00"],
    )
    estado: str = Field(
        ...,
        description="Estado de la agenda: activo o inactivo.",
        examples=["activo"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 21,
                "medico": "Rodríguez Peña Carlos Andrés",
                "fecha_inicio": "2026-03-02",
                "fecha_fin": "2026-03-06",
                "duracion_cita": 30,
                "hora_inicio": "08:00:00",
                "hora_fin": "12:00:00",
                "estado": "activo",
            }
        },
    )


class AgendaUpdateSchema(BaseModel):
    id_medico: int | None = Field(
        None,
        description="Nuevo médico asociado. Si se omite, no cambia.",
        examples=[9],
    )
    fecha_inicio: date | None = Field(
        None,
        description="Nueva fecha de inicio. Si se omite, no cambia.",
        examples=["2026-03-02"],
    )
    fecha_fin: date | None = Field(
        None,
        description="Nueva fecha de fin. Si se omite, no cambia.",
        examples=["2026-03-06"],
    )
    duracion_cita: int | None = Field(
        None,
        description="Nueva duración de la cita en minutos. Si se omite, no cambia.",
        examples=[30],
    )
    hora_inicio: time | None = Field(
        None,
        description="Nueva hora de inicio. Si se omite, no cambia.",
        examples=["08:00:00"],
    )
    hora_fin: time | None = Field(
        None,
        description="Nueva hora de fin. Si se omite, no cambia.",
        examples=["12:00:00"],
    )
    estado: str | None = Field(
        None,
        description="Nuevo estado de la agenda: activo o inactivo.",
        examples=["inactivo"],
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"estado": "inactivo"}}
    )


class GenerarCuposResponseSchema(BaseModel):
    agenda_id: int = Field(
        ...,
        description="Identificador de la agenda procesada.",
        examples=[21],
    )
    cupos_creados: int = Field(
        ...,
        description="Cantidad de cupos nuevos creados.",
        examples=[40],
    )
    cupos_omitidos: int = Field(
        ...,
        description="Cantidad de cupos que ya existían y no se duplicaron.",
        examples=[0],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "agenda_id": 21,
                "cupos_creados": 40,
                "cupos_omitidos": 0,
            }
        }
    )


class CupoResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único del cupo.",
        examples=[301],
    )
    id_agenda_medica: int = Field(
        ...,
        description="Identificador de la agenda que generó el cupo.",
        examples=[21],
    )
    fecha_cupo: date = Field(
        ...,
        description="Fecha del cupo.",
        examples=["2026-03-02"],
    )
    hora_cupo: time = Field(
        ...,
        description="Hora del cupo.",
        examples=["08:30:00"],
    )
    estado: str = Field(
        ...,
        description="Estado del cupo: disponible, reservado, ocupado o cancelado.",
        examples=["disponible"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 301,
                "id_agenda_medica": 21,
                "fecha_cupo": "2026-03-02",
                "hora_cupo": "08:30:00",
                "estado": "disponible",
            }
        },
    )


class CupoDisponibleResponseSchema(BaseModel):
    id_cupo: int = Field(
        ...,
        description="Identificador único del cupo disponible.",
        examples=[301],
    )
    fecha_cupo: date = Field(
        ...,
        description="Fecha del cupo.",
        examples=["2026-03-02"],
    )
    hora_cupo: time = Field(
        ...,
        description="Hora del cupo.",
        examples=["08:30:00"],
    )
    duracion_cita: int = Field(
        ...,
        description="Duración de la cita en minutos.",
        examples=[30],
    )
    id_medico: int = Field(
        ...,
        description="Identificador del médico.",
        examples=[9],
    )
    medico: str = Field(
        ...,
        description="Nombre completo del médico.",
        examples=["Rodríguez Peña Carlos Andrés"],
    )
    especialidad: str = Field(
        ...,
        description="Especialidad del médico.",
        examples=["Cardiología"],
    )
    consultorio: str = Field(
        ...,
        description="Consultorio donde se atenderá la cita.",
        examples=["Consultorio 302"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id_cupo": 301,
                "fecha_cupo": "2026-03-02",
                "hora_cupo": "08:30:00",
                "duracion_cita": 30,
                "id_medico": 9,
                "medico": "Rodríguez Peña Carlos Andrés",
                "especialidad": "Cardiología",
                "consultorio": "Consultorio 302",
            }
        },
    )


class CupoDetalleResponseSchema(BaseModel):
    id_cupo: int = Field(
        ...,
        description="Identificador único del cupo.",
        examples=[301],
    )
    fecha_cupo: date = Field(
        ...,
        description="Fecha del cupo.",
        examples=["2026-03-02"],
    )
    hora_cupo: time = Field(
        ...,
        description="Hora del cupo.",
        examples=["08:30:00"],
    )
    estado_cupo: str = Field(
        ...,
        description="Estado actual del cupo.",
        examples=["disponible"],
    )
    duracion_cita: int = Field(
        ...,
        description="Duración de la cita en minutos.",
        examples=[30],
    )
    estado_agenda: str = Field(
        ...,
        description="Estado de la agenda asociada.",
        examples=["activo"],
    )
    id_medico: int = Field(
        ...,
        description="Identificador del médico.",
        examples=[9],
    )
    medico: str = Field(
        ...,
        description="Nombre completo del médico.",
        examples=["Rodríguez Peña Carlos Andrés"],
    )
    especialidad: str = Field(
        ...,
        description="Especialidad del médico.",
        examples=["Cardiología"],
    )
    consultorio: str = Field(
        ...,
        description="Consultorio donde se atenderá la cita.",
        examples=["Consultorio 302"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id_cupo": 301,
                "fecha_cupo": "2026-03-02",
                "hora_cupo": "08:30:00",
                "estado_cupo": "disponible",
                "duracion_cita": 30,
                "estado_agenda": "activo",
                "id_medico": 9,
                "medico": "Rodríguez Peña Carlos Andrés",
                "especialidad": "Cardiología",
                "consultorio": "Consultorio 302",
            }
        },
    )


class CupoUpdateSchema(BaseModel):
    estado: EstadoCupo = Field(
        ...,
        description=(
            "Nuevo estado del cupo. Los estados reservado y ocupado solo se "
            "asignan automáticamente al crear citas u ofertas."
        ),
        examples=["cancelado"],
    )

    model_config = ConfigDict(json_schema_extra={"example": {"estado": "cancelado"}})


class CitaCreateSchema(BaseModel):
    id_cupo: int = Field(
        ...,
        description="Identificador del cupo que se desea reservar.",
        examples=[301],
    )
    id_paciente: int = Field(
        ...,
        description="Identificador del paciente que reserva la cita.",
        examples=[12],
    )
    motivo_consulta: str | None = Field(
        None,
        description="Motivo de la consulta expresado por el paciente.",
        examples=["Dolor en el pecho al hacer ejercicio"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id_cupo": 301,
                "id_paciente": 12,
                "motivo_consulta": "Dolor en el pecho al hacer ejercicio",
            }
        }
    )


class CitaResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único de la cita.",
        examples=[88],
    )
    id_cupo: int = Field(
        ...,
        description="Identificador del cupo reservado.",
        examples=[301],
    )
    id_paciente: int = Field(
        ...,
        description="Identificador del paciente.",
        examples=[12],
    )
    motivo_consulta: str | None = Field(
        None,
        description="Motivo de la consulta.",
        examples=["Dolor en el pecho al hacer ejercicio"],
    )
    estado: str = Field(
        ...,
        description="Estado de la cita: pendiente, confirmada, atendida, cancelada o no_asistio.",
        examples=["pendiente"],
    )
    created_at: datetime = Field(
        ...,
        description="Fecha y hora de creación de la cita.",
        examples=["2026-02-25T14:30:00"],
    )
    updated_at: datetime = Field(
        ...,
        description="Fecha y hora de la última actualización.",
        examples=["2026-02-25T14:30:00"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 88,
                "id_cupo": 301,
                "id_paciente": 12,
                "motivo_consulta": "Dolor en el pecho al hacer ejercicio",
                "estado": "pendiente",
                "created_at": "2026-02-25T14:30:00",
                "updated_at": "2026-02-25T14:30:00",
            }
        },
    )


class CitaDetalleResponseSchema(CitaResponseSchema):
    paciente: str = Field(
        ...,
        description="Nombre completo del paciente.",
        examples=["Ana María Gómez Ruiz"],
    )
    numero_documento: str = Field(
        ...,
        description="Número de documento del paciente.",
        examples=["1023456789"],
    )
    email: str = Field(
        ...,
        description="Correo electrónico del paciente.",
        examples=["ana.gomez@example.com"],
    )
    id_medico: int = Field(
        ...,
        description="Identificador del médico que atiende la cita.",
        examples=[9],
    )
    medico: str = Field(
        ...,
        description="Nombre completo del médico.",
        examples=["Rodríguez Peña Carlos Andrés"],
    )
    especialidad: str = Field(
        ...,
        description="Especialidad del médico.",
        examples=["Cardiología"],
    )
    consultorio: str = Field(
        ...,
        description="Consultorio donde se atenderá la cita.",
        examples=["Consultorio 302"],
    )
    fecha_cupo: date = Field(
        ...,
        description="Fecha de la cita.",
        examples=["2026-03-02"],
    )
    hora_cupo: time = Field(
        ...,
        description="Hora de la cita.",
        examples=["08:30:00"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 88,
                "id_cupo": 301,
                "id_paciente": 12,
                "motivo_consulta": "Dolor en el pecho al hacer ejercicio",
                "estado": "pendiente",
                "created_at": "2026-02-25T14:30:00",
                "updated_at": "2026-02-25T14:30:00",
                "paciente": "Ana María Gómez Ruiz",
                "numero_documento": "1023456789",
                "email": "ana.gomez@example.com",
                "id_medico": 9,
                "medico": "Rodríguez Peña Carlos Andrés",
                "especialidad": "Cardiología",
                "consultorio": "Consultorio 302",
                "fecha_cupo": "2026-03-02",
                "hora_cupo": "08:30:00",
            }
        },
    )


class CitaEstadoUpdateSchema(BaseModel):
    estado: Literal["confirmada", "atendida", "no_asistio"] = Field(
        ...,
        description="Nuevo estado de asistencia de la cita.",
        examples=["confirmada"],
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"estado": "confirmada"}}
    )


class ListaEsperaCreateSchema(BaseModel):
    id_paciente: int = Field(
        ...,
        description="Identificador del paciente que solicita el cupo.",
        examples=[12],
    )
    id_medico: int | None = Field(
        None,
        description=(
            "Médico preferido. Si se omite, la solicitud acepta cualquier "
            "especialidad. Si se informa, la solicitud solo es compatible con "
            "cupos de la especialidad de ese médico."
        ),
        examples=[9],
    )
    prioridad: int = Field(
        default=0,
        ge=0,
        description=(
            "Prioridad informativa de la solicitud. La asignación de cupos se "
            "realiza estrictamente por orden de llegada (FIFO)."
        ),
        examples=[1],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id_paciente": 12,
                "id_medico": 9,
                "prioridad": 1,
            }
        }
    )


class ListaEsperaResponseSchema(BaseModel):
    id: int = Field(
        ...,
        description="Identificador único de la solicitud.",
        examples=[55],
    )
    id_paciente: int = Field(
        ...,
        description="Identificador del paciente.",
        examples=[12],
    )
    id_medico: int | None = Field(
        None,
        description="Identificador del médico preferido.",
        examples=[9],
    )
    prioridad: int = Field(
        ...,
        description="Prioridad de la solicitud.",
        examples=[1],
    )
    id_cupo_ofrecido: int | None = Field(
        None,
        description="Identificador del cupo ofrecido al paciente.",
        examples=[301],
    )
    fecha_solicitud: datetime = Field(
        ...,
        description="Fecha y hora en que se creó la solicitud.",
        examples=["2026-02-25T15:00:00"],
    )
    fecha_oferta: datetime | None = Field(
        None,
        description="Fecha y hora en que se ofreció un cupo.",
        examples=["2026-02-26T09:00:00"],
    )
    fecha_expiracion: datetime | None = Field(
        None,
        description="Fecha y hora en que expira la oferta.",
        examples=["2026-02-28T09:00:00"],
    )
    estado: str = Field(
        ...,
        description=(
            "Estado de la solicitud: pendiente, ofrecida, aceptada, "
            "rechazada, expirada o cancelada."
        ),
        examples=["pendiente"],
    )
    created_at: datetime = Field(
        ...,
        description="Fecha y hora de creación del registro.",
        examples=["2026-02-25T15:00:00"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 55,
                "id_paciente": 12,
                "id_medico": 9,
                "prioridad": 1,
                "id_cupo_ofrecido": 301,
                "fecha_solicitud": "2026-02-25T15:00:00",
                "fecha_oferta": "2026-02-26T09:00:00",
                "fecha_expiracion": "2026-02-28T09:00:00",
                "estado": "pendiente",
                "created_at": "2026-02-25T15:00:00",
            }
        },
    )


class ListaEsperaDetalleResponseSchema(ListaEsperaResponseSchema):
    paciente: str = Field(
        ...,
        description="Nombre completo del paciente.",
        examples=["Ana María Gómez Ruiz"],
    )
    numero_documento: str = Field(
        ...,
        description="Número de documento del paciente.",
        examples=["1023456789"],
    )
    email: str = Field(
        ...,
        description="Correo electrónico del paciente.",
        examples=["ana.gomez@example.com"],
    )
    medico: str | None = Field(
        None,
        description="Nombre completo del médico preferido.",
        examples=["Rodríguez Peña Carlos Andrés"],
    )
    especialidad: str | None = Field(
        None,
        description="Especialidad del médico preferido.",
        examples=["Cardiología"],
    )
    medico_ofrecido: str | None = Field(
        None,
        description="Nombre completo del médico del cupo ofrecido.",
        examples=["Rodríguez Peña Carlos Andrés"],
    )
    especialidad_ofrecida: str | None = Field(
        None,
        description="Especialidad del médico del cupo ofrecido.",
        examples=["Cardiología"],
    )
    fecha_cupo: date | None = Field(
        None,
        description="Fecha del cupo ofrecido.",
        examples=["2026-03-02"],
    )
    hora_cupo: time | None = Field(
        None,
        description="Hora del cupo ofrecido.",
        examples=["08:30:00"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 55,
                "id_paciente": 12,
                "id_medico": 9,
                "prioridad": 1,
                "id_cupo_ofrecido": 301,
                "fecha_solicitud": "2026-02-25T15:00:00",
                "fecha_oferta": "2026-02-26T09:00:00",
                "fecha_expiracion": "2026-02-28T09:00:00",
                "estado": "ofrecida",
                "created_at": "2026-02-25T15:00:00",
                "paciente": "Ana María Gómez Ruiz",
                "numero_documento": "1023456789",
                "email": "ana.gomez@example.com",
                "medico": "Rodríguez Peña Carlos Andrés",
                "especialidad": "Cardiología",
                "fecha_cupo": "2026-03-02",
                "hora_cupo": "08:30:00",
            }
        },
    )


class OfertaCupoResponseSchema(BaseModel):
    id_lista_espera: int = Field(
        ...,
        description="Identificador de la solicitud que recibió la oferta.",
        examples=[55],
    )
    id_paciente: int = Field(
        ...,
        description="Identificador del paciente.",
        examples=[12],
    )
    paciente: str = Field(
        ...,
        description="Nombre completo del paciente.",
        examples=["Ana María Gómez Ruiz"],
    )
    id_cupo: int = Field(
        ...,
        description="Identificador del cupo ofrecido.",
        examples=[301],
    )
    id_medico: int = Field(
        ...,
        description="Identificador del médico.",
        examples=[9],
    )
    medico: str = Field(
        ...,
        description="Nombre completo del médico.",
        examples=["Rodríguez Peña Carlos Andrés"],
    )
    fecha_cupo: date = Field(
        ...,
        description="Fecha del cupo ofrecido.",
        examples=["2026-03-02"],
    )
    hora_cupo: time = Field(
        ...,
        description="Hora del cupo ofrecido.",
        examples=["08:30:00"],
    )
    fecha_expiracion: datetime = Field(
        ...,
        description=(
            "Fecha y hora máxima para confirmar la oferta. Equivale a 48 horas "
            "desde la oferta, pero nunca supera la hora de la cita."
        ),
        examples=["2026-02-28T09:00:00"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id_lista_espera": 55,
                "id_paciente": 12,
                "paciente": "Ana María Gómez Ruiz",
                "id_cupo": 301,
                "id_medico": 9,
                "medico": "Rodríguez Peña Carlos Andrés",
                "fecha_cupo": "2026-03-02",
                "hora_cupo": "08:30:00",
                "fecha_expiracion": "2026-02-28T09:00:00",
            }
        },
    )


class CitaConOfertaResponseSchema(BaseModel):
    cita: CitaResponseSchema = Field(
        ...,
        description="Cita creada o actualizada.",
    )
    oferta: OfertaCupoResponseSchema | None = Field(
        None,
        description="Oferta generada para la lista de espera, si aplica.",
    )


class ProcesarExpiradasResponseSchema(BaseModel):
    ofertas_expiradas: int = Field(
        ...,
        description="Cantidad de ofertas que expiraron en esta ejecución.",
        examples=[3],
    )
    nuevas_ofertas: int = Field(
        ...,
        description="Cantidad de nuevas ofertas generadas.",
        examples=[2],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"ofertas_expiradas": 3, "nuevas_ofertas": 2}
        }
    )
