# API Clínica

API REST en **FastAPI** para gestionar usuarios, pacientes, médicos, agendas, cupos, citas y lista de espera.

## Autenticación

Roles por defecto: `1 = admin`, `2 = paciente`, `3 = medico`. `is_active` se almacena, pero **no se valida en el login**.

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| `POST` | `/auth/login` | Valida credenciales | `202` | `400` |
| `POST` | `/auth/register` | Registra usuario y perfil según el rol | `201` | `400` |

## Convenciones y errores

- Fechas: `YYYY-MM-DD`; horas: `HH:MM:SS`; fecha-hora: ISO 8601.
- Errores de negocio: `{"detail": "mensaje"}`.
- Validación Pydantic: `422` con el formato estándar de FastAPI.
- Error no controlado: `500` con `{"detail": "Error interno del servidor"}`.

| Código | Significado |
|---|---|
| `200` | Operación exitosa |
| `201` | Recurso creado |
| `202` | Solicitud aceptada (login) |
| `400` | Regla de negocio incumplida o solicitud inválida |
| `404` | Recurso no encontrado |
| `409` | Conflicto (cupo tomado, solicitud duplicada) |
| `422` | Error de validación |
| `500` | Error interno |

## Endpoints

### Usuarios y roles

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| `GET` | `/usuarios` | Lista usuarios con su rol | `200` | `400` |
| `GET` | `/usuarios/{id_usuario}` | Obtiene usuario por ID | `200` | `400` |
| `POST` | `/usuarios` | Crea usuario | `201` | `400` |
| `PATCH` | `/usuarios/{usuario_id}` | Actualiza parcialmente | `200` | `400`, `404` |
| `DELETE` | `/usuarios/{usuario_id}` | Elimina usuario | `200` | `400`, `404` |
| `GET` | `/roles` | Lista roles | `200` | `400` |
| `POST` | `/roles` | Crea rol | `201` | `400` |

### Pacientes

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| `GET` | `/pacientes` | Lista pacientes con datos de contacto | `200` | `400` |
| `GET` | `/pacientes/{id_paciente}` | Obtiene paciente por ID | `200` | `400` |
| `POST` | `/pacientes` | Crea perfil de paciente | `201` | `400` |
| `PATCH` | `/pacientes/{paciente_id}` | Actualiza parcialmente | `200` | `400`, `404` |
| `DELETE` | `/pacientes/{paciente_id}` | Elimina paciente | `200` | `400`, `404` |

### Médicos

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| `GET` | `/medicos` | Lista médicos | `200` | `400` |
| `GET` | `/medicos/{id_medico}` | Obtiene médico por ID | `200` | `400` |
| `POST` | `/medicos` | Crea perfil médico | `201` | `400` |
| `PATCH` | `/medicos/{medico_id}` | Actualiza parcialmente | `200` | `400`, `404` |
| `DELETE` | `/medicos/{medico_id}` | Elimina médico | `200` | `400`, `404` |

### Agenda

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| `GET` | `/agenda/{id_medico}` | Lista agendas del médico | `200` | `404` |
| `POST` | `/agenda` | Crea agenda y genera cupos | `201` | `400`, `404` |
| `PATCH` | `/agenda/{id_agenda}` | Actualiza agenda | `200` | `400`, `404` |
| `DELETE` | `/agenda/{id_agenda}` | Elimina o desactiva agenda | `200` | `404` |
| `POST` | `/agenda/{id_agenda}/generar-cupos` | Genera cupos faltantes | `200` | `404` |

### Cupos

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| `GET` | `/cupos/disponibles` | Lista cupos disponibles con filtros | `200` | `400` |
| `GET` | `/cupos/{id_cupo}` | Detalle de un cupo | `200` | `404` |
| `PATCH` | `/cupos/{id_cupo}` | Cambia estado del cupo | `200` | `400`, `404` |

`GET /cupos/disponibles` acepta `especialidad`, `id_medico`, `fecha_inicio` y `fecha_fin`. Sin fechas usa hoy hasta +30 días y limita a 200 resultados. Antes de consultar expira ofertas vencidas.

