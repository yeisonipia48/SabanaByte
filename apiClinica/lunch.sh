#!/usr/bin/env bash

set -e

set -a
source .env
set +a

echo "Construyendo la imagen de la API..."
docker build --no-cache -t api-clinica:v1 . >>/dev/null 2>&1
sleep 2
echo "Desplegando la API en Docker Swarm..."
sleep 2
docker secret inspect postgres_user >>/dev/null 2>&1 || echo "$postgres_user" | docker secret create postgres_user -
docker secret inspect postgres_password >>/dev/null 2>&1 || echo "$postgres_password" | docker secret create postgres_password -
docker secret inspect postgres_host >>/dev/null 2>&1 || echo "$postgres_host" | docker secret create postgres_host -
docker secret inspect postgres_db >>/dev/null 2>&1 || echo "$postgres_db" | docker secret create postgres_db -

docker stack deploy -c stack.yaml api-clinica

sleep 2

contenedor=$(docker ps | grep postgres | awk '{print$1}')

docker docker exec -it $contenedor psql -U $postgres_user -c "\c $postgres_db" >>/dev/null 2>&1 || docker exec -it $contenedor psql -U $postgres_user -c "CREATE DATABASE $postgres_db;"

