#!/usr/bin/env bash

set -e

set -a
source .env
set +a

echo "Construyendo la imagen de la API..."
docker build --no-cache -t api-clinica:v1 . >>/dev/null 2>&1
docker build --no-cache -t frontendcitas:v1 TestPhp/. >>/dev/null 2>&1
sleep 2
echo "Desplegando la API en Docker Swarm..."
sleep 2
docker secret inspect postgres_user >>/dev/null 2>&1 || echo "$postgres_user" | docker secret create postgres_user -
docker secret inspect postgres_password >>/dev/null 2>&1 || echo "$postgres_password" | docker secret create postgres_password -
docker secret inspect postgres_host >>/dev/null 2>&1 || echo "$postgres_host" | docker secret create postgres_host -
docker secret inspect postgres_db >>/dev/null 2>&1 || echo "$postgres_db" | docker secret create postgres_db -

docker stack deploy -c stack.yaml api-clinica

echo "Actualizando servicios con las nuevas imágenes..."
docker service update --force --image api-clinica:v1 api-clinica_api
docker service update --force --image frontendcitas:v1 api-clinica_frontend

contenedor_frontend=$(docker ps -q -f name=api-clinica_frontend | head -n1)
if [ -n "$contenedor_frontend" ]; then
    docker cp TestPhp/. "$contenedor_frontend":/var/www/html/
fi

contenedor=$(docker ps -q -f name=api-clinica_data | head -n1)
if [ -n "$contenedor" ]; then
    docker exec "$contenedor" psql -U "$postgres_user" -d "$postgres_db" -c 'SELECT 1;' >>/dev/null 2>&1 \
        || docker exec "$contenedor" psql -U "$postgres_user" -c "CREATE DATABASE $postgres_db;"
fi