### Citas

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| `POST` | `/citas` | Reserva un cupo | `201` | `400`, `404`, `409` |
| `GET` | `/citas` | Lista citas con filtros | `200` | — |
| `GET` | `/citas/{id_cita}` | Detalle de una cita | `200` | `404` |
| `PATCH` | `/citas/{id_cita}/cancelar` | Cancela y libera el cupo | `200` | `400`, `404` |
| `PATCH` | `/citas/{id_cita}/asistencia` | Registra confirmación/atención/inasistencia | `200` | `400`, `404` |
| `GET` | `/medicos/{id_medico}/jornada` | Citas del médico en una fecha | `200` | — |

Filtros de `GET /citas`: `id_paciente`, `id_medico`, `estado`, `fecha`, `fecha_inicio`, `fecha_fin`. La jornada requiere `fecha`.

### Lista de espera

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| `POST` | `/lista-espera` | Crea solicitud y ofrece cupo si hay disponibilidad | `201` | `404`, `409` |
| `GET` | `/lista-espera` | Lista solicitudes con paciente, médico y oferta | `200` | — |
| `POST` | `/lista-espera/procesar-expiradas` | Expira ofertas vencidas y genera nuevas | `200` | — |
| `GET` | `/lista-espera/{id_entrada}` | Detalle de una solicitud | `200` | `404` |
| `DELETE` | `/lista-espera/{id_entrada}` | Cancela solicitud pendiente u ofrecida | `200` | `400`, `404` |
| `POST` | `/lista-espera/{id_entrada}/aceptar` | Acepta oferta y crea cita | `200` | `400`, `404` |
| `POST` | `/lista-espera/{id_entrada}/rechazar` | Rechaza oferta y reasigna cupo | `200` | `400`, `404` |

Filtros: `id_medico`, `estado`. El filtro por médico incluye solicitudes comodín (`id_medico = null`). Antes de responder, el listado expira ofertas vencidas y genera ofertas para cupos disponibles.

## Flujos clave

### Registro de paciente

```http
POST /auth/register
Content-Type: application/json

{
  "id_rol": 2,
  "tipo_documento": "CC",
  "numero_documento": "1023456789",
  "email": "ana.gomez@example.com",
  "password": "ClaveSegura123",
  "nombres": "Ana María",
  "apellidos": "Gómez Ruiz",
  "fecha_nacimiento": "1994-08-17",
  "telefono": "+57 300 123 4567",
  "direccion": "Calle 45 # 12-34, Bogotá"
}
```

```json
201 Created
{ "message": "Paciente:  Ana María Gómez Ruiz registrado con exito." }
```

Para médico usar `id_rol: 3` y enviar `tarjeta_profesional`, `especialidad` y `consultorio`.

### Login

```http
POST /auth/login
Content-Type: application/json

{ "numero_documento": "1023456789", "password": "ClaveSegura123" }
```

```json
202 Accepted
true
```

### Consultar cupos y reservar

```http
GET /cupos/disponibles?especialidad=Cardiología&fecha_inicio=2026-03-02&fecha_fin=2026-03-06
```

```json
200 OK
[
  {
    "id_cupo": 301,
    "fecha_cupo": "2026-03-02",
    "hora_cupo": "08:30:00",
    "duracion_cita": 30,
    "id_medico": 9,
    "medico": "Rodríguez Peña Carlos Andrés",
    "especialidad": "Cardiología",
    "consultorio": "Consultorio 302"
  }
]
```

```http
POST /citas
Content-Type: application/json

{
  "id_cupo": 301,
  "id_paciente": 12,
  "motivo_consulta": "Dolor en el pecho al hacer ejercicio"
}
```

```json
201 Created
{
  "id": 88,
  "id_cupo": 301,
  "id_paciente": 12,
  "motivo_consulta": "Dolor en el pecho al hacer ejercicio",
  "estado": "pendiente",
  "created_at": "2026-02-25T14:30:00",
  "updated_at": "2026-02-25T14:30:00"
}
```

### Lista de espera

```http
POST /lista-espera
Content-Type: application/json

{ "id_paciente": 12, "id_medico": 9, "prioridad": 0 }
```

Si hay cupo compatible queda `ofrecida`; si no, queda `pendiente`.

```json
201 Created
{
  "id": 55,
  "id_paciente": 12,
  "id_medico": 9,
  "prioridad": 0,
  "id_cupo_ofrecido": 301,
  "fecha_solicitud": "2026-02-25T15:00:00",
  "fecha_oferta": "2026-02-25T15:00:01",
  "fecha_expiracion": "2026-02-27T15:00:01",
  "estado": "ofrecida",
  "created_at": "2026-02-25T15:00:00"
}
```

