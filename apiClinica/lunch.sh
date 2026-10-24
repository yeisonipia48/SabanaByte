#!/usr/bin/env bash

set -e

# Cargar variables del archivo .env si existe
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "Construyendo la imagen de la API..."
docker build --no-cache -t api-clinica:v1 .

echo "Desplegando la API en Docker Swarm..."
sleep 2

# Gestionar secretos de Docker Swarm de forma segura
docker secret inspect postgres_user >/dev/null 2>&1 || echo "$postgres_user" | docker secret create postgres_user -
docker secret inspect postgres_password >/dev/null 2>&1 || echo "$postgres_password" | docker secret create postgres_password -
docker secret inspect postgres_host >/dev/null 2>&1 || echo "$postgres_host" | docker secret create postgres_host -
docker secret inspect postgres_db >/dev/null 2>&1 || echo "$postgres_db" | docker secret create postgres_db -

# Desplegar usando el nombre correcto del stack (apiclinica_stack)
docker stack deploy -c stack.yaml apiclinica_stack

echo "Esperando a que el contenedor de la base de datos esté listo..."
sleep 5

# Buscar el contenedor de postgres
contenedor=$(docker ps -q --filter "name=apiclinica_stack_data")

if [ -n "$contenedor" ]; then
  echo "Verificando o creando la base de datos..."
  docker exec -i $contenedor psql -U "$postgres_user" -c "\c $postgres_db" >/dev/null 2>&1 || \
  docker exec -i $contenedor psql -U "$postgres_user" -c "CREATE DATABASE $postgres_db;"
  echo "¡Proceso finalizado con éxito!"
else
  echo "Aviso: No se encontró el contenedor de postgres en ejecución."
fi