import unicodedata
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from alembicApi import models
from repository import get_conexion
from Security.security import decode_access_token, oauth2_scheme


def normalizar_rol(valor: str) -> str:
    texto = unicodedata.normalize("NFD", (valor or "").strip().lower())
    limpio = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    sinonimos = {
        "admin": "administrador",
        "administrador": "administrador",
        "medico": "medico",
        "doctor": "medico",
        "paciente": "paciente",
    }
    return sinonimos.get(limpio, limpio)


@dataclass
class UsuarioAutenticado:
    id: int
    id_rol: int
    rol: str
    numero_documento: str
    email: str
    is_active: bool
    id_paciente: int | None = None
    id_medico: int | None = None

    @property
    def rol_normalizado(self) -> str:
        return normalizar_rol(self.rol)


def _credenciales_invalidas() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado o token inválido.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_conexion),
) -> UsuarioAutenticado:
    if not token:
        raise _credenciales_invalidas()

    try:
        payload = decode_access_token(token)
    except InvalidTokenError as exc:
        raise _credenciales_invalidas() from exc

    subject = payload.get("sub")
    try:
        user_id = int(subject)
    except (TypeError, ValueError) as exc:
        raise _credenciales_invalidas() from exc

    fila = (
        await session.execute(
            select(models.Usuarios, models.Roles.rol)
            .join(models.Roles, models.Usuarios.id_rol == models.Roles.id)
            .where(models.Usuarios.id == user_id)
        )
    ).one_or_none()

    if fila is None:
        raise _credenciales_invalidas()

    usuario, rol = fila
    if not usuario.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está inactiva.",
        )

    id_paciente = await session.scalar(
        select(models.Pacientes.id).where(models.Pacientes.id_usuario == usuario.id)
    )
    id_medico = await session.scalar(
        select(models.Medicos.id).where(models.Medicos.id_usuario == usuario.id)
    )

    return UsuarioAutenticado(
        id=usuario.id,
        id_rol=usuario.id_rol,
        rol=rol,
        numero_documento=usuario.numero_documento,
        email=usuario.email,
        is_active=usuario.is_active,
        id_paciente=id_paciente,
        id_medico=id_medico,
    )


def require_roles(*roles: str):
    permitidos = {normalizar_rol(rol) for rol in roles}

    async def dependencia(
        usuario: UsuarioAutenticado = Depends(get_current_user),
    ) -> UsuarioAutenticado:
        if usuario.rol_normalizado not in permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción.",
            )
        return usuario

    return dependencia


def es_admin(usuario: UsuarioAutenticado) -> bool:
    return usuario.rol_normalizado == "administrador"


def es_medico(usuario: UsuarioAutenticado) -> bool:
    return usuario.rol_normalizado == "medico"


def es_paciente(usuario: UsuarioAutenticado) -> bool:
    return usuario.rol_normalizado == "paciente"


def verificar_acceso_paciente(usuario: UsuarioAutenticado, id_paciente: int) -> None:
    if es_admin(usuario) or es_medico(usuario):
        return
    if usuario.id_paciente != id_paciente:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes acceder a información de otro paciente.",
        )