```http
POST /lista-espera/55/aceptar
```

Aceptar crea una cita `pendiente`. Rechazar, cancelar o dejar expirar libera el cupo y lo reasigna al siguiente paciente compatible.

### Cancelar cita

```http
PATCH /citas/88/cancelar
```

```json
200 OK
{
  "cita": { "id": 88, "estado": "cancelada" },
  "oferta": {
    "id_lista_espera": 55,
    "id_paciente": 12,
    "paciente": "Ana María Gómez Ruiz",
    "id_cupo": 301,
    "id_medico": 9,
    "medico": "Rodríguez Peña Carlos Andrés",
    "fecha_cupo": "2026-03-02",
    "hora_cupo": "08:30:00",
    "fecha_expiracion": "2026-02-28T09:00:00"
  }
}
```

Si no hay solicitudes compatibles, `oferta` es `null`.

## Modelos y estados

| Modelo | Campos relevantes |
|---|---|
| `Usuario` | `id`, `rol`, `tipo_documento`, `numero_documento`, `email`, `is_active`, `created_at` |
| `Paciente` | `id`, `id_usuario`, `nombres`, `apellidos`, `fecha_nacimiento`, `telefono`, `numero_documento`, `email`, `direccion` |
| `Medico` | `id`, `id_usuario`, `nombres`, `apellidos`, `telefono`, `numero_documento`, `email`, `tarjeta_profesional`, `especialidad`, `consultorio` |
| `Agenda` | `id`, `id_medico`/`medico`, `fecha_inicio`, `fecha_fin`, `duracion_cita`, `hora_inicio`, `hora_fin`, `estado` |
| `Cupo` | `id_cupo`, `fecha_cupo`, `hora_cupo`, `estado`/`estado_cupo`, `duracion_cita`, `id_medico`, `medico`, `especialidad`, `consultorio`, `estado_agenda` |
| `Cita` | `id`, `id_cupo`, `id_paciente`, `motivo_consulta`, `estado`, `created_at`, `updated_at`; el detalle agrega paciente, médico, fecha y hora |
| `ListaEspera` | `id`, `id_paciente`, `id_medico`, `prioridad`, `id_cupo_ofrecido`, `fecha_solicitud`, `fecha_oferta`, `fecha_expiracion`, `estado`; el detalle agrega paciente, médico preferido y médico ofrecido |

| Recurso | Estados |
|---|---|
| Agenda | `activo`, `inactivo` |
| Cupo | `disponible`, `reservado`, `ocupado`, `cancelado` |
| Cita | `pendiente`, `confirmada`, `atendida`, `cancelada`, `no_asistio` |
| Lista de espera | `pendiente`, `ofrecida`, `aceptada`, `rechazada`, `expirada`, `cancelada` |

Citas activas: `pendiente`, `confirmada`. Solicitudes activas: `pendiente`, `ofrecida`.

## Reglas de negocio

- La agenda exige `fecha_fin >= fecha_inicio`, `hora_fin > hora_inicio` y una franja suficiente para la duración de la cita.
- Al crear una agenda se generan cupos futuros; no se duplican por agenda/fecha/hora.
- Al cambiar fechas u horarios se eliminan cupos disponibles futuros y se regeneran.
- Solo se ofertan cupos de agendas activas y con fecha/hora futura.
- `PATCH /cupos/{id}` solo permite `disponible` o `cancelado`; `reservado`/`ocupado` son automáticos.
- No se puede cancelar un cupo con una cita activa.
- Una cita requiere cupo disponible, agenda activa, fecha futura y paciente existente.
- Un paciente no puede tener dos citas activas para la misma fecha.
- Si dos usuarios toman el mismo cupo, uno recibe `409`.
- Solo se confirman citas `pendiente`; `atendida`/`no_asistio` aplican a citas activas.
- Solo se cancelan citas `pendiente` o `confirmada`.
- Cancelar o marcar `no_asistio` libera el cupo y lo ofrece al primero compatible.
- La lista de espera es **FIFO** por `fecha_solicitud` e `id`; `prioridad` es informativa.
- Un paciente no puede tener dos solicitudes activas para el mismo médico; sí para médicos distintos.
- `id_medico = null` acepta cualquier especialidad; con médico, solo su especialidad.
- La oferta vence a las 48 horas o antes de la cita, lo que ocurra primero.
- Las citas pasadas no generan oferta.


