from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, ForeignKey, Date, Time, Text, func, DateTime
from sqlalchemy import Index, UniqueConstraint, text
from datetime import date, datetime, time
from typing import Optional
from sqlalchemy.orm import relationship


class Base(DeclarativeBase):
    pass

#Almacena los roles del sistema: paciente, medico, administrador.
class Roles(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer,primary_key=True, autoincrement=True)
    rol: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    usuarios: Mapped[list["Usuarios"]] = relationship(back_populates="rol")

#Tabla central para autenticación
class Usuarios(Base):
    __tablename__ = "usuarios"

    id:Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True)
    id_rol:Mapped[int] = mapped_column(Integer, ForeignKey(
        "roles.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=False)
    tipo_documento:Mapped[str] = mapped_column(String(10), nullable=False)
    numero_documento:Mapped[str]= mapped_column(String(20), unique=True, nullable=False)
    email:Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password:Mapped[str] = mapped_column(String(255), nullable=False)
    is_active:Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at:Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    rol: Mapped["Roles"] = relationship(back_populates="usuarios")
    paciente: Mapped["Pacientes"] = relationship(back_populates="usuario", uselist=False)
    medico: Mapped["Medicos"] = relationship(back_populates="usuario", uselist=False)

#Información demográfica y de contacto del paciente.
class Pacientes(Base):
    __tablename__ = "pacientes"

    id:Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True)
    id_usuario:Mapped[int] = mapped_column(Integer, ForeignKey(
        "usuarios.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=False, unique=True)
    nombres:Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos:Mapped[str] = mapped_column(String(100), nullable=False)
    fecha_nacimiento:Mapped[date] = mapped_column(Date, nullable=False)
    telefono:Mapped[str] = mapped_column(String(20), nullable=False)
    direccion:Mapped[str] = mapped_column(String(155), nullable=True)

    usuario: Mapped["Usuarios"] = relationship(back_populates="paciente")
    citas: Mapped[list["Citas"]] = relationship(back_populates="paciente")
    lista_espera: Mapped[list["Lista_Espera"]] = relationship(back_populates="paciente")

#Información del personal de salud.
class Medicos(Base):
    __tablename__ = "medicos"

    id:Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True)
    id_usuario:Mapped[int] = mapped_column(Integer, ForeignKey(
        "usuarios.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=False, unique=True)
    nombres:Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos:Mapped[str] = mapped_column(String(100), nullable=False)
    telefono:Mapped[str] = mapped_column(String(20), nullable=False)
    tarjeta_profesional:Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    especialidad:Mapped[str] = mapped_column(String(100), nullable=False)
    consultorio:Mapped[str] = mapped_column(String(50), nullable=False)

    usuario: Mapped["Usuarios"] = relationship(back_populates="medico")
    agendas: Mapped[list["Agenda_Medicas"]] = relationship(back_populates="medico")
    lista_espera: Mapped[list["Lista_Espera"]] = relationship(back_populates="medico")

#Define la disponibilidad general que un administrador/médico habilita para un período.
class Agenda_Medicas(Base):
    __tablename__ = "agenda_medicas"
    __table_args__ = (
        Index("ix_agenda_medico_estado", "id_medico", "estado"),
    )

    id:Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True)
    id_medico:Mapped[int] = mapped_column(Integer, ForeignKey(
        "medicos.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=False)
    fecha_inicio:Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin:Mapped[date] = mapped_column(Date, nullable=False)
    duracion_cita:Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    hora_inicio:Mapped[time] = mapped_column(Time, nullable=False)
    hora_fin:Mapped[time] = mapped_column(Time, nullable=False)
    estado:Mapped[str] = mapped_column(String(20), nullable=False, server_default="activo")

    medico: Mapped["Medicos"] = relationship(back_populates="agendas")
    cupos: Mapped[list["Cupos"]] = relationship(back_populates="agenda")

#Los intervalos de tiempo concretos (cupos) generados a partir de la agenda.
class Cupos(Base):
    __tablename__ = "cupos"
    __table_args__ = (
        UniqueConstraint(
            "id_agenda_medica", "fecha_cupo", "hora_cupo",
            name="uq_cupo_agenda_fecha_hora",
        ),
        Index("ix_cupos_estado_fecha", "estado", "fecha_cupo"),
    )

    id:Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True)
    id_agenda_medica:Mapped[int] = mapped_column(Integer, ForeignKey(
        "agenda_medicas.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=False)
    fecha_cupo:Mapped[date] = mapped_column(Date, nullable=False)
    hora_cupo:Mapped[time] = mapped_column(Time, nullable=False)
    estado:Mapped[str] = mapped_column(String(20), nullable=False, server_default="disponible")

    agenda: Mapped["Agenda_Medicas"] = relationship(back_populates="cupos")
    citas: Mapped[list["Citas"]] = relationship(back_populates="cupo")

#Representa la reserva activa o histórica de un paciente.
class Citas(Base):
    __tablename__ = "citas"
    __table_args__ = (
        Index(
            "uq_cita_cupo_activa",
            "id_cupo",
            unique=True,
            postgresql_where=text("estado IN ('pendiente', 'confirmada')"),
        ),
        Index("ix_citas_paciente_estado", "id_paciente", "estado"),
    )

    id:Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True)
    id_cupo:Mapped[int] = mapped_column(Integer, ForeignKey(
        "cupos.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=False)
    id_paciente:Mapped[int] = mapped_column(Integer, ForeignKey(
        "pacientes.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=False, unique=False)
    motivo_consulta:Mapped[str] = mapped_column(Text, nullable=True)
    estado:Mapped[str] = mapped_column(String(20), nullable=False, server_default="pendiente")
    created_at:Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at:Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    cupo: Mapped["Cupos"] = relationship(back_populates="citas")
    paciente: Mapped["Pacientes"] = relationship(back_populates="citas")
                                                 
class Lista_Espera(Base):
    __tablename__ = "lista_espera"
    __table_args__ = (
        Index("ix_lista_espera_estado_medico", "estado", "id_medico"),
        Index("ix_lista_espera_oferta", "estado", "fecha_expiracion"),
    )

    id:Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True)
    id_paciente:Mapped[int] = mapped_column(Integer, ForeignKey(
        "pacientes.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=False)
    id_medico:Mapped[Optional[int]] = mapped_column(Integer, ForeignKey(
        "medicos.id", ondelete="CASCADE", onupdate="CASCADE"),
          nullable=True)
    prioridad:Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    id_cupo_ofrecido:Mapped[Optional[int]] = mapped_column(Integer, ForeignKey(
        "cupos.id", ondelete="SET NULL", onupdate="CASCADE"),
          nullable=True)
    fecha_solicitud:Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    fecha_oferta:Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    fecha_expiracion:Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    estado:Mapped[str] = mapped_column(String(20), nullable=False, server_default="pendiente")
    created_at:Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    paciente: Mapped["Pacientes"] = relationship(back_populates="lista_espera")
    medico: Mapped[Optional["Medicos"]] = relationship(back_populates="lista_espera")
    cupo_ofrecido: Mapped[Optional["Cupos"]] = relationship(foreign_keys=[id_cupo_ofrecido])