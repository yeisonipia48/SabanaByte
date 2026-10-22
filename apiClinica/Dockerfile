
#  ETAPA 1: El Constructor 

FROM python:3.12-slim AS builder

WORKDIR /app

# 1. Creamos un entorno virtual aislado en una ruta fija
RUN python -m venv /opt/venv
# Activamos el entorno virtual para los siguientes comandos de esta etapa
ENV PATH="/opt/venv/bin:$PATH"

COPY requierements.txt .

# 2. Instalamos las librerías directamente en el entorno virtual
# Aquí se descargará psycopg2-binary, fastapi, uvicorn, etc.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requierements.txt



#  ETAPA 2: El Entorno de Ejecución Final 

FROM python:3.12-slim AS runtime

# 1. Creamos el usuario seguro sin privilegios
RUN useradd -m appuser
WORKDIR /app

# 2. Herramientas de diagnóstico 
RUN apt-get update && apt-get install -y --no-install-recommends \
    nano \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# 3. MULTI-STAGE:
# Copiamos el entorno virtual COMPLETO desde la etapa anterior.

COPY --from=builder /opt/venv /opt/venv

# 4. Forzamos a que esta imagen final use el entorno virtual copiado
ENV PATH="/opt/venv/bin:$PATH"

# 5. Copiamos tu código fuente asignándole la propiedad a appuser de una vez
COPY --chown=appuser:appuser . .

# 6. Activamos el usuario seguro
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]