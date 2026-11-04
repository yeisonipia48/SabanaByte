import asyncio
import os
from logging.config import fileConfig

import sys
from pathlib import Path

# BASE_DIR apunta a la carpeta 'alembicApi' (un nivel arriba de 'appclinica')
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

# Importar models desde alembicApi
from models import Base
from alembic import context

config = context.config

def _leer_secreto(nombre: str) -> str:
    ruta = Path(f"/run/secrets/{nombre}")
    if ruta.exists():
        return ruta.read_text().strip()
    valor = os.getenv(nombre)
    if valor is None:
        raise RuntimeError(
            f"No se encontró el secreto {nombre} ni la variable de entorno {nombre}"
        )
    return valor


db_user = _leer_secreto("postgres_user")
password = _leer_secreto("postgres_password")
host = _leer_secreto("postgres_host")
db = _leer_secreto("postgres_db")

url_db = f'postgresql+asyncpg://{db_user}:{password}@{host}:6432/{db}'

if url_db:
    config.set_main_option("sqlalchemy.url", url_db)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramtype": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(url_db, poolclass=pool.NullPool)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()