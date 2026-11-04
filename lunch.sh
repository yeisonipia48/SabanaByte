#!/usr/bin/env bash

set -e

# Cargar variables del archivo .env si existe
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "Construyendo las imágenes..."
docker build --no-cache -t api-clinica:v1 apiClinica/.
docker build --no-cache -t frontendcitas:v1 client/.

echo "Gestionando secretos de Docker Swarm..."
docker secret inspect postgres_user >/dev/null 2>&1 || echo "$postgres_user" | docker secret create postgres_user -
docker secret inspect postgres_password >/dev/null 2>&1 || echo "$postgres_password" | docker secret create postgres_password -
docker secret inspect postgres_host >/dev/null 2>&1 || echo "$postgres_host" | docker secret create postgres_host -
docker secret inspect postgres_db >/dev/null 2>&1 || echo "$postgres_db" | docker secret create postgres_db -

# Secreto estable para firmar los JWT. Sin él cada réplica usaría una clave
# distinta y los tokens dejarían de ser válidos entre reinicios o réplicas.
if [ -z "${jwt_secret:-}" ]; then
  jwt_secret=$(openssl rand -base64 48)
fi
docker secret inspect jwt_secret >/dev/null 2>&1 || echo "$jwt_secret" | docker secret create jwt_secret -

echo "Desplegando el stack en Docker Swarm..."
docker stack deploy -c stack.yaml app-clinica


echo "Esperando a que los servicios inicien..."
sleep 10

contenedor_data=$(docker ps | grep app-clinica_data | awk '{print $1}' | head -n 1)
if [ -n "$contenedor_data" ]; then
    echo "Ejecutando script de inicialización de la base de datos..."
    docker exec -i "$contenedor_data" psql -U "$postgres_user" -d "$postgres_db" -c "SELECT 1;" >/dev/null 2>&1 || docker exec -it "$contenedor_data" psql -U "$postgres_user" -c "CREATE DATABASE $postgres_db;"
fi

echo "Aplicando migraciones con Alembic..."
contenedor_api=$(docker ps | grep app-clinica_api | awk '{print $1}' | head -n 1)
if [ -n "$contenedor_api" ]; then
    docker exec -i "$contenedor_api" alembic -c alembicApi/alembic.ini revision --autogenerate -m "configuracion inicial"
    docker exec -i "$contenedor_api" alembic -c alembicApi/alembic.ini upgrade +1
    echo "¡Migraciones aplicadas con éxito!"
else
    echo "Aviso: No se encontró el contenedor de la API en ejecución para correr Alembic."
fi

echo "¡Proceso finalizado con éxito!"
