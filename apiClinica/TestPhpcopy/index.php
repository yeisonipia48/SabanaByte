<?php

declare(strict_types=1);

date_default_timezone_set('America/Bogota');

error_reporting(E_ALL);
ini_set('display_errors', '1');

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

require __DIR__ . '/ApiClient.php';
require __DIR__ . '/helpers.php';

$config = require __DIR__ . '/config.php';
$api = new ApiClient((string) $config['api_base'], (int) $config['timeout']);

$auth = $_SESSION['auth'] ?? null;
$currentUser = null;
$roleKind = 'invitado';
$profile = null;

if (is_array($auth)) {
    $currentUser = refresh_user($api, $auth);

    if ($currentUser !== []) {
        $auth['user'] = $currentUser;
        $auth['numero_documento'] = (string) ($currentUser['numero_documento'] ?? $auth['numero_documento'] ?? '');
        $_SESSION['auth'] = $auth;
        $roleKind = normalize_role((string) ($currentUser['rol'] ?? ''));
        $profile = load_profile($api, $currentUser, $roleKind);
    } else {
        unset($_SESSION['auth']);
        $auth = null;
    }
}

$loginErrors = [];
$registerErrors = [];
$loginData = [];
$registerData = [];
$documentTypes = [
    'CC' => 'Cédula de ciudadanía',
    'TI' => 'Tarjeta de identidad',
    'CE' => 'Cédula de extranjería',
    'PA' => 'Pasaporte',
    'RC' => 'Registro civil',
];
$roles = [];
$rolesWarning = null;
$patientRole = null;
$doctorRole = null;
$rolesResponse = ['ok' => false, 'status' => 0, 'data' => null, 'error' => null];

if ($currentUser === null || $roleKind === 'admin') {
    $rolesResponse = $api->request('GET', '/roles');

    if ($rolesResponse['ok'] && is_array($rolesResponse['data'])) {
        foreach ($rolesResponse['data'] as $role) {
            if (isset($role['id'], $role['rol'])) {
                $roles[] = [
                    'id' => (int) $role['id'],
                    'rol' => (string) $role['rol'],
                    'kind' => normalize_role((string) $role['rol']),
                ];
            }
        }
    } else {
        $rolesWarning = 'No pudimos cargar la información para crear cuentas. Intenta de nuevo en unos minutos.';
    }
}

foreach ($roles as $role) {
    $roleName = strtolower(trim($role['rol']));

    if ($patientRole === null && $roleName === 'paciente') {
        $patientRole = $role;
    }

    if ($doctorRole === null && $roleName === 'medico') {
        $doctorRole = $role;
    }
}

