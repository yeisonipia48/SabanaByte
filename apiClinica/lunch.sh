#!/usr/bin/env bash

set -e

# Cargar variables del archivo .env si existe
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "Construyendo las imágenes..."
docker build --no-cache -t api-clinica:v1 .
docker build --no-cache -t frontendcitas:v1 TestPhp/.

echo "Gestionando secretos de Docker Swarm..."
docker secret inspect postgres_user >/dev/null 2>&1 || echo "$postgres_user" | docker secret create postgres_user -
docker secret inspect postgres_password >/dev/null 2>&1 || echo "$postgres_password" | docker secret create postgres_password -
docker secret inspect postgres_host >/dev/null 2>&1 || echo "$postgres_host" | docker secret create postgres_host -
docker secret inspect postgres_db >/dev/null 2>&1 || echo "$postgres_db" | docker secret create postgres_db -

echo "Desplegando el stack en Docker Swarm..."
docker stack deploy -c stack.yaml apiclinica_stack

echo "Esperando a que los servicios inicien..."
sleep 5

echo "Aplicando migraciones con Alembic..."
contenedor_api=$(docker ps -q --filter "label=com.docker.swarm.service.name=apiclinica_stack_api" | head -n1)
if [ -n "$contenedor_api" ]; then
    docker exec -it "$contenedor_api" alembic -c alembicApi/alembic.ini upgrade head
    echo "¡Migraciones aplicadas con éxito!"
else
    echo "Aviso: No se encontró el contenedor de la API en ejecución para correr Alembic."
fi

echo "¡Proceso finalizado con éxito!"