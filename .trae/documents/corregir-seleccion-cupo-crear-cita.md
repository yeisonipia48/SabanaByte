# Plan: Corregir error "Debes seleccionar un cupo disponible..." al crear cita

## Summary

Al seleccionar un cupo en el módulo **Crear cita** y guardar, aparece el error
`Debes seleccionar un cupo disponible para agendar la cita.` aunque el cupo sí fue
seleccionado. La causa es un **desajuste de nombres de campo**: los formularios usan
`form.cupoId`, pero `adminService.addCita` lee `data.idCupo`, por lo que siempre
recibe `undefined` y lanza el error antes de llamar al backend.

La corrección consiste en mapear `cupoId → idCupo` en los 3 puntos de llamada
(admin, médico, paciente). Con esto el `POST /citas` viajará con el `id_cupo` real.

## Current State Analysis

### Flujo actual
1. El modal de crear cita carga cupos reales: `adminService.getCuposDisponibles(...)`
   → `GET /cupos/disponibles` ([adminService.ts](file:///c:/Users/Laura/Documents/proyectos_lau/SabanaByte/client/src/features/administrador/services/adminService.ts#L205-L207)).
2. El usuario selecciona un cupo; el `<select>` guarda el valor en `form.cupoId`.
3. Al guardar: `adminService.addCita({ ...form, date, time })`.
4. `addCita` valida `if (!data.idCupo)` → como `form` solo tiene `cupoId`, `idCupo`
   es `undefined` → lanza `Error('Debes seleccionar un cupo disponible para agendar la cita.')`
   ([adminService.ts](file:///c:/Users/Laura/Documents/proyectos_lau/SabanaByte/client/src/features/administrador/services/adminService.ts#L209-L218)).

### Evidencia
- `FormState` define el campo como `cupoId` (no `idCupo`) en los 3 módulos.
- La llamada pasa `{ ...form, ... }` sin renombrar:
  - [CitasModule.tsx#L184-L188](file:///c:/Users/Laura/Documents/proyectos_lau/SabanaByte/client/src/features/administrador/modules/CitasModule.tsx#L184-L188)
  - [MedicoCitasModule.tsx#L155](file:///c:/Users/Laura/Documents/proyectos_lau/SabanaByte/client/src/features/medico/modules/MedicoCitasModule.tsx#L155)
  - [PacienteCitasModule.tsx#L155](file:///c:/Users/Laura/Documents/proyectos_lau/SabanaByte/client/src/features/paciente/modules/PacienteCitasModule.tsx#L155)
- `addCita(data: Omit<Cita, 'id'>)` espera `idCupo?: string`
  ([admin.ts#L71](file:///c:/Users/Laura/Documents/proyectos_lau/SabanaByte/client/src/features/administrador/types/admin.ts#L71)).
- TypeScript NO detecta el fallo porque las propiedades añadidas por *spread* no están
  sujetas a *excess property checks* (por eso `tsc` pasa pero falla en runtime).

> Nota: la validación del formulario `if (!form.cupoId)` sí pasa (el cupo está elegido),
> por eso el usuario ve el mensaje del **servicio** (`Debes seleccionar...`) y no el del
> **formulario** (`Por favor selecciona...`).

## Proposed Changes

Corrección mínima en los 3 puntos de llamada: mapear el campo del formulario
(`cupoId`) al campo del dominio (`idCupo`) que espera `addCita`.

### 1. `client/src/features/administrador/modules/CitasModule.tsx`
En `handleSubmit` (rama `mode === 'create'`), dentro del objeto pasado a `addCita`:

**Antes**
```ts
await adminService.addCita({
  ...form,
  date: cupo?.fecha_cupo ?? form.date,
  time: cupo?.hora_cupo ?? form.time,
})
```
**Después**
```ts
await adminService.addCita({
  ...form,
  idCupo: form.cupoId,
  date: cupo?.fecha_cupo ?? form.date,
  time: cupo?.hora_cupo ?? form.time,
})
```

### 2. `client/src/features/medico/modules/MedicoCitasModule.tsx`
Mismo cambio en su `handleSubmit` (rama `create`).

### 3. `client/src/features/paciente/modules/PacienteCitasModule.tsx`
Mismo cambio en su `handleSubmit` (rama `create`).

### Por qué esta solución (y no renombrar `FormState.cupoId`)
- `cupoId` es el nombre del campo de formulario (usado en `id`, `value` y `onChange`
  del `<select>`); `idCupo` es el nombre del campo de dominio en el tipo `Cita`.
- Mapear explícitamente en la frontera formulario→dominio es un cambio de 1 línea por
  archivo, con riesgo mínimo. Renombrar el campo en `FormState` implicaría ~7 ediciones
  por módulo (interfaz, `emptyForm`, `openEdit`, `openView`, `handleSubmit`, JSX del
  `<select>`) sin aportar valor funcional adicional.
- No se modifica el contrato del servicio ni el backend.

## Assumptions & Decisions

- El backend ya expone `GET /cupos/disponibles` y `POST /citas` (validado en `repository.py`);
  no se tocan archivos de `apiClinica/`.
- Los 3 módulos (admin/médico/paciente) comparten el mismo bug; se corrigen los tres.
- No se cambia el nombre del campo del formulario ni el tipo `FormState`.
- `Number(form.cupoId)` ya se realiza dentro de `addCita`; el cupo llega como string válido
  desde el `<select>` y por eso la conversión es segura.

## Verification

1. `cd client; npx tsc -b --pretty false` → 0 errores (debe seguir limpio).
2. `cd client; npx eslint src` → sin errores nuevos.
3. Prueba manual (con backend en ejecución):
   - Abrir **Crear cita** en el módulo de administrador.
   - Seleccionar paciente, médico, fecha y **un cupo** de la lista.
   - Guardar → la cita debe crearse y persistir en PostgreSQL (aparece en la lista tras
     `loadData()`), sin mostrar el error de cupo.
   - Repetir en los módulos de médico y paciente.
4. Verificar en la BD que existe el registro en `Citas` con el `id_cupo` seleccionado y
   que el cupo pasa a estado `reservado`/no disponible.
