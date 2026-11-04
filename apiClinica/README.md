# Guía de Despliegue: FastAPI, PostgreSQL y Docker Swarm

Esta documentación detalla el proceso paso a paso para inicializar el entorno de contenedores, gestionar secretos de seguridad, desplegar el stack de servicios en Docker Swarm, configurar la base de datos y ejecutar las migraciones de Alembic.

## 1. Inicialización de Docker Swarm

Antes de desplegar cualquier stack de servicios, es necesario inicializar el nodo actual como un clúster de Docker Swarm.

docker swarm init


Propósito: Activa el modo Swarm en el motor de Docker local, habilitando características avanzadas como servicios, redes superpuestas y secretos cifrados (docker secret).

## 2. Gestión de Secretos en Docker Swarm

Los secretos permiten inyectar credenciales y configuraciones sensibles de forma segura en los contenedores sin exponer texto plano en archivos de configuración o imágenes.

Ejecuta los siguientes comandos para registrar los secretos en el Swarm:

echo "appcitas" | docker secret create postgres_db -
echo "tu_contraseña_segura" | docker secret create postgres_password -
echo "admin" | docker secret create postgres_user -
echo "apiclinica_stack_data" | docker secret create postgres_host -


Limpieza de secretos (en caso de requerir reinicio o actualización):

docker secret rm postgres_user postgres_password postgres_host postgres_db


## 3. Construcción de la Imagen y Despliegue del Stack

Construcción de la imagen Docker de la API

docker build -t api-clinica:v1 .


Propósito: Empaqueta la aplicación FastAPI, sus dependencias y estructura interna en una imagen Docker local etiquetada como api-clinica:v1.

Despliegue del Stack

docker stack deploy -c stack.yaml apiclinica_stack


Propósito: Lee el archivo de orquestación stack.yaml y levanta todos los servicios definidos (PostgreSQL, PgBouncer y el backend de FastAPI) interconectados bajo la red del stack.

## 4. Automatización con el Script de Inicio (lunch.sh)

Para agilizar el flujo de desarrollo y pruebas, puedes empaquetar la limpieza de volúmenes obsoletos, la recreación de secretos y el despliegue en un script automatizado:

./lunch.sh


## 5. Monitoreo y Depuración

Visualización de logs del servicio API

docker service logs apiclinica_stack_api --tail 50


Propósito: Muestra las últimas 50 líneas de registro del servicio FastAPI en ejecución dentro del Swarm para diagnosticar errores de arranque o fallos de conexión.

## 6. Gestión de Base de Datos y Migraciones con Alembic

Una vez que los servicios están activos, se deben aplicar las migraciones de base de datos para generar las tablas correspondientes (usuarios, roles, etc.).

Ejecución de migraciones

# Obtener dinámicamente el nombre/ID del contenedor de la API
contenedor_api=$(docker ps -q --filter "name=apiclinica_stack_api")

# Ejecutar las migraciones de Alembic apuntando al archivo de configuración
docker exec -it $contenedor_api alembic -c alembicApi/alembic.ini upgrade head


Propósito: Conecta la API a la base de datos a través de los secretos y aplica los esquemas definidos en los modelos de SQLAlchemy.

## 7. Acceso Interactivo a la Base de Datos PostgreSQL

Para verificar el estado de las tablas directamente desde la terminal del contenedor de datos:

# Obtener el ID del contenedor de PostgreSQL
contenedor_data=$(docker ps -q --filter "name=apiclinica_stack_data")

# Conectarse a la base de datos 'appcitas' con el usuario 'admin'
docker exec -it $contenedor_data psql -U admin -d appcitas


Comandos útiles dentro de la consola psql:

\dt : Lista todas las tablas creadas en la base de datos actual.

\q : Sale de la consola interactiva de PostgreSQL.