$action = is_string($_POST['action'] ?? null) ? (string) $_POST['action'] : null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();

    if ($action === 'logout') {
        unset($_SESSION['auth']);
        flash('success', 'Sesión cerrada.');
        redirect('index.php?tab=login');
    }

    if ($action === 'login' && $currentUser === null) {
        $loginData = $_POST;
        $document = trim((string) ($_POST['numero_documento'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');

        if ($document === '' || $password === '') {
            $loginErrors[] = 'El documento y la contraseña son obligatorios.';
        } else {
            [$ok, $error, $authData] = attempt_login($api, $document, $password);
            if (!$ok) {
                $loginErrors[] = (string) $error;
            } elseif (!is_array($authData['user'] ?? null)) {
                $loginErrors[] = 'No se pudo cargar el usuario autenticado. Intenta de nuevo.';
            } else {
                $_SESSION['auth'] = $authData;
                flash('success', 'Sesión iniciada correctamente.');
                redirect('index.php');
            }
        }
    }

    if ($action === 'register' && $currentUser === null) {
        $registerData = $_POST;

        if ($patientRole === null) {
            $registerErrors[] = 'El registro en línea no está disponible en este momento. Comunícate con la clínica.';
        }

        foreach (['tipo_documento', 'numero_documento', 'email', 'password'] as $field) {
            if (trim((string) ($_POST[$field] ?? '')) === '') {
                $registerErrors[] = 'Completa tus datos de acceso.';
                break;
            }
        }

        foreach (['nombres', 'apellidos', 'fecha_nacimiento', 'telefono'] as $field) {
            if (trim((string) ($_POST[$field] ?? '')) === '') {
                $registerErrors[] = 'Completa tus datos personales.';
                break;
            }
        }

        $email = trim((string) ($_POST['email'] ?? ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $registerErrors[] = 'El correo electrónico no es válido.';
        }

        $password = (string) ($_POST['password'] ?? '');
        if ($password !== '' && strlen($password) < 6) {
            $registerErrors[] = 'La contraseña debe tener al menos 6 caracteres.';
        }

        if ($registerErrors === [] && $patientRole !== null) {
            $payload = [
                'id_rol' => (int) $patientRole['id'],
                'tipo_documento' => trim((string) ($_POST['tipo_documento'] ?? '')),
                'numero_documento' => trim((string) ($_POST['numero_documento'] ?? '')),
                'email' => $email,
                'password' => $password,
                'nombres' => trim((string) ($_POST['nombres'] ?? '')),
                'apellidos' => trim((string) ($_POST['apellidos'] ?? '')),
                'fecha_nacimiento' => trim((string) ($_POST['fecha_nacimiento'] ?? '')),
                'telefono' => trim((string) ($_POST['telefono'] ?? '')),
            ];

            $address = trim((string) ($_POST['direccion'] ?? ''));
            if ($address !== '') {
                $payload['direccion'] = $address;
            }

            $response = $api->request('POST', '/auth/register', $payload);
            if (!$response['ok']) {
                $registerErrors[] = friendly_error($response, 'No pudimos crear tu cuenta. Revisa los datos e intenta de nuevo.');
            } else {
                [$ok, $error, $authData] = attempt_login(
                    $api,
                    (string) $payload['numero_documento'],
                    (string) $payload['password']
                );

                if ($ok && is_array($authData['user'] ?? null)) {
                    $_SESSION['auth'] = $authData;
                    flash('success', 'Tu cuenta está lista. Elige el horario de tu primera cita.');
                    redirect('index.php?view=agendar');
                }

                flash('success', 'Tu cuenta fue creada. Ahora inicia sesión para agendar tu cita.');
                redirect('index.php?tab=login');
            }
        }
    }

    if ($currentUser !== null) {
        if ($action === 'book') {
            if ($roleKind !== 'paciente' || $profile === null) {
                flash('error', 'Solo un paciente con perfil puede reservar citas.');
                redirect('index.php');
            }

            $idCupo = (int) ($_POST['id_cupo'] ?? 0);
            $motivo = trim((string) ($_POST['motivo_consulta'] ?? ''));

            if ($idCupo <= 0) {
                flash('error', 'Selecciona un horario disponible.');
            } else {
                $payload = [
                    'id_cupo' => $idCupo,
                    'id_paciente' => (int) $profile['id'],
                ];
                if ($motivo !== '') {
                    $payload['motivo_consulta'] = $motivo;
                }

                $response = $api->request('POST', '/citas', $payload);
                flash(
                    $response['ok'] ? 'success' : 'error',
                    $response['ok']
                        ? 'Tu cita quedó reservada. Te esperamos.'
                        : friendly_error($response, 'No pudimos reservar la cita. Intenta de nuevo.')
                );
            }

            redirect('index.php?view=citas');
        }

        if ($action === 'cancel_cita') {
            $idCita = (int) ($_POST['id_cita'] ?? 0);
            $back = (string) ($_POST['back'] ?? 'citas');
            $allowed = false;

            if ($idCita > 0) {
                $cita = fetch_cita($api, $idCita);
                if ($cita !== null) {
                    if ($roleKind === 'admin') {
                        $allowed = true;
                    } elseif ($roleKind === 'paciente' && $profile !== null) {
                        $allowed = (int) ($cita['id_paciente'] ?? 0) === (int) $profile['id'];
                    } elseif ($roleKind === 'medico' && $profile !== null) {
                        $allowed = (int) ($cita['id_medico'] ?? 0) === (int) $profile['id'];
                    }
                }
            }

            if (!$allowed) {
                flash('error', 'No puedes cancelar esa cita.');
            } else {
                $response = $api->request('PATCH', '/citas/' . $idCita . '/cancelar');
                flash(
                    $response['ok'] ? 'success' : 'error',
                    $response['ok']
                        ? 'Tu cita fue cancelada.'
                        : friendly_error($response, 'No pudimos cancelar la cita. Intenta de nuevo.')
                );
            }

            redirect('index.php?view=' . rawurlencode(in_array($back, ['inicio', 'citas', 'jornada', 'agenda', 'espera'], true) ? $back : 'citas'));
        }

        if (in_array($action, ['admin_paciente_create', 'admin_medico_create'], true)) {
            if ($roleKind !== 'admin') {
                flash('error', 'No tienes permiso para registrar cuentas.');
                redirect('index.php');
            }

            $isDoctor = $action === 'admin_medico_create';
            $roleToUse = $isDoctor ? $doctorRole : $patientRole;
            $backView = $isDoctor ? 'medicos' : 'pacientes';
            $personLabel = $isDoctor ? 'médico' : 'paciente';

            $required = ['tipo_documento', 'numero_documento', 'email', 'password', 'nombres', 'apellidos', 'telefono'];
            if ($isDoctor) {
                $required = array_merge($required, ['tarjeta_profesional', 'especialidad', 'consultorio']);
            } else {
                $required[] = 'fecha_nacimiento';
            }

            $missingField = false;
            foreach ($required as $field) {
                if (trim((string) ($_POST[$field] ?? '')) === '') {
                    $missingField = true;
                    break;
                }
            }

            $email = trim((string) ($_POST['email'] ?? ''));
            $password = (string) ($_POST['password'] ?? '');

            if ($roleToUse === null) {
                flash('error', 'El rol de ' . $personLabel . ' no está disponible. Revisa la configuración de roles.');
            } elseif ($missingField) {
                flash('error', 'Completa todos los datos obligatorios del ' . $personLabel . '.');
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                flash('error', 'El correo electrónico no es válido.');
            } elseif (strlen($password) < 6) {
                flash('error', 'La contraseña debe tener al menos 6 caracteres.');
            } else {
                $payload = [
                    'id_rol' => (int) $roleToUse['id'],
                    'tipo_documento' => trim((string) ($_POST['tipo_documento'] ?? '')),
                    'numero_documento' => trim((string) ($_POST['numero_documento'] ?? '')),
                    'email' => $email,
                    'password' => $password,
                    'nombres' => trim((string) ($_POST['nombres'] ?? '')),
                    'apellidos' => trim((string) ($_POST['apellidos'] ?? '')),
                    'telefono' => trim((string) ($_POST['telefono'] ?? '')),
                ];

                if ($isDoctor) {
                    $payload['tarjeta_profesional'] = trim((string) ($_POST['tarjeta_profesional'] ?? ''));
                    $payload['especialidad'] = trim((string) ($_POST['especialidad'] ?? ''));
                    $payload['consultorio'] = trim((string) ($_POST['consultorio'] ?? ''));
                } else {
                    $payload['fecha_nacimiento'] = trim((string) ($_POST['fecha_nacimiento'] ?? ''));
                    $address = trim((string) ($_POST['direccion'] ?? ''));
                    if ($address !== '') {
                        $payload['direccion'] = $address;
                    }
                }

                $response = $api->request('POST', '/auth/register', $payload);
                flash(
                    $response['ok'] ? 'success' : 'error',
                    $response['ok']
                        ? ucfirst($personLabel) . ' registrado. Ya puede iniciar sesión con su documento y contraseña.'
                        : friendly_error($response, 'No pudimos registrar al ' . $personLabel . '. Revisa los datos e intenta de nuevo.')
                );
            }

            redirect('index.php?view=' . $backView);
        }

        if (in_array($action, ['admin_paciente_update', 'admin_medico_update'], true)) {
            if ($roleKind !== 'admin') {
                flash('error', 'No tienes permiso para actualizar estos datos.');
                redirect('index.php');
            }

            $isDoctor = $action === 'admin_medico_update';
            $idProfile = (int) ($_POST['id_perfil'] ?? 0);
            $backView = $isDoctor ? 'medicos' : 'pacientes';
            $payload = [];

            $fields = $isDoctor
                ? ['nombres', 'apellidos', 'telefono', 'tarjeta_profesional', 'especialidad', 'consultorio']
                : ['nombres', 'apellidos', 'fecha_nacimiento', 'telefono', 'direccion'];

            foreach ($fields as $field) {
                $value = trim((string) ($_POST[$field] ?? ''));
                if ($value !== '') {
                    $payload[$field] = $value;
                }
            }

            if ($idProfile <= 0) {
                flash('error', 'No encontramos el perfil que quieres actualizar.');
            } elseif ($payload === []) {
                flash('error', 'No hay cambios para guardar.');
            } else {
                $path = ($isDoctor ? '/medicos/' : '/pacientes/') . $idProfile;
                $response = $api->request('PATCH', $path, $payload);
                flash(
                    $response['ok'] ? 'success' : 'error',
                    $response['ok']
                        ? 'Datos actualizados correctamente.'
                        : friendly_error($response, 'No pudimos guardar los cambios. Intenta de nuevo.')
                );
            }

            redirect('index.php?view=' . $backView);
        }

        if ($action === 'admin_usuario_estado') {
            if ($roleKind !== 'admin') {
                flash('error', 'No tienes permiso para cambiar el acceso de una cuenta.');
                redirect('index.php');
            }

            $idUsuario = (int) ($_POST['id_usuario'] ?? 0);
            $active = (string) ($_POST['is_active'] ?? '1') === '1';
            $backView = (string) ($_POST['back'] ?? 'pacientes');
            $backView = in_array($backView, ['pacientes', 'medicos'], true) ? $backView : 'pacientes';

            if ($idUsuario <= 0) {
                flash('error', 'No encontramos la cuenta que quieres actualizar.');
            } else {
                $response = $api->request('PATCH', '/usuarios/' . $idUsuario, ['is_active' => $active]);
                flash(
                    $response['ok'] ? 'success' : 'error',
                    $response['ok']
                        ? ($active ? 'La cuenta puede volver a iniciar sesión.' : 'La cuenta quedó desactivada.')
                        : friendly_error($response, 'No pudimos cambiar el acceso de la cuenta.')
                );
            }

            redirect('index.php?view=' . $backView);
        }

        if ($action === 'admin_espera_procesar') {
            if ($roleKind !== 'admin') {
                flash('error', 'No tienes permiso para revisar la lista de espera.');
                redirect('index.php');
            }

            $response = $api->request('POST', '/lista-espera/procesar-expiradas');
            if ($response['ok'] && is_array($response['data'])) {
                $newOffers = (int) ($response['data']['nuevas_ofertas'] ?? 0);
                flash(
                    'success',
                    $newOffers > 0
                        ? 'Revisamos las ofertas vencidas y generamos ' . $newOffers . ' nueva(s) oferta(s).'
                        : 'Revisamos la lista de espera. No hay ofertas nuevas por ahora.'
                );
            } else {
                flash('error', friendly_error($response, 'No pudimos revisar la lista de espera.'));
            }

            redirect('index.php?view=espera');
        }

        if ($action === 'admin_espera_cancel') {
            if ($roleKind !== 'admin') {
                flash('error', 'No tienes permiso para modificar la lista de espera.');
                redirect('index.php');
            }

            $idEntrada = (int) ($_POST['id_entrada'] ?? 0);
            if ($idEntrada <= 0) {
                flash('error', 'No encontramos la solicitud que quieres cancelar.');
            } else {
                $response = $api->request('DELETE', '/lista-espera/' . $idEntrada);
                flash(
                    $response['ok'] ? 'success' : 'error',
                    $response['ok'] ? 'Solicitud cancelada.' : friendly_error($response, 'No pudimos cancelar la solicitud.')
                );
            }

            redirect('index.php?view=espera');
        }

        if ($action === 'asistencia') {
            $idCita = (int) ($_POST['id_cita'] ?? 0);
            $estado = (string) ($_POST['estado'] ?? '');
            $back = (string) ($_POST['back'] ?? 'citas');
            $allowed = $roleKind === 'admin';

            if (!$allowed && $roleKind === 'medico' && $profile !== null && $idCita > 0) {
                $cita = fetch_cita($api, $idCita);
                $allowed = $cita !== null && (int) ($cita['id_medico'] ?? 0) === (int) $profile['id'];
            }

            if (!in_array($estado, ['confirmada', 'atendida', 'no_asistio'], true)) {
                flash('error', 'Estado de asistencia no válido.');
            } elseif (!$allowed) {
                flash('error', 'No puedes actualizar esa cita.');
            } else {
                $response = $api->request('PATCH', '/citas/' . $idCita . '/asistencia', ['estado' => $estado]);
                flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Asistencia actualizada.' : friendly_error($response));
            }

            redirect('index.php?view=' . rawurlencode($back === 'jornada' ? 'jornada' : 'citas'));
        }

        if ($action === 'agenda_create') {
            $idMedico = $roleKind === 'medico' && $profile !== null
                ? (int) $profile['id']
                : (int) ($_POST['id_medico'] ?? 0);

            $payload = [
                'id_medico' => $idMedico,
                'fecha_inicio' => trim((string) ($_POST['fecha_inicio'] ?? '')),
                'fecha_fin' => trim((string) ($_POST['fecha_fin'] ?? '')),
                'duracion_cita' => (int) ($_POST['duracion_cita'] ?? 0),
                'hora_inicio' => trim((string) ($_POST['hora_inicio'] ?? '')),
                'hora_fin' => trim((string) ($_POST['hora_fin'] ?? '')),
            ];

            $missing = false;
            foreach (['fecha_inicio', 'fecha_fin', 'hora_inicio', 'hora_fin'] as $field) {
                if ($payload[$field] === '') {
                    $missing = true;
                    break;
                }
            }

            if (!in_array($roleKind, ['admin', 'medico'], true) || $idMedico <= 0) {
                flash('error', 'No tienes permiso para crear agendas.');
            } elseif ($missing || $payload['duracion_cita'] <= 0) {
                flash('error', 'Completa las fechas, horas y la duración de la cita.');
            } else {
                $response = $api->request('POST', '/agenda', $payload);
                flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Horario creado.' : friendly_error($response));
            }

            redirect($roleKind === 'admin' ? 'index.php?view=agenda&id_medico=' . $idMedico : 'index.php?view=agenda');
        }

        if (in_array($action, ['agenda_generar', 'agenda_estado', 'agenda_eliminar'], true)) {
            $idAgenda = (int) ($_POST['id_agenda'] ?? 0);
            $allowed = $roleKind === 'admin';

            if (!$allowed && $roleKind === 'medico' && $profile !== null && $idAgenda > 0) {
                $allowed = agenda_belongs_to_medico($api, $idAgenda, (int) $profile['id']);
            }

            if (!$allowed) {
                flash('error', 'No puedes modificar ese horario.');
            } elseif ($action === 'agenda_generar') {
                $response = $api->request('POST', '/agenda/' . $idAgenda . '/generar-cupos');
                flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Cupos generados.' : friendly_error($response));
            } elseif ($action === 'agenda_estado') {
                $estado = (string) ($_POST['estado'] ?? '');
                $response = $api->request('PATCH', '/agenda/' . $idAgenda, ['estado' => $estado]);
                flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Horario actualizado.' : friendly_error($response));
            } else {
                $response = $api->request('DELETE', '/agenda/' . $idAgenda);
                flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Horario eliminado.' : friendly_error($response));
            }

            redirect($roleKind === 'admin' ? 'index.php?view=agenda&id_medico=' . (int) ($_POST['id_medico'] ?? 0) : 'index.php?view=agenda');
        }

        if ($action === 'perfil_update') {
            if ($roleKind === 'paciente' && $profile !== null) {
                $payload = [];
                foreach (['nombres', 'apellidos', 'fecha_nacimiento', 'telefono', 'direccion'] as $field) {
                    $value = trim((string) ($_POST[$field] ?? ''));
                    if ($value !== '') {
                        $payload[$field] = $value;
                    }
                }

                if ($payload === []) {
                    flash('error', 'No hay cambios para guardar.');
                } else {
                    $response = $api->request('PATCH', '/pacientes/' . (int) $profile['id'], $payload);
                    flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Datos personales actualizados.' : friendly_error($response));
                }
            } elseif ($roleKind === 'medico' && $profile !== null) {
                $payload = [];
                foreach (['nombres', 'apellidos', 'telefono', 'tarjeta_profesional', 'especialidad', 'consultorio'] as $field) {
                    $value = trim((string) ($_POST[$field] ?? ''));
                    if ($value !== '') {
                        $payload[$field] = $value;
                    }
                }

                if ($payload === []) {
                    flash('error', 'No hay cambios para guardar.');
                } else {
                    $response = $api->request('PATCH', '/medicos/' . (int) $profile['id'], $payload);
                    flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Datos profesionales actualizados.' : friendly_error($response));
                }
            } else {
                flash('error', 'Tu rol no tiene un perfil editable.');
            }

            redirect('index.php?view=perfil');
        }

        if ($action === 'cuenta_update') {
            $payload = [];
            $email = trim((string) ($_POST['email'] ?? ''));

            if ($email !== '') {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    flash('error', 'El email no es válido.');
                    redirect('index.php?view=perfil');
                }
                $payload['email'] = $email;
            }

            $password = (string) ($_POST['password'] ?? '');
            if ($password !== '') {
                $payload['password'] = $password;
            }

            if ($payload === []) {
                flash('error', 'No hay cambios para guardar en la cuenta.');
            } else {
                $response = $api->request('PATCH', '/usuarios/' . (int) $currentUser['id'], $payload);
                flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Cuenta actualizada.' : friendly_error($response));

                if ($response['ok']) {
                    if (isset($payload['email'])) {
                        $currentUser['email'] = $payload['email'];
                    }
                    $auth['user'] = $currentUser;
                    $_SESSION['auth'] = $auth;
                }
            }

            redirect('index.php?view=perfil');
        }

        if ($action === 'espera_create') {
            if ($roleKind !== 'paciente' || $profile === null) {
                flash('error', 'Solo un paciente puede entrar a la lista de espera.');
                redirect('index.php?view=espera');
            }

            $payload = ['id_paciente' => (int) $profile['id']];
            $idMedico = (int) ($_POST['id_medico'] ?? 0);
            $prioridad = (int) ($_POST['prioridad'] ?? 0);

            if ($idMedico > 0) {
                $payload['id_medico'] = $idMedico;
            }
            if ($prioridad > 0) {
                $payload['prioridad'] = $prioridad;
            }

            $response = $api->request('POST', '/lista-espera', $payload);
            if ($response['ok']) {
                $estado = (string) ($response['data']['estado'] ?? '');
                flash(
                    'success',
                    $estado === 'ofrecida'
                        ? 'Encontramos un cupo disponible. Confírmalo o recházalo desde el aviso.'
                        : 'Solicitud agregada a la lista de espera.'
                );
            } else {
                flash('error', friendly_error($response));
            }
            redirect('index.php?view=espera');
        }

        if (in_array($action, ['espera_cancel', 'espera_aceptar', 'espera_rechazar'], true)) {
            $idEntrada = (int) ($_POST['id_entrada'] ?? 0);
            $allowed = false;

            if ($idEntrada > 0 && $roleKind === 'paciente' && $profile !== null) {
                $detail = $api->request('GET', '/lista-espera/' . $idEntrada);
                if ($detail['ok'] && is_array($detail['data'])) {
                    $allowed = (int) ($detail['data']['id_paciente'] ?? 0) === (int) $profile['id'];
                }
            }

            if (!$allowed) {
                flash('error', 'No puedes modificar esa solicitud.');
            } else {
                $response = match ($action) {
                    'espera_cancel' => $api->request('DELETE', '/lista-espera/' . $idEntrada),
                    'espera_aceptar' => $api->request('POST', '/lista-espera/' . $idEntrada . '/aceptar'),
                    default => $api->request('POST', '/lista-espera/' . $idEntrada . '/rechazar'),
                };

                flash($response['ok'] ? 'success' : 'error', $response['ok'] ? 'Solicitud actualizada.' : friendly_error($response));
            }

            redirect('index.php?view=espera');
        }
    }
}

$flash = take_flash();
$flashIsError = $flash !== null && ($flash['type'] ?? 'success') === 'error';

$requestedView = (string) ($_GET['view'] ?? '');

$allowedViews = match ($roleKind) {
    'paciente' => ['inicio', 'perfil', 'citas', 'agendar', 'espera'],
    'medico' => ['perfil', 'agenda', 'citas', 'jornada'],
    'admin' => ['panel', 'perfil', 'pacientes', 'medicos', 'agenda', 'citas', 'espera'],
    default => ['perfil'],
};

$defaultView = match ($roleKind) {
    'paciente' => 'inicio',
    'medico' => 'jornada',
    'admin' => 'panel',
    default => 'perfil',
};
$view = in_array($requestedView, $allowedViews, true) ? $requestedView : $defaultView;

$tab = ($_GET['tab'] ?? 'login') === 'register' ? 'register' : 'login';
if ($action === 'register' && $registerErrors !== []) {
    $tab = 'register';
}
if ($action === 'login' && $loginErrors !== []) {
    $tab = 'login';
}

$patientCitas = [];
$waitlist = [];
$doctors = [];
$specialties = [];
$slots = [];
$slotsTotal = 0;
$agendas = [];
$doctorCitas = [];
$jornada = [];
$nextCita = null;
$offer = null;
$upcomingCitas = [];
$historyCitas = [];
$activeWaitlist = 0;
$patients = [];
$usersById = [];
$adminCitasAll = [];
$adminCitas = [];
$adminWaitlistAll = [];
$adminWaitlist = [];
$adminSlots = [];
$adminTodayCitas = [];
$adminUpcomingCitas = [];
$adminPendingWaitlist = 0;
$adminWaitStats = ['pendiente' => 0, 'ofrecida' => 0, 'aceptada' => 0, 'rechazada' => 0, 'expirada' => 0, 'cancelada' => 0];
$adminAttendanceStats = ['atendida' => 0, 'no_asistio' => 0, 'cancelada' => 0];
$adminAbsenteeismRate = 0.0;
$adminAcceptedOffers = 0;
$adminAgendaDoctorId = 0;
$editPatient = null;
$editDoctor = null;
$medicoJornadaStats = ['total' => 0, 'atendidas' => 0, 'pendientes' => 0, 'no_asistio' => 0];
$jornadaDate = trim((string) ($_GET['fecha'] ?? ''));
if ($jornadaDate === '') {
    $jornadaDate = date('Y-m-d');
}

if ($roleKind === 'paciente' && $profile !== null) {
    $patientId = (int) $profile['id'];

    if (in_array($view, ['inicio', 'citas'], true)) {
        $response = $api->request('GET', '/citas', null, ['id_paciente' => $patientId]);
        if ($response['ok'] && is_array($response['data'])) {
            $patientCitas = $response['data'];
        }
    }

    if (in_array($view, ['agendar', 'espera'], true)) {
        $response = $api->request('GET', '/medicos');
        if ($response['ok'] && is_array($response['data'])) {
            $doctors = $response['data'];
            foreach ($doctors as $doctor) {
                $specialty = trim((string) ($doctor['especialidad'] ?? ''));
                if ($specialty !== '') {
                    $specialties[$specialty] = $specialty;
                }
            }
            ksort($specialties);
        }
    }

    if (in_array($view, ['inicio', 'agendar'], true)) {
        $query = [];
        if ($view === 'agendar') {
            foreach (['especialidad', 'id_medico', 'fecha_inicio', 'fecha_fin'] as $filter) {
                $value = trim((string) ($_GET[$filter] ?? ''));
                if ($value !== '') {
                    $query[$filter] = $value;
                }
            }
        }

        $response = $api->request('GET', '/cupos/disponibles', null, $query);
        if ($response['ok'] && is_array($response['data'])) {
            $slotsTotal = count($response['data']);
            $slots = $view === 'inicio' ? array_slice($response['data'], 0, 4) : $response['data'];
        }
    }

    $response = $api->request('GET', '/lista-espera');
    if ($response['ok'] && is_array($response['data'])) {
        foreach ($response['data'] as $entry) {
            if ((int) ($entry['id_paciente'] ?? 0) === $patientId) {
                $waitlist[] = $entry;
            }
        }
    }

    $nextCita = next_cita($patientCitas);
    $offer = pending_offer($waitlist);

    foreach ($patientCitas as $cita) {
        $state = (string) ($cita['estado'] ?? '');
        $start = cita_start_timestamp($cita);
        $isActive = in_array($state, ['pendiente', 'confirmada'], true)
            && ($start === null || $start >= time());

        if ($isActive) {
            $upcomingCitas[] = $cita;
        } else {
            $historyCitas[] = $cita;
        }
    }

    usort($upcomingCitas, static function (array $a, array $b): int {
        return (cita_start_timestamp($a) ?? PHP_INT_MAX) <=> (cita_start_timestamp($b) ?? PHP_INT_MAX);
    });

    usort($historyCitas, static function (array $a, array $b): int {
        return (cita_start_timestamp($b) ?? 0) <=> (cita_start_timestamp($a) ?? 0);
    });

    foreach ($waitlist as $entry) {
        if (in_array((string) ($entry['estado'] ?? ''), ['pendiente', 'ofrecida'], true)) {
            $activeWaitlist++;
        }
    }
}

if ($roleKind === 'medico' && $profile !== null) {
    $doctorId = (int) $profile['id'];

    if ($view === 'agenda') {
        $response = $api->request('GET', '/agenda/' . $doctorId);
        if ($response['ok'] && is_array($response['data'])) {
            $agendas = $response['data'];
        }
    }

    if ($view === 'citas') {
        $query = ['id_medico' => $doctorId];
        foreach (['estado', 'fecha'] as $filter) {
            $value = trim((string) ($_GET[$filter] ?? ''));
            if ($value !== '') {
                $query[$filter] = $value;
            }
        }

        $response = $api->request('GET', '/citas', null, $query);
        if ($response['ok'] && is_array($response['data'])) {
            $doctorCitas = $response['data'];
        }
    }

    if ($view === 'jornada') {
        $response = $api->request('GET', '/medicos/' . $doctorId . '/jornada', null, ['fecha' => $jornadaDate]);
        if ($response['ok'] && is_array($response['data'])) {
            $jornada = $response['data'];
        }

        foreach ($jornada as $cita) {
            $state = (string) ($cita['estado'] ?? '');
            $medicoJornadaStats['total']++;

            if ($state === 'atendida') {
                $medicoJornadaStats['atendidas']++;
            } elseif (in_array($state, ['pendiente', 'confirmada'], true)) {
                $medicoJornadaStats['pendientes']++;
            } elseif ($state === 'no_asistio') {
                $medicoJornadaStats['no_asistio']++;
            }
        }
    }
}

if ($roleKind === 'admin') {
    $response = $api->request('GET', '/pacientes');
    if ($response['ok'] && is_array($response['data'])) {
        $patients = $response['data'];
    }

    $response = $api->request('GET', '/medicos');
    if ($response['ok'] && is_array($response['data'])) {
        $doctors = $response['data'];
        foreach ($doctors as $doctor) {
            $specialty = trim((string) ($doctor['especialidad'] ?? ''));
            if ($specialty !== '') {
                $specialties[$specialty] = $specialty;
            }
        }
        ksort($specialties);
    }

    $response = $api->request('GET', '/usuarios');
    if ($response['ok'] && is_array($response['data'])) {
        foreach ($response['data'] as $user) {
            $usersById[(int) ($user['id'] ?? 0)] = $user;
        }
    }

    $response = $api->request('GET', '/citas');
    if ($response['ok'] && is_array($response['data'])) {
        $adminCitasAll = $response['data'];
    }

    $response = $api->request('GET', '/cupos/disponibles');
    if ($response['ok'] && is_array($response['data'])) {
        $adminSlots = $response['data'];
    }

    $response = $api->request('GET', '/lista-espera');
    if ($response['ok'] && is_array($response['data'])) {
        $adminWaitlistAll = $response['data'];
    }

    $today = date('Y-m-d');
    foreach ($adminCitasAll as $cita) {
        $date = (string) ($cita['fecha_cupo'] ?? '');
        $state = (string) ($cita['estado'] ?? '');
        $start = cita_start_timestamp($cita);

        if ($date === $today && $state !== 'cancelada') {
            $adminTodayCitas[] = $cita;
        }

        if (in_array($state, ['pendiente', 'confirmada'], true) && ($start === null || $start >= time())) {
            $adminUpcomingCitas[] = $cita;
        }
    }

    usort($adminUpcomingCitas, static function (array $a, array $b): int {
        return (cita_start_timestamp($a) ?? PHP_INT_MAX) <=> (cita_start_timestamp($b) ?? PHP_INT_MAX);
    });

    foreach ($adminWaitlistAll as $entry) {
        $waitState = (string) ($entry['estado'] ?? '');
        if (isset($adminWaitStats[$waitState])) {
            $adminWaitStats[$waitState]++;
        }
        if ($waitState === 'aceptada') {
            $adminAcceptedOffers++;
        }
        if (in_array($waitState, ['pendiente', 'ofrecida'], true)) {
            $adminPendingWaitlist++;
        }
    }

    foreach ($adminCitasAll as $cita) {
        $attendanceState = (string) ($cita['estado'] ?? '');
        if (isset($adminAttendanceStats[$attendanceState])) {
            $adminAttendanceStats[$attendanceState]++;
        }
    }

    $adminClosedCitas = $adminAttendanceStats['atendida'] + $adminAttendanceStats['no_asistio'];
    if ($adminClosedCitas > 0) {
        $adminAbsenteeismRate = round($adminAttendanceStats['no_asistio'] * 100 / $adminClosedCitas, 1);
    }

    $adminCitas = $adminCitasAll;
    $filterState = trim((string) ($_GET['estado'] ?? ''));
    $filterDate = trim((string) ($_GET['fecha'] ?? ''));
    if ($filterState !== '') {
        $adminCitas = array_values(array_filter($adminCitas, static function (array $cita) use ($filterState): bool {
            return (string) ($cita['estado'] ?? '') === $filterState;
        }));
    }
    if ($filterDate !== '') {
        $adminCitas = array_values(array_filter($adminCitas, static function (array $cita) use ($filterDate): bool {
            return (string) ($cita['fecha_cupo'] ?? '') === $filterDate;
        }));
    }

    $adminWaitlist = $adminWaitlistAll;
    $waitFilter = trim((string) ($_GET['estado'] ?? ''));
    if ($waitFilter !== '' && $view === 'espera') {
        $adminWaitlist = array_values(array_filter($adminWaitlist, static function (array $entry) use ($waitFilter): bool {
            return (string) ($entry['estado'] ?? '') === $waitFilter;
        }));
    }

    $adminAgendaDoctorId = (int) ($_GET['id_medico'] ?? 0);
    if ($adminAgendaDoctorId <= 0 && $doctors !== []) {
        $adminAgendaDoctorId = (int) ($doctors[0]['id'] ?? 0);
    }

    if ($view === 'agenda' && $adminAgendaDoctorId > 0) {
        $response = $api->request('GET', '/agenda/' . $adminAgendaDoctorId);
        if ($response['ok'] && is_array($response['data'])) {
            $agendas = $response['data'];
        }
    }

    $editId = (int) ($_GET['edit'] ?? 0);
    if ($editId > 0) {
        foreach ($patients as $patient) {
            if ((int) ($patient['id'] ?? 0) === $editId) {
                $editPatient = $patient;
                break;
            }
        }
        foreach ($doctors as $doctor) {
            if ((int) ($doctor['id'] ?? 0) === $editId) {
                $editDoctor = $doctor;
                break;
            }
        }
    }

    $search = trim((string) ($_GET['q'] ?? ''));
    if ($search !== '') {
        $needle = strtolower($search);
        $patients = array_values(array_filter($patients, static function (array $patient) use ($needle): bool {
            $haystack = strtolower(implode(' ', [
                (string) ($patient['nombres'] ?? ''),
                (string) ($patient['apellidos'] ?? ''),
                (string) ($patient['numero_documento'] ?? ''),
                (string) ($patient['email'] ?? ''),
                (string) ($patient['telefono'] ?? ''),
            ]));
            return str_contains($haystack, $needle);
        }));
        $doctors = array_values(array_filter($doctors, static function (array $doctor) use ($needle): bool {
            $haystack = strtolower(implode(' ', [
                (string) ($doctor['nombres'] ?? ''),
                (string) ($doctor['apellidos'] ?? ''),
                (string) ($doctor['numero_documento'] ?? ''),
                (string) ($doctor['email'] ?? ''),
                (string) ($doctor['especialidad'] ?? ''),
            ]));
            return str_contains($haystack, $needle);
        }));
    }
}

$userRole = (string) ($currentUser['rol'] ?? '');
$displayName = (string) ($currentUser['email'] ?? '');
$firstName = '';
if (is_array($profile)) {
    $fullName = trim((string) ($profile['nombres'] ?? '') . ' ' . (string) ($profile['apellidos'] ?? ''));
    if ($fullName !== '') {
        $displayName = $fullName;
        $nameParts = preg_split('/\s+/', trim((string) ($profile['nombres'] ?? ''))) ?: [];
        $firstName = (string) ($nameParts[0] ?? '');
    }
}
$userLabel = match ($roleKind) {
    'paciente' => 'Hola, ' . ($firstName !== '' ? $firstName : 'bienvenido'),
    'admin' => 'Administración',
    'medico' => 'Equipo médico',
    default => $displayName,
};
$patientName = $firstName !== '' ? $firstName : 'paciente';
$clinicSubtitle = match ($roleKind) {
    'admin' => 'Panel de administración',
    'medico' => 'Portal médico',
    default => 'Citas en línea',
};
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#073e6e">
    <title><?= $currentUser === null ? 'Citas en línea' : 'Mi clínica' ?> · Clínica</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body class="<?= $currentUser === null ? 'guest' : 'app' ?>">
<?php if ($currentUser === null): ?>
    <main class="guest-shell" id="main-content">
        <section class="guest-hero">
            <div class="brand">
                <span class="brand-mark">CA</span>
                <div>
                    <strong>Clínica</strong>
                    <small>Tu salud, más cerca</small>
                </div>
            </div>

            <p class="guest-kicker">Citas fáciles, sin filas</p>
            <h1>Agenda tu cita en minutos</h1>
            <p class="guest-copy">Elige la especialidad, el médico y la hora que mejor te quede. Nosotros nos encargamos del resto.</p>

            <ol class="guest-steps">
                <li><span>1</span><div><strong>Crea tu cuenta</strong><small>Solo necesitas tus datos básicos.</small></div></li>
                <li><span>2</span><div><strong>Encuentra tu cupo</strong><small>Filtra por especialidad, médico o fecha.</small></div></li>
                <li><span>3</span><div><strong>Confirma tu cita</strong><small>Listo. Te esperamos en la clínica.</small></div></li>
            </ol>

            <p class="guest-footnote">¿Ya tienes cuenta? Ingresa con tu documento y contraseña.</p>
        </section>

        <section class="auth-card">
            <header class="auth-header">
                <div>
                    <h2>Tu cita empieza aquí</h2>
                    <p class="muted">Ingresa o crea tu cuenta para agendar.</p>
                </div>
            </header>

            <?php if ($flash !== null): ?>
                <div class="alert <?= $flashIsError ? 'bad' : 'ok' ?>" role="<?= $flashIsError ? 'alert' : 'status' ?>"<?= $flashIsError ? '' : ' aria-live="polite"' ?>>
                    <?= e($flash['message'] ?? '') ?>
                </div>
            <?php endif; ?>

            <?php if ($rolesWarning !== null): ?>
                <div class="alert warn" role="alert"><?= e($rolesWarning) ?></div>
            <?php endif; ?>

            <nav class="tabs">
                <a href="index.php?tab=login" class="<?= $tab === 'login' ? 'active' : '' ?>"<?= $tab === 'login' ? ' aria-current="page"' : '' ?>>Ingresar</a>
                <a href="index.php?tab=register" class="<?= $tab === 'register' ? 'active' : '' ?>"<?= $tab === 'register' ? ' aria-current="page"' : '' ?>>Crear cuenta</a>
            </nav>

            <?php if ($tab === 'login'): ?>
                <form method="post" action="index.php" class="stack">
                    <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                    <input type="hidden" name="action" value="login">

                    <?php if ($loginErrors !== []): ?>
                        <div class="alert bad" role="alert">
                            <?php foreach ($loginErrors as $error): ?>
                                <p><?= e($error) ?></p>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <label class="field">
                        <span>Documento de identidad</span>
                        <input type="text" name="numero_documento" value="<?= old($loginData, 'numero_documento') ?>" autocomplete="username" spellcheck="false" placeholder="Ej. 1023456789" required autofocus>
                        <small class="help">Usa el mismo documento con el que te registraste.</small>
                    </label>

                    <label class="field">
                        <span>Contraseña</span>
                        <input type="password" name="password" autocomplete="current-password" required>
                    </label>

                    <button type="submit" class="btn primary wide">Ingresar</button>
                    <p class="muted center">¿Aún no tienes cuenta? <a href="index.php?tab=register">Crea una aquí</a>.</p>
                </form>
            <?php else: ?>
                <div class="auth-intro">
                    <h3>Crea tu cuenta de paciente</h3>
                    <p>Así podrás reservar, consultar y cancelar tus citas.</p>
                </div>

                <?php if ($patientRole === null): ?>
                    <div class="alert warn" role="alert">El registro en línea no está disponible en este momento. Comunícate con la clínica.</div>
                <?php endif; ?>

                <form method="post" action="index.php" class="stack">
                    <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                    <input type="hidden" name="action" value="register">

                    <?php if ($registerErrors !== []): ?>
                        <div class="alert bad" role="alert">
                            <?php foreach ($registerErrors as $error): ?>
                                <p><?= e($error) ?></p>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <fieldset>
                        <legend>Datos de acceso</legend>
                        <div class="fields">
                            <label class="field">
                                <span>Tipo de documento</span>
                                <?php $registerDocType = old($registerData, 'tipo_documento') !== '' ? old($registerData, 'tipo_documento') : 'CC'; ?>
                                <select name="tipo_documento" autocomplete="off" required>
                                    <?php foreach ($documentTypes as $docCode => $docLabel): ?>
                                        <option value="<?= e($docCode) ?>" <?= $registerDocType === $docCode ? 'selected' : '' ?>><?= e($docLabel) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </label>

                            <label class="field">
                                <span>Número de documento</span>
                                <input type="text" name="numero_documento" value="<?= old($registerData, 'numero_documento') ?>" placeholder="Ej. 1023456789" autocomplete="username" spellcheck="false" required>
                            </label>

                            <label class="field">
                                <span>Correo electrónico</span>
                                <input type="email" name="email" value="<?= old($registerData, 'email') ?>" placeholder="tucorreo@ejemplo.com" autocomplete="email" spellcheck="false" required>
                            </label>

                            <label class="field">
                                <span>Contraseña</span>
                                <input type="password" name="password" minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres" required>
                            </label>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>Tus datos</legend>
                        <div class="fields">
                            <label class="field">
                                <span>Nombres</span>
                                <input type="text" name="nombres" value="<?= old($registerData, 'nombres') ?>" autocomplete="given-name" required>
                            </label>
                            <label class="field">
                                <span>Apellidos</span>
                                <input type="text" name="apellidos" value="<?= old($registerData, 'apellidos') ?>" autocomplete="family-name" required>
                            </label>
                            <label class="field">
                                <span>Fecha de nacimiento</span>
                                <input type="date" name="fecha_nacimiento" max="<?= e(date('Y-m-d')) ?>" value="<?= old($registerData, 'fecha_nacimiento') ?>" autocomplete="bday" required>
                            </label>
                            <label class="field">
                                <span>Teléfono</span>
                                <input type="tel" name="telefono" value="<?= old($registerData, 'telefono') ?>" placeholder="Ej. 300 123 4567" autocomplete="tel" inputmode="tel" required>
                            </label>
                            <label class="field field-wide">
                                <span>Dirección (opcional)</span>
                                <input type="text" name="direccion" value="<?= old($registerData, 'direccion') ?>" placeholder="Calle, carrera, barrio…" autocomplete="street-address">
                            </label>
                        </div>
                    </fieldset>

                    <button type="submit" class="btn primary wide" <?= $patientRole === null ? 'disabled' : '' ?>>Crear cuenta y agendar</button>
                    <p class="muted center">Al crear tu cuenta podrás reservar tu primera cita de inmediato.</p>
                </form>
            <?php endif; ?>
        </section>
    </main>
<?php else: ?>
    <header class="topbar">
        <div class="brand">
            <span class="brand-mark">CA</span>
            <div>
                <strong>Clínica</strong>
                <small><?= e($clinicSubtitle) ?></small>
            </div>
        </div>
        <div class="topbar-user">
            <span class="user-chip"><?= e($userLabel) ?></span>
            <form method="post" action="index.php">
                <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                <input type="hidden" name="action" value="logout">
                <button type="submit" class="btn ghost">Salir</button>
            </form>
        </div>
    </header>

    <div class="layout">
        <aside class="sidebar">
            <p class="sidebar-title">Menú</p>
            <nav aria-label="Menú principal">
                <?php if ($roleKind === 'admin'): ?>
                    <?= nav_link('index.php?view=panel', 'Resumen', 'panel', $view) ?>
                    <?= nav_link('index.php?view=pacientes', 'Pacientes', 'pacientes', $view) ?>
                    <?= nav_link('index.php?view=medicos', 'Médicos', 'medicos', $view) ?>
                    <?= nav_link('index.php?view=agenda', 'Agenda', 'agenda', $view) ?>
                    <?= nav_link('index.php?view=citas', 'Citas', 'citas', $view) ?>
                    <?= nav_link('index.php?view=espera', 'Lista de espera', 'espera', $view) ?>
                    <?= nav_link('index.php?view=perfil', 'Mi cuenta', 'perfil', $view) ?>
                <?php elseif ($roleKind === 'paciente'): ?>
                    <?= nav_link('index.php?view=inicio', 'Inicio', 'inicio', $view) ?>
                    <?= nav_link('index.php?view=agendar', 'Agendar cita', 'agendar', $view) ?>
                    <?= nav_link('index.php?view=citas', 'Mis citas', 'citas', $view) ?>
                    <?= nav_link('index.php?view=espera', 'Lista de espera', 'espera', $view) ?>
                    <?= nav_link('index.php?view=perfil', 'Mi perfil', 'perfil', $view) ?>
                <?php elseif ($roleKind === 'medico'): ?>
                    <?= nav_link('index.php?view=jornada', 'Mi jornada', 'jornada', $view) ?>
                    <?= nav_link('index.php?view=agenda', 'Mi agenda', 'agenda', $view) ?>
                    <?= nav_link('index.php?view=citas', 'Mis citas', 'citas', $view) ?>
                    <?= nav_link('index.php?view=perfil', 'Mi perfil', 'perfil', $view) ?>
                <?php else: ?>
                    <?= nav_link('index.php?view=perfil', 'Mi cuenta', 'perfil', $view) ?>
                <?php endif; ?>
            </nav>
            <p class="sidebar-note">
                <?php if ($roleKind === 'admin'): ?>
                    Desde aquí puedes registrar pacientes y médicos, organizar horarios y acompañar las citas de la clínica.
                <?php elseif ($roleKind === 'paciente'): ?>
                    Agenda, revisa o cancela tus citas cuando quieras. Si no encuentras un cupo, te avisamos por la lista de espera.
                <?php elseif ($roleKind === 'medico'): ?>
                    Consulta tu jornada, organiza tu disponibilidad y registra la asistencia de tus pacientes.
                <?php else: ?>
                    Tu cuenta solo tiene acceso a tus datos personales.
                <?php endif; ?>
            </p>
        </aside>

        <main class="content" id="main-content">
            <?php if ($flash !== null): ?>
                <div class="alert <?= $flashIsError ? 'bad' : 'ok' ?>" role="<?= $flashIsError ? 'alert' : 'status' ?>"<?= $flashIsError ? '' : ' aria-live="polite"' ?>>
                    <?= e($flash['message'] ?? '') ?>
                </div>
            <?php endif; ?>

            <?php if ($roleKind === 'paciente' && $offer !== null): ?>
                <?php
                $offerDoctor = trim((string) ($offer['medico_ofrecido'] ?? ''));
                $offerSpecialty = trim((string) ($offer['especialidad_ofrecida'] ?? ''));
                if ($offerDoctor === '') {
                    $offerDoctor = trim((string) ($offer['medico'] ?? ''));
                }
                if ($offerSpecialty === '') {
                    $offerSpecialty = trim((string) ($offer['especialidad'] ?? ''));
                }
                ?>
                <section class="offer-banner" role="status" aria-live="polite" aria-labelledby="offer-title">
                    <div>
                        <p class="offer-kicker">Tienes un cupo esperando</p>
                        <h2 id="offer-title"><?= e(format_date_es((string) ($offer['fecha_cupo'] ?? ''))) ?> a las <?= e(format_time_es((string) ($offer['hora_cupo'] ?? ''))) ?></h2>
                        <p>
                            <?= e($offerDoctor !== '' ? $offerDoctor : 'Médico disponible') ?>
                            <?php if ($offerSpecialty !== ''): ?> · <?= e($offerSpecialty) ?><?php endif; ?>
                        </p>
                        <p class="offer-note">Se te asignó por orden de llegada y compatibilidad de especialidad.</p>
                        <?php if (!empty($offer['fecha_expiracion'])): ?>
                            <small>Confirma antes del <?= e(format_datetime_es((string) $offer['fecha_expiracion'])) ?>.</small>
                        <?php endif; ?>
                    </div>
                    <div class="offer-actions">
                        <form method="post" action="index.php" class="inline-form">
                            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="action" value="espera_aceptar">
                            <input type="hidden" name="id_entrada" value="<?= (int) ($offer['id'] ?? 0) ?>">
                            <button type="submit" class="btn primary">Confirmar cupo</button>
                        </form>
                        <form method="post" action="index.php" class="inline-form" onsubmit="return confirm('¿Rechazar este cupo? Se ofrecerá al siguiente paciente.');">
                            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="action" value="espera_rechazar">
                            <input type="hidden" name="id_entrada" value="<?= (int) ($offer['id'] ?? 0) ?>">
                            <button type="submit" class="btn ghost">Rechazar</button>
                        </form>
                    </div>
                </section>
            <?php endif; ?>

            <?php if ($roleKind === 'admin' && $view === 'panel'): ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1>Resumen de la clínica</h1>
                        <p>Lo más importante de la operación de hoy, en un solo lugar.</p>
                    </div>
                    <a class="btn primary" href="index.php?view=pacientes">Registrar paciente</a>
                </section>

                <section class="stats">
                    <article class="stat-card">
                        <span>Pacientes</span>
                        <strong><?= count($patients) ?></strong>
                        <small>Personas registradas.</small>
                    </article>
                    <article class="stat-card">
                        <span>Médicos</span>
                        <strong><?= count($doctors) ?></strong>
                        <small>Profesionales activos.</small>
                    </article>
                    <article class="stat-card">
                        <span>Citas de hoy</span>
                        <strong><?= count($adminTodayCitas) ?></strong>
                        <small>Agenda del día.</small>
                    </article>
                    <article class="stat-card">
                        <span>En espera</span>
                        <strong><?= $adminPendingWaitlist ?></strong>
                        <small>Solicitudes por atender.</small>
                    </article>
                </section>

                <section class="card mb">
                    <div class="card-head">
                        <div>
                            <h2>Indicadores de ausentismo</h2>
                            <p class="muted">Calculados sobre las citas cerradas (atendidas e inasistencias).</p>
                        </div>
                        <a href="index.php?view=citas&amp;estado=no_asistio">Ver inasistencias</a>
                    </div>
                    <div class="mini-stats">
                        <div><strong><?= number_format($adminAbsenteeismRate, 1, ',', '.') ?> %</strong><span>Tasa de inasistencia</span></div>
                        <div><strong><?= $adminAttendanceStats['no_asistio'] ?></strong><span>Inasistencias</span></div>
                        <div><strong><?= $adminAttendanceStats['cancelada'] ?></strong><span>Cancelaciones</span></div>
                        <div><strong><?= $adminAcceptedOffers ?></strong><span>Ofertas aceptadas</span></div>
                        <div><strong><?= $adminWaitStats['ofrecida'] ?></strong><span>Ofertas pendientes</span></div>
                    </div>
                </section>

                <div class="dashboard-grid">
                    <section class="card">
                        <div class="card-head">
                            <div>
                                <h2>Próximas citas</h2>
                                <p class="muted">Las siguientes visitas de la clínica.</p>
                            </div>
                            <a href="index.php?view=citas">Ver todas</a>
                        </div>
                        <?php if ($adminUpcomingCitas === []): ?>
                            <div class="empty-state">
                                <p>No hay citas próximas.</p>
                                <a class="btn primary" href="index.php?view=agenda">Organizar la agenda</a>
                            </div>
                        <?php else: ?>
                            <div class="appointment-list">
                                <?php foreach (array_slice($adminUpcomingCitas, 0, 4) as $cita): ?>
                                    <?= render_clinical_cita_card($cita, 'citas', false) ?>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </section>

                    <section class="card quick-card">
                        <h2>¿Qué necesitas hacer?</h2>
                        <div class="quick-links">
                            <a href="index.php?view=pacientes">
                                <strong>Registrar un paciente</strong>
                                <span>Crea su cuenta y sus datos personales.</span>
                            </a>
                            <a href="index.php?view=medicos">
                                <strong>Agregar un médico</strong>
                                <span>Incorpora un profesional a la clínica.</span>
                            </a>
                            <a href="index.php?view=agenda">
                                <strong>Organizar horarios</strong>
                                <span>Define la disponibilidad y genera cupos.</span>
                            </a>
                            <a href="index.php?view=espera">
                                <strong>Revisar la lista de espera</strong>
                                <span>Atiende las solicitudes pendientes.</span>
                            </a>
                        </div>
                    </section>
                </div>

                <section class="card">
                    <div class="card-head">
                        <div>
                            <h2>Disponibilidad de la clínica</h2>
                            <p class="muted">Un vistazo rápido a los cupos y a las personas registradas.</p>
                        </div>
                        <a href="index.php?view=agenda">Ver agenda</a>
                    </div>
                    <div class="mini-stats">
                        <div><strong><?= count($adminSlots) ?></strong><span>Cupos disponibles</span></div>
                        <div><strong><?= count($doctors) ?></strong><span>Médicos registrados</span></div>
                        <div><strong><?= count($patients) ?></strong><span>Pacientes registrados</span></div>
                    </div>
                </section>
            <?php elseif ($roleKind === 'admin' && $view === 'pacientes'): ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1>Pacientes</h1>
                        <p>Registra, actualiza y controla el acceso de los pacientes de la clínica.</p>
                    </div>
                    <a class="btn primary" href="index.php?view=pacientes&crear=1#registrar-paciente">Registrar paciente</a>
                </section>

                <form method="get" action="index.php" class="card search-bar">
                    <input type="hidden" name="view" value="pacientes">
                    <label class="field">
                        <span>Buscar paciente</span>
                        <input type="search" name="q" value="<?= e($search) ?>" placeholder="Nombre, documento, correo o teléfono" autocomplete="off" spellcheck="false">
                    </label>
                    <button type="submit" class="btn ghost">Buscar</button>
                </form>

                <details class="card form-drawer" id="registrar-paciente" <?= (string) ($_GET['crear'] ?? '') === '1' ? 'open' : '' ?>>
                    <summary>Registrar un paciente nuevo</summary>
                    <form method="post" action="index.php" class="stack">
                        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                        <input type="hidden" name="action" value="admin_paciente_create">
                        <fieldset>
                            <legend>Datos de acceso</legend>
                            <div class="fields">
                                <label class="field"><span>Tipo de documento</span><select name="tipo_documento" autocomplete="off" required><?php foreach ($documentTypes as $docCode => $docLabel): ?><option value="<?= e($docCode) ?>" <?= $docCode === 'CC' ? 'selected' : '' ?>><?= e($docLabel) ?></option><?php endforeach; ?></select></label>
                                <label class="field"><span>Número de documento</span><input type="text" name="numero_documento" autocomplete="off" spellcheck="false" required></label>
                                <label class="field"><span>Correo electrónico</span><input type="email" name="email" autocomplete="email" spellcheck="false" required></label>
                                <label class="field"><span>Contraseña inicial</span><input type="password" name="password" minlength="6" autocomplete="new-password" required></label>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>Datos personales</legend>
                            <div class="fields">
                                <label class="field"><span>Nombres</span><input type="text" name="nombres" autocomplete="given-name" required></label>
                                <label class="field"><span>Apellidos</span><input type="text" name="apellidos" autocomplete="family-name" required></label>
                                <label class="field"><span>Fecha de nacimiento</span><input type="date" name="fecha_nacimiento" max="<?= e(date('Y-m-d')) ?>" autocomplete="bday" required></label>
                                <label class="field"><span>Teléfono</span><input type="tel" name="telefono" autocomplete="tel" inputmode="tel" required></label>
                                <label class="field field-wide"><span>Dirección (opcional)</span><input type="text" name="direccion" autocomplete="street-address"></label>
                            </div>
                        </fieldset>
                        <?php if ($patientRole === null): ?>
                            <div class="alert warn" role="alert">No encontramos el rol de paciente. Revisa la configuración de roles antes de registrar.</div>
                        <?php endif; ?>
                        <div class="form-actions">
                            <button type="submit" class="btn primary" <?= $patientRole === null ? 'disabled' : '' ?>>Registrar paciente</button>
                        </div>
                    </form>
                </details>

                <?php if ($editPatient !== null): ?>
                    <section class="card form-card" id="editar-paciente">
                        <div class="card-head">
                            <div>
                                <h2>Editar paciente</h2>
                                <p class="muted"><?= e(trim((string) ($editPatient['nombres'] ?? '') . ' ' . (string) ($editPatient['apellidos'] ?? ''))) ?></p>
                            </div>
                            <a href="index.php?view=pacientes">Cerrar</a>
                        </div>
                        <form method="post" action="index.php" class="stack">
                            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="action" value="admin_paciente_update">
                            <input type="hidden" name="id_perfil" value="<?= (int) ($editPatient['id'] ?? 0) ?>">
                            <div class="fields">
                                <label class="field"><span>Nombres</span><input type="text" name="nombres" value="<?= e($editPatient['nombres'] ?? '') ?>" autocomplete="given-name"></label>
                                <label class="field"><span>Apellidos</span><input type="text" name="apellidos" value="<?= e($editPatient['apellidos'] ?? '') ?>" autocomplete="family-name"></label>
                                <label class="field"><span>Fecha de nacimiento</span><input type="date" name="fecha_nacimiento" value="<?= e($editPatient['fecha_nacimiento'] ?? '') ?>" autocomplete="bday"></label>
                                <label class="field"><span>Teléfono</span><input type="tel" name="telefono" value="<?= e($editPatient['telefono'] ?? '') ?>" autocomplete="tel" inputmode="tel"></label>
                                <label class="field field-wide"><span>Dirección</span><input type="text" name="direccion" value="<?= e($editPatient['direccion'] ?? '') ?>" autocomplete="street-address"></label>
                            </div>
                            <div class="form-actions"><button type="submit" class="btn primary">Guardar cambios</button></div>
                        </form>
                    </section>
                <?php endif; ?>

                <div class="card-head">
                    <div>
                        <h2>Pacientes registrados</h2>
                        <p class="muted"><?= count($patients) ?> persona(s) encontrada(s).</p>
                    </div>
                    <span class="count-pill"><?= count($patients) ?></span>
                </div>

                <?php if ($patients === []): ?>
                    <div class="card empty-state">
                        <h2>No encontramos pacientes</h2>
                        <p>Prueba con otra búsqueda o registra un paciente nuevo.</p>
                    </div>
                <?php else: ?>
                    <div class="people-grid">
                        <?php foreach ($patients as $patient): ?>
                            <?php
                            $patientUser = $usersById[(int) ($patient['id_usuario'] ?? 0)] ?? null;
                            $patientActive = (bool) ($patientUser['is_active'] ?? true);
                            ?>
                            <article class="person-card">
                                <div class="person-head">
                                    <div>
                                        <h3><?= e(trim((string) ($patient['nombres'] ?? '') . ' ' . (string) ($patient['apellidos'] ?? ''))) ?></h3>
                                        <p><?= e($patient['tipo_documento'] ?? 'Documento') ?> <?= e($patient['numero_documento'] ?? '—') ?></p>
                                    </div>
                                    <?= state_badge_label($patientActive ? 'activo' : 'inactivo') ?>
                                </div>
                                <dl class="data-list compact">
                                    <dt>Correo</dt><dd><?= e($patient['email'] ?? '—') ?></dd>
                                    <dt>Teléfono</dt><dd><?= e($patient['telefono'] ?? '—') ?></dd>
                                    <dt>Nacimiento</dt><dd><?= e(format_date_es((string) ($patient['fecha_nacimiento'] ?? ''))) ?></dd>
                                </dl>
                                <div class="person-actions">
                                    <a class="btn ghost small" href="index.php?view=pacientes&edit=<?= (int) ($patient['id'] ?? 0) ?>#editar-paciente">Editar datos</a>
                                    <?php if ($patientUser !== null): ?>
                                        <form method="post" action="index.php" class="inline-form">
                                            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                                            <input type="hidden" name="action" value="admin_usuario_estado">
                                            <input type="hidden" name="id_usuario" value="<?= (int) ($patientUser['id'] ?? 0) ?>">
                                            <input type="hidden" name="is_active" value="<?= $patientActive ? '0' : '1' ?>">
                                            <input type="hidden" name="back" value="pacientes">
                                            <button type="submit" class="btn <?= $patientActive ? 'danger' : 'primary' ?> small"><?= $patientActive ? 'Desactivar acceso' : 'Activar acceso' ?></button>
                                        </form>
                                    <?php endif; ?>
                                </div>
                            </article>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php elseif ($roleKind === 'admin' && $view === 'medicos'): ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1>Médicos</h1>
                        <p>Registra profesionales, actualiza sus datos y controla su acceso al sistema.</p>
                    </div>
                    <a class="btn primary" href="index.php?view=medicos&crear=1#registrar-medico">Agregar médico</a>
                </section>

                <form method="get" action="index.php" class="card search-bar">
                    <input type="hidden" name="view" value="medicos">
                    <label class="field">
                        <span>Buscar médico</span>
                        <input type="search" name="q" value="<?= e($search) ?>" placeholder="Nombre, documento, especialidad o correo" autocomplete="off" spellcheck="false">
                    </label>
                    <button type="submit" class="btn ghost">Buscar</button>
                </form>

                <details class="card form-drawer" id="registrar-medico" <?= (string) ($_GET['crear'] ?? '') === '1' ? 'open' : '' ?>>
                    <summary>Agregar un médico nuevo</summary>
                    <form method="post" action="index.php" class="stack">
                        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                        <input type="hidden" name="action" value="admin_medico_create">
                        <fieldset>
                            <legend>Datos de acceso</legend>
                            <div class="fields">
                                <label class="field"><span>Tipo de documento</span><select name="tipo_documento" autocomplete="off" required><?php foreach ($documentTypes as $docCode => $docLabel): ?><option value="<?= e($docCode) ?>" <?= $docCode === 'CC' ? 'selected' : '' ?>><?= e($docLabel) ?></option><?php endforeach; ?></select></label>
                                <label class="field"><span>Número de documento</span><input type="text" name="numero_documento" autocomplete="off" spellcheck="false" required></label>
                                <label class="field"><span>Correo electrónico</span><input type="email" name="email" autocomplete="email" spellcheck="false" required></label>
                                <label class="field"><span>Contraseña inicial</span><input type="password" name="password" minlength="6" autocomplete="new-password" required></label>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>Datos profesionales</legend>
                            <div class="fields">
                                <label class="field"><span>Nombres</span><input type="text" name="nombres" autocomplete="given-name" required></label>
                                <label class="field"><span>Apellidos</span><input type="text" name="apellidos" autocomplete="family-name" required></label>
                                <label class="field"><span>Teléfono</span><input type="tel" name="telefono" autocomplete="tel" inputmode="tel" required></label>
                                <label class="field"><span>Tarjeta profesional</span><input type="text" name="tarjeta_profesional" autocomplete="off" spellcheck="false" required></label>
                                <label class="field"><span>Especialidad</span><input type="text" name="especialidad" autocomplete="off" required></label>
                                <label class="field"><span>Consultorio</span><input type="text" name="consultorio" autocomplete="off" required></label>
                            </div>
                        </fieldset>
                        <?php if ($doctorRole === null): ?>
                            <div class="alert warn" role="alert">No encontramos el rol de médico. Revisa la configuración de roles antes de registrar.</div>
                        <?php endif; ?>
                        <div class="form-actions">
                            <button type="submit" class="btn primary" <?= $doctorRole === null ? 'disabled' : '' ?>>Registrar médico</button>
                        </div>
                    </form>
                </details>

                <?php if ($editDoctor !== null): ?>
                    <section class="card form-card" id="editar-medico">
                        <div class="card-head">
                            <div>
                                <h2>Editar médico</h2>
                                <p class="muted"><?= e(trim((string) ($editDoctor['nombres'] ?? '') . ' ' . (string) ($editDoctor['apellidos'] ?? ''))) ?></p>
                            </div>
                            <a href="index.php?view=medicos">Cerrar</a>
                        </div>
                        <form method="post" action="index.php" class="stack">
                            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="action" value="admin_medico_update">
                            <input type="hidden" name="id_perfil" value="<?= (int) ($editDoctor['id'] ?? 0) ?>">
                            <div class="fields">
                                <label class="field"><span>Nombres</span><input type="text" name="nombres" value="<?= e($editDoctor['nombres'] ?? '') ?>" autocomplete="given-name"></label>
                                <label class="field"><span>Apellidos</span><input type="text" name="apellidos" value="<?= e($editDoctor['apellidos'] ?? '') ?>" autocomplete="family-name"></label>
                                <label class="field"><span>Teléfono</span><input type="tel" name="telefono" value="<?= e($editDoctor['telefono'] ?? '') ?>" autocomplete="tel" inputmode="tel"></label>
                                <label class="field"><span>Tarjeta profesional</span><input type="text" name="tarjeta_profesional" value="<?= e($editDoctor['tarjeta_profesional'] ?? '') ?>" autocomplete="off" spellcheck="false"></label>
                                <label class="field"><span>Especialidad</span><input type="text" name="especialidad" value="<?= e($editDoctor['especialidad'] ?? '') ?>" autocomplete="off"></label>
                                <label class="field"><span>Consultorio</span><input type="text" name="consultorio" value="<?= e($editDoctor['consultorio'] ?? '') ?>" autocomplete="off"></label>
                            </div>
                            <div class="form-actions"><button type="submit" class="btn primary">Guardar cambios</button></div>
                        </form>
                    </section>
                <?php endif; ?>

                <div class="card-head">
                    <div>
                        <h2>Equipo registrado</h2>
                        <p class="muted"><?= count($doctors) ?> profesional(es) encontrado(s).</p>
                    </div>
                    <span class="count-pill"><?= count($doctors) ?></span>
                </div>

                <?php if ($doctors === []): ?>
                    <div class="card empty-state">
                        <h2>No encontramos médicos</h2>
                        <p>Prueba con otra búsqueda o agrega un médico nuevo.</p>
                    </div>
                <?php else: ?>
                    <div class="people-grid">
                        <?php foreach ($doctors as $doctor): ?>
                            <?php
                            $doctorUser = $usersById[(int) ($doctor['id_usuario'] ?? 0)] ?? null;
                            $doctorActive = (bool) ($doctorUser['is_active'] ?? true);
                            ?>
                            <article class="person-card">
                                <div class="person-head">
                                    <div>
                                        <h3><?= e(trim((string) ($doctor['nombres'] ?? '') . ' ' . (string) ($doctor['apellidos'] ?? ''))) ?></h3>
                                        <p><?= e($doctor['especialidad'] ?? 'Medicina general') ?></p>
                                    </div>
                                    <?= state_badge_label($doctorActive ? 'activo' : 'inactivo') ?>
                                </div>
                                <dl class="data-list compact">
                                    <dt>Documento</dt><dd><?= e($doctor['numero_documento'] ?? '—') ?></dd>
                                    <dt>Correo</dt><dd><?= e($doctor['email'] ?? '—') ?></dd>
                                    <dt>Consultorio</dt><dd><?= e($doctor['consultorio'] ?? '—') ?></dd>
                                </dl>
                                <div class="person-actions">
                                    <a class="btn ghost small" href="index.php?view=medicos&edit=<?= (int) ($doctor['id'] ?? 0) ?>#editar-medico">Editar datos</a>
                                    <?php if ($doctorUser !== null): ?>
                                        <form method="post" action="index.php" class="inline-form">
                                            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                                            <input type="hidden" name="action" value="admin_usuario_estado">
                                            <input type="hidden" name="id_usuario" value="<?= (int) ($doctorUser['id'] ?? 0) ?>">
                                            <input type="hidden" name="is_active" value="<?= $doctorActive ? '0' : '1' ?>">
                                            <input type="hidden" name="back" value="medicos">
                                            <button type="submit" class="btn <?= $doctorActive ? 'danger' : 'primary' ?> small"><?= $doctorActive ? 'Desactivar acceso' : 'Activar acceso' ?></button>
                                        </form>
                                    <?php endif; ?>
                                </div>
                            </article>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php elseif ($roleKind === 'admin' && $view === 'agenda'): ?>
                <?php
                $selectedDoctor = null;
                foreach ($doctors as $doctor) {
                    if ((int) ($doctor['id'] ?? 0) === $adminAgendaDoctorId) {
                        $selectedDoctor = $doctor;
                        break;
                    }
                }
                ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1>Agenda médica</h1>
                        <p>Organiza los horarios de cada profesional y genera los cupos que verán los pacientes.</p>
                    </div>
                    <a class="btn primary" href="index.php?view=citas">Ver citas</a>
                </section>

                <section class="card mb">
                    <form method="get" action="index.php" class="filters">
                        <input type="hidden" name="view" value="agenda">
                        <label class="field">
                            <span>Médico</span>
                            <select name="id_medico" onchange="this.form.submit()">
                                <?php if ($doctors === []): ?>
                                    <option value="">No hay médicos registrados</option>
                                <?php else: ?>
                                    <?php foreach ($doctors as $doctor): ?>
                                        <option value="<?= (int) ($doctor['id'] ?? 0) ?>" <?= $adminAgendaDoctorId === (int) ($doctor['id'] ?? 0) ? 'selected' : '' ?>>
                                            <?= e(trim((string) ($doctor['nombres'] ?? '') . ' ' . (string) ($doctor['apellidos'] ?? '')) . ' · ' . (string) ($doctor['especialidad'] ?? '')) ?>
                                        </option>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </select>
                        </label>
                        <noscript><button type="submit" class="btn ghost">Ver agenda</button></noscript>
                    </form>
                </section>

                <?php if ($selectedDoctor !== null): ?>
                    <details class="card form-drawer" <?= $agendas === [] ? 'open' : '' ?>>
                        <summary>Crear un horario para <?= e(trim((string) ($selectedDoctor['nombres'] ?? '') . ' ' . (string) ($selectedDoctor['apellidos'] ?? ''))) ?></summary>
                        <form method="post" action="index.php" class="stack">
                            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="action" value="agenda_create">
                            <input type="hidden" name="id_medico" value="<?= $adminAgendaDoctorId ?>">
                            <div class="fields">
                                <label class="field"><span>Primer día</span><input type="date" name="fecha_inicio" min="<?= e(date('Y-m-d')) ?>" autocomplete="off" required></label>
                                <label class="field"><span>Último día</span><input type="date" name="fecha_fin" min="<?= e(date('Y-m-d')) ?>" autocomplete="off" required></label>
                                <label class="field"><span>Duración de cada cita (minutos)</span><input type="number" name="duracion_cita" min="5" step="5" value="30" autocomplete="off" required></label>
                                <label class="field"><span>Atención desde</span><input type="time" name="hora_inicio" autocomplete="off" required></label>
                                <label class="field"><span>Atención hasta</span><input type="time" name="hora_fin" autocomplete="off" required></label>
                            </div>
                            <div class="form-actions"><button type="submit" class="btn primary">Crear horario</button></div>
                        </form>
                    </details>

                    <div class="card-head">
                        <div>
                            <h2>Horarios de <?= e(trim((string) ($selectedDoctor['nombres'] ?? '') . ' ' . (string) ($selectedDoctor['apellidos'] ?? ''))) ?></h2>
                            <p class="muted">Genera los cupos después de crear cada horario.</p>
                        </div>
                        <span class="count-pill"><?= count($agendas) ?></span>
                    </div>

                    <?php if ($agendas === []): ?>
                        <div class="card empty-state">
                            <h2>Sin horarios por ahora</h2>
                            <p>Crea el primer horario para este médico.</p>
                        </div>
                    <?php else: ?>
                        <div class="agenda-grid">
                            <?php foreach ($agendas as $agenda): ?>
                                <?= render_agenda_card($agenda, true, $adminAgendaDoctorId) ?>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                <?php else: ?>
                    <div class="card empty-state">
                        <h2>Aún no hay médicos</h2>
                        <p>Registra un médico para poder organizar su agenda.</p>
                        <a class="btn primary" href="index.php?view=medicos">Agregar médico</a>
                    </div>
                <?php endif; ?>
            <?php elseif ($roleKind === 'admin' && $view === 'citas'): ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1>Citas</h1>
                        <p>Consulta las reservas, registra la asistencia y cancela cuando sea necesario.</p>
                    </div>
                    <a class="btn primary" href="index.php?view=agenda">Organizar agenda</a>
                </section>

                <section class="card mb">
                    <form method="get" action="index.php" class="filters">
                        <input type="hidden" name="view" value="citas">
                        <label class="field">
                            <span>Estado</span>
                            <select name="estado">
                                <option value="">Todas</option>
                                <?php foreach (['pendiente', 'confirmada', 'atendida', 'cancelada', 'no_asistio'] as $state): ?>
                                    <option value="<?= e($state) ?>" <?= (string) ($_GET['estado'] ?? '') === $state ? 'selected' : '' ?>><?= e(state_label($state)) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </label>
                        <label class="field"><span>Fecha</span><input type="date" name="fecha" value="<?= e($_GET['fecha'] ?? '') ?>" autocomplete="off"></label>
                        <button type="submit" class="btn primary">Consultar</button>
                        <a class="btn ghost" href="index.php?view=citas">Limpiar filtros</a>
                    </form>
                </section>

                <div class="card-head">
                    <div>
                        <h2>Citas encontradas</h2>
                        <p class="muted"><?= count($adminCitas) ?> cita(s) con los filtros actuales.</p>
                    </div>
                    <span class="count-pill"><?= count($adminCitas) ?></span>
                </div>

                <?php if ($adminCitas === []): ?>
                    <div class="card empty-state">
                        <h2>No hay citas para mostrar</h2>
                        <p>Prueba con otro estado o fecha.</p>
                    </div>
                <?php else: ?>
                    <div class="appointment-list">
                        <?php foreach ($adminCitas as $cita): ?>
                            <?= render_clinical_cita_card($cita, 'citas', true) ?>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php elseif ($roleKind === 'admin' && $view === 'espera'): ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1>Lista de espera</h1>
                        <p>Acompaña a los pacientes que esperan un cupo y revisa las ofertas vencidas.</p>
                    </div>
                    <form method="post" action="index.php" class="inline-form">
                        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                        <input type="hidden" name="action" value="admin_espera_procesar">
                        <button type="submit" class="btn primary">Revisar ofertas vencidas</button>
                    </form>
                </section>

                <section class="card mb wait-help">
                    <div class="card-head">
                        <div>
                            <h2>Cómo se asignan los cupos</h2>
                            <p class="muted">La asignación es automática y no requiere intervención manual.</p>
                        </div>
                        <a href="index.php?view=citas">Ver citas</a>
                    </div>
                    <ul class="wait-rules">
                        <li><strong>Orden FIFO:</strong> el primer paciente en la cola recibe la oferta, sin importar la prioridad declarada.</li>
                        <li><strong>Asignación inmediata:</strong> si hay un cupo compatible disponible al crear la solicitud, se ofrece en ese momento.</li>
                        <li><strong>Misma especialidad:</strong> solo se ofrecen cupos compatibles con la especialidad solicitada; si no eligió médico, acepta cualquier especialidad.</li>
                        <li><strong>Plazo:</strong> 48 horas para confirmar, acotado a la hora de la cita. Si faltan menos de 48 horas, debe confirmar antes de la cita.</li>
                        <li><strong>Sin respuesta:</strong> al rechazar o vencer la oferta, el cupo se libera automáticamente para el siguiente paciente.</li>
                    </ul>
                    <div class="mini-stats">
                        <div><strong><?= $adminWaitStats['pendiente'] ?></strong><span>Pendientes</span></div>
                        <div><strong><?= $adminWaitStats['ofrecida'] ?></strong><span>Ofertas activas</span></div>
                        <div><strong><?= $adminWaitStats['aceptada'] ?></strong><span>Aceptadas</span></div>
                        <div><strong><?= $adminWaitStats['expirada'] ?></strong><span>Expiradas</span></div>
                        <div><strong><?= $adminWaitStats['rechazada'] ?></strong><span>Rechazadas</span></div>
                    </div>
                </section>

                <section class="card mb">
                    <form method="get" action="index.php" class="filters">
                        <input type="hidden" name="view" value="espera">
                        <label class="field">
                            <span>Estado</span>
                            <select name="estado">
                                <option value="">Todos</option>
                                <?php foreach (['pendiente', 'ofrecida', 'aceptada', 'rechazada', 'expirada', 'cancelada'] as $state): ?>
                                    <option value="<?= e($state) ?>" <?= (string) ($_GET['estado'] ?? '') === $state ? 'selected' : '' ?>><?= e(state_label($state)) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </label>
                        <button type="submit" class="btn primary">Consultar</button>
                        <a class="btn ghost" href="index.php?view=espera">Ver todas</a>
                    </form>
                </section>

                <div class="card-head">
                    <div>
                        <h2>Solicitudes</h2>
                        <p class="muted"><?= count($adminWaitlist) ?> solicitud(es) con los filtros actuales.</p>
                    </div>
                    <span class="count-pill"><?= count($adminWaitlist) ?></span>
                </div>

                <?php if ($adminWaitlist === []): ?>
                    <div class="card empty-state">
                        <h2>No hay solicitudes</h2>
                        <p>Cuando un paciente pida un cupo, aparecerá aquí.</p>
                    </div>
                <?php else: ?>
                    <div class="wait-grid">
                        <?php foreach ($adminWaitlist as $entry): ?>
                            <?= render_admin_wait_card($entry) ?>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php elseif ($roleKind === 'paciente' && $profile === null): ?>
                <section class="card">
                    <h2>Estamos preparando tu perfil</h2>
                    <p class="muted">Tu cuenta ya está creada, pero aún falta activar tus datos de paciente. Comunícate con la clínica para que puedas agendar tu cita.</p>
                </section>
            <?php elseif ($roleKind === 'medico' && $profile === null): ?>
                <section class="card">
                    <h2>Estamos preparando tu perfil</h2>
                    <p class="muted">Tu cuenta ya está creada, pero aún falta activar tus datos profesionales. Comunícate con la clínica para que puedas gestionar tu agenda.</p>
                </section>
            <?php elseif ($roleKind === 'paciente' && $view === 'inicio'): ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1>Hola, <?= e($patientName) ?></h1>
                        <p>Agenda una cita, revisa tus próximas visitas o deja que te avisemos cuando se libere un cupo.</p>
                    </div>
                    <a class="btn primary" href="index.php?view=agendar">Agendar cita</a>
                </section>

                <section class="stats">
                    <article class="stat-card">
                        <span>Próximas citas</span>
                        <strong><?= count($upcomingCitas) ?></strong>
                        <small>Reservas confirmadas o pendientes.</small>
                    </article>
                    <article class="stat-card">
                        <span>Solicitudes activas</span>
                        <strong><?= $activeWaitlist ?></strong>
                        <small>En lista de espera.</small>
                    </article>
                    <article class="stat-card">
                        <span>Cupos disponibles</span>
                        <strong><?= $slotsTotal ?></strong>
                        <small>Horarios para agendar.</small>
                    </article>
                </section>

                <div class="dashboard-grid">
                    <section class="card next-card">
                        <div class="card-head">
                            <h2>Tu próxima cita</h2>
                            <a href="index.php?view=citas">Ver todas</a>
                        </div>
                        <?php if ($nextCita !== null): ?>
                            <?= render_cita_card($nextCita, 'inicio', true) ?>
                        <?php else: ?>
                            <div class="empty-state">
                                <p>Aún no tienes una cita programada.</p>
                                <a class="btn primary" href="index.php?view=agendar">Buscar un cupo</a>
                            </div>
                        <?php endif; ?>
                    </section>

                    <section class="card quick-card">
                        <h2>¿Qué quieres hacer?</h2>
                        <div class="quick-links">
                            <a href="index.php?view=agendar">
                                <strong>Agendar una cita</strong>
                                <span>Encuentra el horario que necesitas.</span>
                            </a>
                            <a href="index.php?view=citas">
                                <strong>Mis citas</strong>
                                <span>Consulta o cancela tus reservas.</span>
                            </a>
                            <a href="index.php?view=espera">
                                <strong>Lista de espera</strong>
                                <span>Te avisamos si se libera un cupo.</span>
                            </a>
                            <a href="index.php?view=perfil">
                                <strong>Mis datos</strong>
                                <span>Actualiza tu información de contacto.</span>
                            </a>
                        </div>
                    </section>
                </div>

                <section class="dashboard-slots">
                    <div class="card-head">
                        <div>
                            <h2>Cupos disponibles</h2>
                            <p class="muted">Estos son algunos horarios que puedes reservar ahora.</p>
                        </div>
                        <a href="index.php?view=agendar">Ver todos</a>
                    </div>

                    <?php if ($slots === []): ?>
                        <div class="card empty-state">
                            <p>Por ahora no hay cupos disponibles.</p>
                            <a class="btn ghost" href="index.php?view=espera">Entrar a la lista de espera</a>
                        </div>
                    <?php else: ?>
                        <div class="slot-grid">
                            <?php foreach ($slots as $slot): ?>
                                <?= render_slot_card($slot) ?>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </section>
            <?php elseif ($roleKind === 'paciente' && $view === 'perfil'): ?>
                <section class="page-head">
                    <div>
                        <h1>Mi perfil</h1>
                        <p>Mantén actualizada tu información de contacto para que podamos comunicarnos contigo.</p>
                    </div>
                </section>

                <div class="grid-2">
                    <section class="card">
                        <h2>Tu cuenta</h2>
                        <dl class="data-list">
                            <dt>Documento</dt><dd><?= e($currentUser['tipo_documento'] ?? '') ?> <?= e($currentUser['numero_documento'] ?? '—') ?></dd>
                            <dt>Correo</dt><dd><?= e($currentUser['email'] ?? '—') ?></dd>
                            <dt>Estado</dt><dd><?= !empty($currentUser['is_active']) ? 'Cuenta activa' : 'Cuenta inactiva' ?></dd>
                        </dl>
                    </section>

                    <section class="card">
                        <h2>Tus datos personales</h2>
                        <dl class="data-list">
                            <dt>Nombres</dt><dd><?= e($profile['nombres'] ?? '—') ?></dd>
                            <dt>Apellidos</dt><dd><?= e($profile['apellidos'] ?? '—') ?></dd>
                            <dt>Fecha de nacimiento</dt><dd><?= e(format_date_es((string) ($profile['fecha_nacimiento'] ?? ''))) ?></dd>
                            <dt>Teléfono</dt><dd><?= e($profile['telefono'] ?? '—') ?></dd>
                            <dt>Dirección</dt><dd><?= e($profile['direccion'] ?? '—') ?></dd>
                        </dl>
                    </section>
                </div>

                <section class="card mb">
                    <h2>Actualizar mis datos</h2>
                    <form method="post" action="index.php" class="stack">
                        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                        <input type="hidden" name="action" value="perfil_update">
                        <div class="fields">
                            <label class="field">
                                <span>Nombres</span>
                                <input type="text" name="nombres" value="<?= e($profile['nombres'] ?? '') ?>" autocomplete="given-name">
                            </label>
                            <label class="field">
                                <span>Apellidos</span>
                                <input type="text" name="apellidos" value="<?= e($profile['apellidos'] ?? '') ?>" autocomplete="family-name">
                            </label>
                            <label class="field">
                                <span>Fecha de nacimiento</span>
                                <input type="date" name="fecha_nacimiento" value="<?= e($profile['fecha_nacimiento'] ?? '') ?>" autocomplete="bday">
                            </label>
                            <label class="field">
                                <span>Teléfono</span>
                                <input type="tel" name="telefono" value="<?= e($profile['telefono'] ?? '') ?>" autocomplete="tel" inputmode="tel">
                            </label>
                            <label class="field">
                                <span>Dirección</span>
                                <input type="text" name="direccion" value="<?= e($profile['direccion'] ?? '') ?>" autocomplete="street-address">
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn primary">Guardar datos personales</button>
                        </div>
                    </form>
                </section>

                <?= render_account_form() ?>
            <?php elseif ($roleKind === 'paciente' && $view === 'citas'): ?>
                <section class="page-head">
                    <div>
                        <h1>Mis citas</h1>
                        <p>Consulta tus próximas visitas y el historial de tus citas.</p>
                    </div>
                    <a class="btn primary" href="index.php?view=agendar">Agendar otra cita</a>
                </section>

                <?php if ($patientCitas === []): ?>
                    <div class="card empty-state">
                        <h2>Aún no tienes citas</h2>
                        <p>Busca un cupo disponible y agenda tu primera visita.</p>
                        <a class="btn primary" href="index.php?view=agendar">Buscar un cupo</a>
                    </div>
                <?php else: ?>
                    <section class="appointments-section">
                        <div class="card-head">
                            <div>
                                <h2>Próximas citas</h2>
                                <p class="muted">Las visitas que tienes reservadas.</p>
                            </div>
                            <span class="count-pill"><?= count($upcomingCitas) ?></span>
                        </div>

                        <?php if ($upcomingCitas === []): ?>
                            <div class="card empty-state">
                                <p>No tienes citas próximas.</p>
                                <a class="btn ghost" href="index.php?view=agendar">Agendar una cita</a>
                            </div>
                        <?php else: ?>
                            <div class="appointment-list">
                                <?php foreach ($upcomingCitas as $cita): ?>
                                    <?= render_cita_card($cita, 'citas', true) ?>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </section>

                    <?php if ($historyCitas !== []): ?>
                        <section class="appointments-section">
                            <div class="card-head">
                                <div>
                                    <h2>Historial</h2>
                                    <p class="muted">Citas anteriores o canceladas.</p>
                                </div>
                            </div>
                            <div class="appointment-list history-list">
                                <?php foreach ($historyCitas as $cita): ?>
                                    <?= render_cita_card($cita, 'citas', false) ?>
                                <?php endforeach; ?>
                            </div>
                        </section>
                    <?php endif; ?>
                <?php endif; ?>
            <?php elseif ($roleKind === 'paciente' && $view === 'agendar'): ?>
                <section class="page-head">
                    <div>
                        <h1>Encuentra tu próximo cupo</h1>
                        <p>Filtra por especialidad, médico o fecha. Reserva el horario que mejor te quede.</p>
                    </div>
                </section>

                <section class="card mb">
                    <h2>¿Qué estás buscando?</h2>
                    <form method="get" action="index.php" class="filters">
                        <input type="hidden" name="view" value="agendar">
                        <label class="field">
                            <span>Especialidad</span>
                            <select name="especialidad">
                                <option value="">Todas</option>
                                <?php foreach ($specialties as $specialty): ?>
                                    <option value="<?= e($specialty) ?>" <?= (string) ($_GET['especialidad'] ?? '') === $specialty ? 'selected' : '' ?>><?= e($specialty) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </label>
                        <label class="field">
                            <span>Médico</span>
                            <select name="id_medico">
                                <option value="">Cualquier médico</option>
                                <?php foreach ($doctors as $doctor): ?>
                                    <option value="<?= (int) $doctor['id'] ?>" <?= (string) ($_GET['id_medico'] ?? '') === (string) $doctor['id'] ? 'selected' : '' ?>>
                                        <?= e(trim((string) ($doctor['nombres'] ?? '') . ' ' . (string) ($doctor['apellidos'] ?? '')) . ' · ' . (string) ($doctor['especialidad'] ?? '')) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </label>
                        <label class="field">
                            <span>Desde</span>
                            <input type="date" name="fecha_inicio" value="<?= e($_GET['fecha_inicio'] ?? '') ?>" min="<?= e(date('Y-m-d')) ?>" autocomplete="off">
                        </label>
                        <label class="field">
                            <span>Hasta</span>
                            <input type="date" name="fecha_fin" value="<?= e($_GET['fecha_fin'] ?? '') ?>" min="<?= e(date('Y-m-d')) ?>" autocomplete="off">
                        </label>
                        <button type="submit" class="btn primary">Buscar cupos</button>
                    </form>
                </section>

                <div class="card-head slots-head">
                    <div>
                        <h2>Cupos disponibles</h2>
                        <p class="muted">
                            <?= $slots === [] ? 'No encontramos horarios con esos filtros.' : count($slots) . ' horario(s) disponible(s) para reservar.' ?>
                        </p>
                    </div>
                    <a class="btn ghost small" href="index.php?view=espera">No encontré cupo</a>
                </div>

                <?php if ($slots === []): ?>
                    <div class="card empty-state">
                        <h2>No hay cupos con esos filtros</h2>
                        <p>Prueba con otra especialidad, otro médico o un rango de fechas más amplio.</p>
                        <div class="empty-actions">
                            <a class="btn primary" href="index.php?view=agendar">Ver todos los cupos</a>
                            <a class="btn ghost" href="index.php?view=espera">Entrar a lista de espera</a>
                        </div>
                    </div>
                <?php else: ?>
                    <div class="slot-grid">
                        <?php foreach ($slots as $slot): ?>
                            <?= render_slot_card($slot) ?>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php elseif ($roleKind === 'paciente' && $view === 'espera'): ?>
                <section class="page-head">
                    <div>
                        <h1>Lista de espera</h1>
                        <p>Si no encuentras el horario que necesitas, déjanos tu solicitud y te avisaremos cuando se libere un cupo.</p>
                    </div>
                </section>

                <section class="card mb wait-help">
                    <h2>Cómo se asignan los cupos</h2>
                    <ol class="wait-steps">
                        <li><span>1</span><div><strong>Pides el cupo</strong><small>Elige un médico de referencia o acepta cualquier especialidad.</small></div></li>
                        <li><span>2</span><div><strong>Te avisamos</strong><small>Si hay un cupo compatible disponible, te lo ofrecemos de inmediato; si no, quedas en la cola FIFO.</small></div></li>
                        <li><span>3</span><div><strong>Confirmas</strong><small>Tienes hasta 48 horas o hasta la hora de la cita, lo que ocurra primero.</small></div></li>
                    </ol>
                    <p class="muted">La prioridad es el orden de llegada; no se usa la urgencia declarada. Si rechazas o dejas vencer la oferta, el cupo pasa al siguiente paciente.</p>
                </section>

                <section class="card mb">
                    <h2>Pedir un cupo</h2>
                    <p class="muted wait-intro">Elige un médico para limitar la búsqueda a su especialidad o deja la opción abierta para recibir cualquier cupo. La asignación es automática y por orden de llegada.</p>
                    <form method="post" action="index.php" class="filters">
                        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                        <input type="hidden" name="action" value="espera_create">
                        <label class="field">
                            <span>Médico de referencia (opcional)</span>
                            <select name="id_medico">
                                <option value="">Cualquier especialidad</option>
                                <?php foreach ($doctors as $doctor): ?>
                                    <option value="<?= (int) $doctor['id'] ?>">
                                        <?= e(trim((string) ($doctor['nombres'] ?? '') . ' ' . (string) ($doctor['apellidos'] ?? '')) . ' · ' . (string) ($doctor['especialidad'] ?? '')) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </label>
                        <button type="submit" class="btn primary">Solicitar cupo</button>
                    </form>
                </section>

                <div class="card-head">
                    <div>
                        <h2>Tus solicitudes</h2>
                        <p class="muted">Aquí verás si ya tienes un cupo disponible.</p>
                    </div>
                    <span class="count-pill"><?= count($waitlist) ?></span>
                </div>

                <?php if ($waitlist === []): ?>
                    <div class="card empty-state">
                        <h2>No tienes solicitudes activas</h2>
                        <p>Cuando pidas un cupo, aparecerá aquí con su estado.</p>
                        <a class="btn ghost" href="index.php?view=agendar">Buscar cupos disponibles</a>
                    </div>
                <?php else: ?>
                    <div class="wait-grid">
                        <?php foreach ($waitlist as $entry): ?>
                            <?= render_wait_card($entry) ?>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php elseif ($roleKind === 'medico' && $view === 'perfil'): ?>
                <section class="page-head">
                    <div>
                        <h1>Mi perfil</h1>
                        <p>Consulta y actualiza tus datos profesionales y de contacto.</p>
                    </div>
                </section>

                <div class="grid-2">
                    <section class="card">
                        <h2>Datos de la cuenta</h2>
                        <dl class="data-list">
                            <dt>Documento</dt><dd><?= e($currentUser['tipo_documento'] ?? '') ?> <?= e($currentUser['numero_documento'] ?? '—') ?></dd>
                            <dt>Correo</dt><dd><?= e($currentUser['email'] ?? '—') ?></dd>
                            <dt>Estado</dt><dd><?= !empty($currentUser['is_active']) ? 'Cuenta activa' : 'Cuenta inactiva' ?></dd>
                        </dl>
                    </section>

                    <section class="card">
                        <h2>Datos profesionales</h2>
                        <dl class="data-list">
                            <dt>Nombres</dt><dd><?= e($profile['nombres'] ?? '—') ?></dd>
                            <dt>Apellidos</dt><dd><?= e($profile['apellidos'] ?? '—') ?></dd>
                            <dt>Teléfono</dt><dd><?= e($profile['telefono'] ?? '—') ?></dd>
                            <dt>Tarjeta profesional</dt><dd><?= e($profile['tarjeta_profesional'] ?? '—') ?></dd>
                            <dt>Especialidad</dt><dd><?= e($profile['especialidad'] ?? '—') ?></dd>
                            <dt>Consultorio</dt><dd><?= e($profile['consultorio'] ?? '—') ?></dd>
                        </dl>
                    </section>
                </div>

                <section class="card mb">
                    <h2>Actualizar datos profesionales</h2>
                    <form method="post" action="index.php" class="stack">
                        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                        <input type="hidden" name="action" value="perfil_update">
                        <div class="fields">
                            <label class="field">
                                <span>Nombres</span>
                                <input type="text" name="nombres" value="<?= e($profile['nombres'] ?? '') ?>" autocomplete="given-name">
                            </label>
                            <label class="field">
                                <span>Apellidos</span>
                                <input type="text" name="apellidos" value="<?= e($profile['apellidos'] ?? '') ?>" autocomplete="family-name">
                            </label>
                            <label class="field">
                                <span>Teléfono</span>
                                <input type="tel" name="telefono" value="<?= e($profile['telefono'] ?? '') ?>" autocomplete="tel" inputmode="tel">
                            </label>
                            <label class="field">
                                <span>Tarjeta profesional</span>
                                <input type="text" name="tarjeta_profesional" value="<?= e($profile['tarjeta_profesional'] ?? '') ?>" autocomplete="off" spellcheck="false">
                            </label>
                            <label class="field">
                                <span>Especialidad</span>
                                <input type="text" name="especialidad" value="<?= e($profile['especialidad'] ?? '') ?>" autocomplete="off">
                            </label>
                            <label class="field">
                                <span>Consultorio</span>
                                <input type="text" name="consultorio" value="<?= e($profile['consultorio'] ?? '') ?>" autocomplete="off">
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn primary">Guardar datos profesionales</button>
                        </div>
                    </form>
                </section>

                <?= render_account_form() ?>
            <?php elseif ($roleKind === 'medico' && $view === 'agenda'): ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1>Mi agenda</h1>
                        <p>Define los días y horas en que atiendes. Después podrás generar los cupos para tus pacientes.</p>
                    </div>
                    <a class="btn ghost" href="index.php?view=jornada">Ver mi jornada</a>
                </section>

                <details class="card form-drawer" <?= $agendas === [] ? 'open' : '' ?>>
                    <summary>Crear un horario de atención</summary>
                    <form method="post" action="index.php" class="stack">
                        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                        <input type="hidden" name="action" value="agenda_create">
                        <div class="fields">
                            <label class="field"><span>Primer día</span><input type="date" name="fecha_inicio" min="<?= e(date('Y-m-d')) ?>" autocomplete="off" required></label>
                            <label class="field"><span>Último día</span><input type="date" name="fecha_fin" min="<?= e(date('Y-m-d')) ?>" autocomplete="off" required></label>
                            <label class="field"><span>Duración de cada cita (minutos)</span><input type="number" name="duracion_cita" min="5" step="5" value="30" autocomplete="off" required></label>
                            <label class="field"><span>Atención desde</span><input type="time" name="hora_inicio" autocomplete="off" required></label>
                            <label class="field"><span>Atención hasta</span><input type="time" name="hora_fin" autocomplete="off" required></label>
                        </div>
                        <div class="form-actions"><button type="submit" class="btn primary">Crear horario</button></div>
                    </form>
                </details>

                <div class="card-head">
                    <div>
                        <h2>Mis horarios</h2>
                        <p class="muted">Genera los cupos cuando el horario esté listo.</p>
                    </div>
                    <span class="count-pill"><?= count($agendas) ?></span>
                </div>

                <?php if ($agendas === []): ?>
                    <div class="card empty-state">
                        <h2>Aún no tienes horarios</h2>
                        <p>Crea tu primer horario de atención para que los pacientes puedan reservar.</p>
                    </div>
                <?php else: ?>
                    <div class="agenda-grid">
                        <?php foreach ($agendas as $agenda): ?>
                            <?= render_agenda_card($agenda, false) ?>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php elseif ($roleKind === 'medico' && in_array($view, ['citas', 'jornada'], true)): ?>
                <section class="page-head dashboard-head">
                    <div>
                        <h1><?= $view === 'jornada' ? 'Mi jornada' : 'Mis citas' ?></h1>
                        <p><?= $view === 'jornada' ? 'Las citas programadas para la fecha que elijas.' : 'Consulta tus citas y registra la asistencia de tus pacientes.' ?></p>
                    </div>
                    <a class="btn ghost" href="index.php?view=agenda">Organizar mi agenda</a>
                </section>

                <?php if ($view === 'jornada'): ?>
                    <section class="stats">
                        <article class="stat-card">
                            <span>Citas del día</span>
                            <strong><?= $medicoJornadaStats['total'] ?></strong>
                            <small><?= e(format_date_es($jornadaDate)) ?></small>
                        </article>
                        <article class="stat-card">
                            <span>Por atender</span>
                            <strong><?= $medicoJornadaStats['pendientes'] ?></strong>
                            <small>Pendientes o confirmadas.</small>
                        </article>
                        <article class="stat-card">
                            <span>Atendidas</span>
                            <strong><?= $medicoJornadaStats['atendidas'] ?></strong>
                            <small>Consultas completadas.</small>
                        </article>
                        <article class="stat-card">
                            <span>No asistieron</span>
                            <strong><?= $medicoJornadaStats['no_asistio'] ?></strong>
                            <small>Pacientes que no llegaron.</small>
                        </article>
                    </section>
                <?php endif; ?>

                <section class="card mb">
                    <form method="get" action="index.php" class="filters">
                        <input type="hidden" name="view" value="<?= e($view) ?>">
                        <?php if ($view === 'jornada'): ?>
                            <label class="field">
                                <span>Fecha de la jornada</span>
                                <input type="date" name="fecha" value="<?= e($jornadaDate) ?>" autocomplete="off" required>
                            </label>
                            <button type="submit" class="btn primary">Ver jornada</button>
                            <a class="btn ghost" href="index.php?view=jornada&fecha=<?= e(date('Y-m-d')) ?>">Hoy</a>
                        <?php else: ?>
                            <label class="field">
                                <span>Estado</span>
                                <select name="estado">
                                    <option value="">Todos</option>
                                    <?php foreach (['pendiente', 'confirmada', 'atendida', 'cancelada', 'no_asistio'] as $state): ?>
                                        <option value="<?= e($state) ?>" <?= (string) ($_GET['estado'] ?? '') === $state ? 'selected' : '' ?>><?= e(state_label($state)) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </label>
                            <label class="field"><span>Fecha</span><input type="date" name="fecha" value="<?= e($_GET['fecha'] ?? '') ?>" autocomplete="off"></label>
                            <button type="submit" class="btn primary">Consultar</button>
                            <a class="btn ghost" href="index.php?view=citas">Limpiar filtros</a>
                        <?php endif; ?>
                    </form>
                </section>

                <?php $citasList = $view === 'jornada' ? $jornada : $doctorCitas; ?>
                <div class="card-head">
                    <div>
                        <h2><?= $view === 'jornada' ? 'Citas de la jornada' : 'Citas encontradas' ?></h2>
                        <p class="muted"><?= count($citasList) ?> cita(s) para mostrar.</p>
                    </div>
                    <span class="count-pill"><?= count($citasList) ?></span>
                </div>

                <?php if ($citasList === []): ?>
                    <div class="card empty-state">
                        <h2>No hay citas para mostrar</h2>
                        <p><?= $view === 'jornada' ? 'No tienes citas programadas para esta fecha.' : 'Prueba con otro estado o fecha.' ?></p>
                    </div>
                <?php else: ?>
                    <div class="appointment-list">
                        <?php foreach ($citasList as $cita): ?>
                            <?= render_clinical_cita_card($cita, $view, true, false) ?>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php else: ?>
                <?php
                $accountRoleLabel = role_kind_label($roleKind);
                ?>
                <section class="page-head">
                    <div>
                        <h1>Mi cuenta</h1>
                        <p>Consulta tus datos de acceso y actualiza tu correo o contraseña.</p>
                    </div>
                </section>

                <section class="card mb">
                    <h2>Datos de la cuenta</h2>
                    <dl class="data-list">
                        <dt>Documento</dt><dd><?= e($currentUser['tipo_documento'] ?? '') ?> <?= e($currentUser['numero_documento'] ?? '—') ?></dd>
                        <dt>Correo</dt><dd><?= e($currentUser['email'] ?? '—') ?></dd>
                        <dt>Tipo de cuenta</dt><dd><?= e($accountRoleLabel) ?></dd>
                        <dt>Estado</dt><dd><?= !empty($currentUser['is_active']) ? 'Cuenta activa' : 'Cuenta inactiva' ?></dd>
                    </dl>
                    <?php if ($roleKind === 'otro'): ?>
                        <p class="help" style="margin-top: 12px;">Tu cuenta no tiene acceso al agendamiento en línea. Comunícate con la clínica si necesitas agendar una cita.</p>
                    <?php endif; ?>
                </section>

                <?= render_account_form() ?>
            <?php endif; ?>
        </main>
    </div>
<?php endif; ?>
</body>
</html>
