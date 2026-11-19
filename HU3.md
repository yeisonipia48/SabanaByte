## HU-03: Reasignación Automática por Cola de Espera (Algoritmo FIFO y Regla 48h)

* **Como** sistema de gestión de citas,
* **Quiero** reasignar automáticamente los cupos liberados a la cola de espera,
* **Para** maximizar la ocupación de la capacidad médica instalada y reducir el ausentismo.

### Criterios de Aceptación:
* **Orden FIFO:** El cupo se ofrece estrictamente al primer paciente registrado en la lista de espera que requiera la misma especialidad.
* **Regla de > 48 horas:** Si la cita se libera con más de 48 horas de anticipación, el sistema asigna la reserva en estado "Pendiente de Confirmación" y otorga un plazo máximo de 48 horas al usuario para confirmar.
* **Cupos de última hora (< 48 horas o citas vencidas):** Si la liberación ocurre dentro de las 48 horas previas a la cita, el plazo de 48h se invalida automáticamente para permitir la reasignación inmediata o la gestión de urgencia.
