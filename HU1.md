## HU-01: Autenticación Segura y Control de Acceso por Roles (RBAC)

* **Como** usuario del sistema (Paciente, Médico o Administrador),
* **Quiero** autenticarme con mis credenciales protegidas,
* **Para** acceder exclusivamente a las funciones y datos autorizados para mi perfil operativo.

### Criterios de Aceptación:
* Las contraseñas deben ser almacenadas de forma cifrada en la base de datos PostgreSQL (hashing seguro).
* El sistema redirige automáticamente tras el login al rol correspondiente: Portal Paciente, Panel Médico o Dashboard Administrativo.
