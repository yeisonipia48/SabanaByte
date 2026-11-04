import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

pwd_context = PasswordHash((BcryptHasher(),))

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8


def _leer_secreto(nombre: str) -> str | None:
    ruta = f"/run/secrets/{nombre}"
    if os.path.exists(ruta):
        with open(ruta) as f:
            return f.read().strip()
    valor = os.getenv(nombre)
    return valor.strip() if valor else None


JWT_SECRET = _leer_secreto("jwt_secret") or secrets.token_urlsafe(48)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    *,
    user_id: int,
    rol: str,
    expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES,
) -> tuple[str, int]:
    expires_in = max(1, expires_minutes) * 60
    ahora = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "rol": rol,
        "iat": ahora,
        "exp": ahora + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM), expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
