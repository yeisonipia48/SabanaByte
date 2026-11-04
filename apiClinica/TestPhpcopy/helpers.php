<?php

declare(strict_types=1);

function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    return (string) $_SESSION['csrf'];
}

function verify_csrf(): void
{
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals((string) ($_SESSION['csrf'] ?? ''), $sent)) {
        http_response_code(403);
        exit('Solicitud inválida (CSRF).');
    }
}

function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

function old(array $data, string $key): string
{
    return e($data[$key] ?? '');
}

function pretty_json(mixed $data): string
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    return $json === false ? 'null' : $json;
}

function api_error(array $response): string
{
    if (($response['status'] ?? 0) === 0) {
        return (string) ($response['error'] ?? 'No se pudo conectar con la API.');
    }

    $detail = $response['data']['detail'] ?? $response['data'] ?? 'Error desconocido';

    if (is_array($detail)) {
        $parts = [];
        foreach ($detail as $item) {
            if (is_array($item)) {
                $location = isset($item['loc']) && is_array($item['loc'])
                    ? implode('.', array_map('strval', $item['loc']))
                    : '';
                $message = (string) ($item['msg'] ?? json_encode($item, JSON_UNESCAPED_UNICODE));
                $parts[] = $location !== '' ? $location . ': ' . $message : $message;
            } else {
                $parts[] = (string) $item;
            }
        }
        $detail = implode(' | ', $parts);
    }

    return is_string($detail) ? $detail : pretty_json($detail);
}

function friendly_error(array $response, string $fallback = 'No pudimos completar la solicitud. Intenta de nuevo.'): string
{
    if (($response['status'] ?? 0) === 0) {
        return 'No pudimos conectar con el servicio. Revisa tu conexión e intenta de nuevo.';
    }

    if (($response['status'] ?? 0) === 422) {
        return 'Revisa los datos ingresados e intenta de nuevo.';
    }

    if (($response['status'] ?? 0) >= 500) {
        return 'Tuvimos un problema temporal. Intenta de nuevo en unos minutos.';
    }

    $message = api_error($response);
    $translations = [
        'duplicate key' => 'Ya existe una cuenta con ese documento o correo.',
        'llave duplicada' => 'Ya existe una cuenta con ese documento o correo.',
        'usuarios_numero_documento_key' => 'Ya existe una cuenta con ese documento.',
        'usuarios_email_key' => 'Ya existe una cuenta con ese correo electrónico.',
        'El usuario con el documento no existe' => 'No encontramos una cuenta con ese documento.',
        'No existe usuario con id' => 'No encontramos tu cuenta. Cierra sesión e ingresa de nuevo.',
        'El cupo ya no está disponible' => 'Ese cupo ya fue tomado. Elige otro horario.',
        'El cupo fue reservado por otro usuario' => 'Ese cupo acaba de ser tomado. Elige otro horario.',
        'La agenda del cupo no está activa' => 'Ese horario ya no está disponible.',
        'El cupo seleccionado ya pasó' => 'Ese horario ya pasó. Elige uno nuevo.',
        'El paciente ya tiene una cita activa para esa fecha' => 'Ya tienes una cita activa para ese día.',
        'El paciente ya tiene una solicitud activa en lista de espera' => 'Ya tienes una solicitud activa en la lista de espera.',
        'La solicitud no tiene una oferta activa' => 'Esa oferta ya no está disponible.',
        'La oferta expiró' => 'La oferta expiró. Puedes volver a intentarlo.',
        'No existe cita con id' => 'No encontramos esa cita.',
        'No existe entrada en lista de espera' => 'No encontramos esa solicitud.',
        'No existe paciente con id' => 'No encontramos tu perfil de paciente.',
    ];

    foreach ($translations as $needle => $translation) {
        if (str_contains($message, $needle)) {
            return $translation;
        }
    }

    return $message !== '' ? $message : $fallback;
}

function flash(string $type, string $message, array $extra = []): void
{
    $_SESSION['flash'] = array_merge(
        ['type' => $type, 'message' => $message],
        $extra
    );
}

function take_flash(): ?array
{
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);

    return is_array($flash) ? $flash : null;
}

function normalize_role(string $role): string
{
    $value = strtolower(trim($role));
    $value = strtr($value, [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
        'ü' => 'u', 'ñ' => 'n',
    ]);

    if ($value === '') {
        return 'otro';
    }

    if (str_contains($value, 'admin')) {
        return 'admin';
    }

    if (str_contains($value, 'medic')) {
        return 'medico';
    }

    if (str_contains($value, 'pacient')) {
        return 'paciente';
    }

    return 'otro';
}

function role_kind_label(string $kind): string
{
    return match ($kind) {
        'admin' => 'Administrador',
        'medico' => 'Médico',
        'paciente' => 'Paciente',
        default => 'Usuario',
    };
}

/**
 * @return array{0: bool, 1: string|null, 2: array<string, mixed>|null}
 */
function attempt_login(ApiClient $api, string $document, string $password): array
{
    $response = $api->request('POST', '/auth/login', [
        'numero_documento' => $document,
        'password' => $password,
    ]);

    if (($response['status'] ?? 0) === 0) {
        return [false, friendly_error($response), null];
    }

    if (!$response['ok']) {
        return [false, friendly_error($response), null];
    }

    if ($response['data'] !== true) {
        return [false, 'Documento o contraseña incorrectos.', null];
    }

    $user = null;
    $users = $api->request('GET', '/usuarios');
    if ($users['ok'] && is_array($users['data'])) {
        foreach ($users['data'] as $candidate) {
            if (isset($candidate['numero_documento']) && (string) $candidate['numero_documento'] === $document) {
                $user = $candidate;
                break;
            }
        }
    }

    return [true, null, ['numero_documento' => $document, 'user' => $user]];
}

/**
 * Refresca los datos del usuario autenticado sin cerrar la sesión si la API falla.
 */
function refresh_user(ApiClient $api, array $auth): array
{
    $cached = is_array($auth['user'] ?? null) ? $auth['user'] : [];
    $id = (int) ($cached['id'] ?? 0);

    if ($id > 0) {
        $response = $api->request('GET', '/usuarios/' . $id);
        if ($response['ok'] && is_array($response['data'])) {
            return $response['data'];
        }
    }

    $document = (string) ($auth['numero_documento'] ?? ($cached['numero_documento'] ?? ''));
    if ($document !== '') {
        $response = $api->request('GET', '/usuarios');
        if ($response['ok'] && is_array($response['data'])) {
            foreach ($response['data'] as $candidate) {
                if ((string) ($candidate['numero_documento'] ?? '') === $document) {
                    return $candidate;
                }
            }
        }
    }

    return $cached;
}

function load_profile(ApiClient $api, array $user, string $kind): ?array
{
    if (!in_array($kind, ['paciente', 'medico'], true)) {
        return null;
    }

    $id = (int) ($user['id'] ?? 0);
    if ($id <= 0) {
        return null;
    }

    $path = $kind === 'medico' ? '/medicos' : '/pacientes';
    $response = $api->request('GET', $path);
    if (!$response['ok'] || !is_array($response['data'])) {
        return null;
    }

    foreach ($response['data'] as $profile) {
        if ((int) ($profile['id_usuario'] ?? 0) === $id) {
            return $profile;
        }
    }

    return null;
}

function fetch_cita(ApiClient $api, int $idCita): ?array
{
    $response = $api->request('GET', '/citas/' . $idCita);
    if ($response['ok'] && is_array($response['data'])) {
        return $response['data'];
    }

    return null;
}

function agenda_belongs_to_medico(ApiClient $api, int $idAgenda, int $idMedico): bool
{
    $response = $api->request('GET', '/agenda/' . $idMedico);
    if (!$response['ok'] || !is_array($response['data'])) {
        return false;
    }

    foreach ($response['data'] as $agenda) {
        if ((int) ($agenda['id'] ?? 0) === $idAgenda) {
            return true;
        }
    }

    return false;
}

function state_badge(string $state): string
{
    $class = strtolower((string) preg_replace('/[^a-zA-Z0-9_]/', '', $state));

    return '<span class="badge ' . e($class) . '">' . e($state) . '</span>';
}

function state_label(string $state): string
{
    return match ($state) {
        'pendiente' => 'Pendiente',
        'confirmada' => 'Confirmada',
        'atendida' => 'Atendida',
        'cancelada' => 'Cancelada',
        'no_asistio' => 'No asistió',
        'ofrecida' => 'Cupo ofrecido',
        'aceptada' => 'Aceptada',
        'rechazada' => 'Rechazada',
        'expirada' => 'Expirada',
        'activo' => 'Activa',
        'inactivo' => 'Inactiva',
        'disponible' => 'Disponible',
        'reservado' => 'Reservado',
        'ocupado' => 'Ocupado',
        default => ucfirst(str_replace('_', ' ', $state)),
    };
}

function state_badge_label(string $state): string
{
    $class = strtolower((string) preg_replace('/[^a-zA-Z0-9_]/', '', $state));

    return '<span class="badge ' . e($class) . '">' . e(state_label($state)) . '</span>';
}

function nav_link(string $href, string $label, string $targetView, string $currentView): string
{
    $active = $targetView === $currentView;

    return '<a href="' . e($href) . '"'
        . ($active ? ' class="active" aria-current="page"' : '')
        . '><span>' . e($label) . '</span></a>';
}

function format_date_es(?string $date): string
{
    if ($date === null || $date === '') {
        return '—';
    }

    $timestamp = strtotime($date);
    if ($timestamp === false) {
        return $date;
    }

    $months = [
        1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril',
        5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto',
        9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
    ];

    return (int) date('j', $timestamp) . ' de ' . $months[(int) date('n', $timestamp)] . ' de ' . date('Y', $timestamp);
}

function format_time_es(?string $time): string
{
    if ($time === null || $time === '') {
        return '—';
    }

    $normalized = trim($time);
    $timestamp = strtotime($normalized);
    if ($timestamp === false) {
        $timestamp = strtotime('1970-01-01 ' . $normalized);
    }
    if ($timestamp === false) {
        return $normalized;
    }

    return date('h:i A', $timestamp);
}

function format_month_short_es(?string $date): string
{
    if ($date === null || $date === '') {
        return '';
    }

    $timestamp = strtotime($date);
    if ($timestamp === false) {
        return '';
    }

    $months = [
        1 => 'ene', 2 => 'feb', 3 => 'mar', 4 => 'abr',
        5 => 'may', 6 => 'jun', 7 => 'jul', 8 => 'ago',
        9 => 'sep', 10 => 'oct', 11 => 'nov', 12 => 'dic',
    ];

    return $months[(int) date('n', $timestamp)];
}

function format_datetime_es(?string $datetime): string
{
    if ($datetime === null || $datetime === '') {
        return '—';
    }

    $timestamp = strtotime($datetime);
    if ($timestamp === false) {
        return $datetime;
    }

    return format_date_es(date('Y-m-d', $timestamp)) . ' a las ' . date('h:i A', $timestamp);
}

/**
 * @param array<string, mixed> $cita
 */
function cita_start_timestamp(array $cita): ?int
{
    $date = (string) ($cita['fecha_cupo'] ?? '');
    if ($date === '') {
        return null;
    }

    $time = (string) ($cita['hora_cupo'] ?? '00:00:00');
    $timestamp = strtotime($date . ' ' . $time);

    return $timestamp === false ? null : $timestamp;
}

/**
 * @param array<int, array<string, mixed>> $citas
 * @return array<string, mixed>|null
 */
function next_cita(array $citas): ?array
{
    $now = time();
    $next = null;
    $nextTimestamp = null;

    foreach ($citas as $cita) {
        $state = (string) ($cita['estado'] ?? '');
        if (!in_array($state, ['pendiente', 'confirmada'], true)) {
            continue;
        }

        $timestamp = cita_start_timestamp($cita);
        if ($timestamp === null || $timestamp < $now) {
            continue;
        }

        if ($nextTimestamp === null || $timestamp < $nextTimestamp) {
            $next = $cita;
            $nextTimestamp = $timestamp;
        }
    }

    return $next;
}

/**
 * @param array<int, array<string, mixed>> $entries
 * @return array<string, mixed>|null
 */
function pending_offer(array $entries): ?array
{
    $now = time();
    foreach ($entries as $entry) {
        if ((string) ($entry['estado'] ?? '') !== 'ofrecida') {
            continue;
        }

        $expires = (string) ($entry['fecha_expiracion'] ?? '');
        if ($expires !== '') {
            $timestamp = strtotime($expires);
            if ($timestamp !== false && $timestamp <= $now) {
                continue;
            }
        }

        return $entry;
    }

    return null;
}

/**
 * @param array<string, mixed> $groups
 * @return array<string, mixed>|null
 */
function find_endpoint(array $groups, string $endpointId): ?array
{
    foreach ($groups as $groupKey => $group) {
        foreach ($group['items'] as $item) {
            if ($item['id'] === $endpointId) {
                return $item + ['group' => $groupKey];
            }
        }
    }

    return null;
}

/**
 * @param array<string, mixed> $endpoint
 * @param array<string, mixed> $input
 * @return array{0: string, 1: array<string, mixed>, 2: array<string, mixed>|null}
 */
function build_request(array $endpoint, array $input): array
{
    $path = (string) $endpoint['path'];

    foreach ($endpoint['params'] ?? [] as $name => $definition) {
        $value = trim((string) ($input['p_' . $name] ?? ''));
        $path = str_replace('{' . $name . '}', rawurlencode($value), $path);
    }

    $query = [];
    foreach ($endpoint['query'] ?? [] as $name => $definition) {
        $value = trim((string) ($input['q_' . $name] ?? ''));
        if ($value !== '') {
            $query[$name] = $value;
        }
    }

    $body = null;
    if (($endpoint['body'] ?? []) !== []) {
        $body = [];
        foreach ($endpoint['body'] as $name => $definition) {
            $raw = $input['b_' . $name] ?? null;
            if ($raw === null) {
                continue;
            }

            $value = trim((string) $raw);
            if ($value === '') {
                continue;
            }

            $type = (string) ($definition['type'] ?? 'text');
            if ($type === 'number') {
                $value = (int) $value;
            } elseif ($type === 'select' && in_array($value, ['true', 'false'], true)) {
                $value = $value === 'true';
            }

            $body[$name] = $value;
        }
    }

    return [$path, $query, $body];
}

function field_html(string $endpointId, string $scope, string $name, array $definition): string
{
    $id = 'f-' . $endpointId . '-' . $scope . '-' . $name;
    $label = (string) ($definition['label'] ?? $name);
    $type = (string) ($definition['type'] ?? 'text');
    $required = !empty($definition['required']);
    $requiredAttribute = $required ? ' required' : '';
    $placeholder = isset($definition['placeholder'])
        ? ' placeholder="' . e($definition['placeholder']) . '"'
        : '';
    $help = isset($definition['help'])
        ? '<small class="help">' . e($definition['help']) . '</small>'
        : '';
    $inputName = $scope . '_' . $name;

    if ($type === 'select') {
        $emptyLabel = (string) ($definition['empty'] ?? ($required ? 'Seleccione…' : 'Sin cambios'));
        $options = '<option value="">' . e($emptyLabel) . '</option>';
        foreach (($definition['options'] ?? []) as $value => $text) {
            $options .= '<option value="' . e($value) . '">' . e($text) . '</option>';
        }

        return '<label class="field" for="' . e($id) . '">'
            . '<span>' . e($label) . '</span>'
            . '<select id="' . e($id) . '" name="' . e($inputName) . '"' . $requiredAttribute . '>'
            . $options
            . '</select>' . $help . '</label>';
    }

    if ($type === 'textarea') {
        return '<label class="field field-wide" for="' . e($id) . '">'
            . '<span>' . e($label) . '</span>'
            . '<textarea id="' . e($id) . '" name="' . e($inputName) . '" rows="3"' . $requiredAttribute . '></textarea>'
            . $help . '</label>';
    }

    return '<label class="field" for="' . e($id) . '">'
        . '<span>' . e($label) . '</span>'
        . '<input id="' . e($id) . '" type="' . e($type) . '" name="' . e($inputName) . '"'
        . $placeholder . $requiredAttribute . '>'
        . $help . '</label>';
}

function field_set(string $title, array $fields, string $scope, string $endpointId): string
{
    if ($fields === []) {
        return '';
    }

    $html = '<fieldset><legend>' . e($title) . '</legend><div class="fields">';
    foreach ($fields as $name => $definition) {
        $html .= field_html($endpointId, $scope, (string) $name, $definition);
    }

    return $html . '</div></fieldset>';
}

function render_endpoint_form(array $endpoint, ?string $openId): string
{
    $anchor = 'ep-' . preg_replace('/[^a-zA-Z0-9_-]/', '-', (string) $endpoint['id']);
    $methodClass = 'm-' . strtolower((string) $endpoint['method']);
    $isOpen = $openId !== null && $openId === $endpoint['id'];
    $hasFields = ($endpoint['params'] ?? []) !== []
        || ($endpoint['query'] ?? []) !== []
        || ($endpoint['body'] ?? []) !== [];

    $html = '<details class="endpoint" id="' . e($anchor) . '"' . ($isOpen ? ' open' : '') . '>';
    $html .= '<summary>'
        . '<span class="method ' . e($methodClass) . '">' . e($endpoint['method']) . '</span>'
        . '<span class="ep-label">' . e($endpoint['label']) . '</span>'
        . '<code class="ep-path">' . e($endpoint['path']) . '</code>'
        . '</summary>';

    $html .= '<div class="endpoint-body">';
    $html .= '<p class="endpoint-desc">' . e($endpoint['description'] ?? '') . '</p>';

    if (!$hasFields) {
        $html .= '<p class="no-fields">Este endpoint no requiere datos adicionales.</p>';
    }

    $html .= '<form method="post" action="index.php">'
        . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
        . '<input type="hidden" name="action" value="run">'
        . '<input type="hidden" name="endpoint" value="' . e($endpoint['id']) . '">';

    $html .= field_set('Parámetros de ruta', $endpoint['params'] ?? [], 'p', (string) $endpoint['id']);
    $html .= field_set('Filtros de consulta (query)', $endpoint['query'] ?? [], 'q', (string) $endpoint['id']);
    $html .= field_set('Cuerpo de la petición (JSON)', $endpoint['body'] ?? [], 'b', (string) $endpoint['id']);

    $html .= '<div class="form-actions">'
        . '<button type="submit" class="btn primary">Ejecutar ' . e($endpoint['method']) . '</button>'
        . '<code class="muted">' . e($endpoint['method'] . ' ' . $endpoint['path']) . '</code>'
        . '</div>';

    return $html . '</form></div></details>';
}

/**
 * @param array<string, mixed> $slot
 */
function render_slot_card(array $slot): string
{
    $date = (string) ($slot['fecha_cupo'] ?? '');
    $timestamp = $date !== '' ? strtotime($date) : false;
    $day = $timestamp !== false ? date('d', $timestamp) : '';
    $month = format_month_short_es($date);
    $doctor = trim((string) ($slot['medico'] ?? 'Médico'));
    $specialty = trim((string) ($slot['especialidad'] ?? ''));
    $office = trim((string) ($slot['consultorio'] ?? ''));
    $duration = (int) ($slot['duracion_cita'] ?? 0);

    $html = '<article class="slot-card">';
    $html .= '<div class="slot-date">'
        . '<strong>' . e($day !== '' ? $day : '--') . '</strong>'
        . '<span>' . e($month !== '' ? $month : '') . '</span>'
        . '</div>';
    $html .= '<div class="slot-main">'
        . '<div class="slot-time">' . e(format_time_es((string) ($slot['hora_cupo'] ?? '')))
        . ($duration > 0 ? ' <small>' . $duration . ' min</small>' : '') . '</div>'
        . '<p class="slot-doctor">' . e($doctor) . '</p>'
        . '<p class="slot-meta">' . e($specialty !== '' ? $specialty : 'Consulta médica')
        . ($office !== '' ? ' · ' . e($office) : '') . '</p>'
        . '<p class="slot-date-text">' . e(format_date_es($date)) . '</p>'
        . '</div>';

    $html .= '<form method="post" action="index.php" class="slot-form">'
        . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
        . '<input type="hidden" name="action" value="book">'
        . '<input type="hidden" name="id_cupo" value="' . (int) ($slot['id_cupo'] ?? 0) . '">'
        . '<label class="sr-only" for="motivo-' . (int) ($slot['id_cupo'] ?? 0) . '">Motivo de consulta</label>'
        . '<input id="motivo-' . (int) ($slot['id_cupo'] ?? 0) . '" type="text" name="motivo_consulta" placeholder="Motivo (opcional)…" autocomplete="off">'
        . '<button type="submit" class="btn primary">Reservar</button>'
        . '</form>';

    return $html . '</article>';
}

/**
 * @param array<string, mixed> $cita
 */
function render_cita_card(array $cita, string $back = 'citas', bool $showCancel = true): string
{
    $state = (string) ($cita['estado'] ?? '');
    $date = (string) ($cita['fecha_cupo'] ?? '');
    $timestamp = $date !== '' ? strtotime($date) : false;
    $day = $timestamp !== false ? date('d', $timestamp) : '';
    $month = format_month_short_es($date);
    $doctor = trim((string) ($cita['medico'] ?? 'Médico'));
    $specialty = trim((string) ($cita['especialidad'] ?? ''));
    $office = trim((string) ($cita['consultorio'] ?? ''));
    $reason = trim((string) ($cita['motivo_consulta'] ?? ''));
    $start = cita_start_timestamp($cita);
    $canCancel = $showCancel && in_array($state, ['pendiente', 'confirmada'], true)
        && ($start === null || $start >= time());

    $html = '<article class="appointment-card">';
    $html .= '<div class="appointment-date">'
        . '<strong>' . e($day !== '' ? $day : '--') . '</strong>'
        . '<span>' . e($month !== '' ? $month : '') . '</span>'
        . '</div>';
    $html .= '<div class="appointment-main">'
        . '<div class="appointment-head">'
        . '<strong class="appointment-time">' . e(format_time_es((string) ($cita['hora_cupo'] ?? ''))) . '</strong>'
        . state_badge_label($state !== '' ? $state : '—')
        . '</div>'
        . '<p class="appointment-doctor">' . e($doctor) . '</p>'
        . '<p class="appointment-meta">' . e($specialty !== '' ? $specialty : 'Consulta médica')
        . ($office !== '' ? ' · ' . e($office) : '') . '</p>'
        . '<p class="appointment-date-text">' . e(format_date_es($date)) . '</p>'
        . ($reason !== '' ? '<p class="appointment-reason"><span>Motivo:</span> ' . e($reason) . '</p>' : '');

    if ($canCancel) {
        $html .= '<form method="post" action="index.php" class="appointment-actions" onsubmit="return confirm(\'¿Cancelar esta cita?\');">'
            . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
            . '<input type="hidden" name="action" value="cancel_cita">'
            . '<input type="hidden" name="back" value="' . e($back) . '">'
            . '<input type="hidden" name="id_cita" value="' . (int) ($cita['id'] ?? 0) . '">'
            . '<button type="submit" class="btn danger small">Cancelar cita</button>'
            . '</form>';
    }

    return $html . '</div></article>';
}

/**
 * @param array<string, mixed> $entry
 */
function render_wait_card(array $entry, bool $showActions = true): string
{
    $state = (string) ($entry['estado'] ?? '');
    $doctor = trim((string) ($entry['medico'] ?? ''));
    $specialty = trim((string) ($entry['especialidad'] ?? ''));
    $offerDate = (string) ($entry['fecha_cupo'] ?? '');
    $offerTime = (string) ($entry['hora_cupo'] ?? '');
    $expires = (string) ($entry['fecha_expiracion'] ?? '');
    $offeredDoctor = trim((string) ($entry['medico_ofrecido'] ?? ''));
    $offeredSpecialty = trim((string) ($entry['especialidad_ofrecida'] ?? ''));
    $showOffered = in_array($state, ['ofrecida', 'aceptada'], true) && $offerDate !== '';
    $displayDoctor = $showOffered && $offeredDoctor !== '' ? $offeredDoctor : $doctor;
    $displaySpecialty = $showOffered && $offeredSpecialty !== '' ? $offeredSpecialty : $specialty;
    $id = (int) ($entry['id'] ?? 0);

    $html = '<article class="wait-card">'
        . '<div class="wait-head">'
        . '<div>'
        . '<p class="wait-kicker">Solicitud de cupo</p>'
        . '<h3>' . e($displayDoctor !== '' ? $displayDoctor : 'Cualquier médico disponible') . '</h3>'
        . ($displaySpecialty !== '' ? '<p class="wait-meta">' . e($displaySpecialty) . '</p>' : '')
        . '</div>'
        . state_badge_label($state !== '' ? $state : '—')
        . '</div>'
        . '<p class="wait-date">Solicitada el ' . e(format_datetime_es((string) ($entry['fecha_solicitud'] ?? ''))) . '</p>';

    if ($state === 'ofrecida' && $offerDate !== '') {
        $html .= '<div class="wait-offer">'
            . '<span>Cupo ofrecido</span>'
            . '<strong>' . e(format_date_es($offerDate)) . ' a las ' . e(format_time_es($offerTime)) . '</strong>'
            . ($expires !== '' ? '<small>Confirma antes del ' . e(format_datetime_es($expires)) . '.</small>' : '')
            . '<small>Asignado por orden de llegada y compatibilidad de especialidad.</small>'
            . '</div>';
    } elseif ($state === 'pendiente') {
        $html .= '<p class="wait-meta">En cola por orden de llegada. Te avisaremos cuando haya un cupo compatible.</p>';
    } elseif ($state === 'aceptada') {
        $html .= '<p class="wait-meta">Cupo confirmado. Revisa tu cita en la sección Citas.</p>';
    }

    if ($showActions) {
        $actions = '';
        if ($state === 'ofrecida') {
            $actions .= '<form method="post" action="index.php" class="inline-form">'
                . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
                . '<input type="hidden" name="action" value="espera_aceptar">'
                . '<input type="hidden" name="id_entrada" value="' . $id . '">'
                . '<button type="submit" class="btn primary small">Confirmar cupo</button>'
                . '</form>'
                . '<form method="post" action="index.php" class="inline-form" onsubmit="return confirm(\'¿Rechazar este cupo? Se ofrecerá al siguiente paciente.\');">'
                . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
                . '<input type="hidden" name="action" value="espera_rechazar">'
                . '<input type="hidden" name="id_entrada" value="' . $id . '">'
                . '<button type="submit" class="btn ghost small">Rechazar</button>'
                . '</form>';
        }
        if (in_array($state, ['pendiente', 'ofrecida'], true)) {
            $actions .= '<form method="post" action="index.php" class="inline-form" onsubmit="return confirm(\'¿Cancelar esta solicitud?\');">'
                . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
                . '<input type="hidden" name="action" value="espera_cancel">'
                . '<input type="hidden" name="id_entrada" value="' . $id . '">'
                . '<button type="submit" class="btn ghost small">Cancelar solicitud</button>'
                . '</form>';
        }
        if ($actions !== '') {
            $html .= '<div class="wait-actions">' . $actions . '</div>';
        }
    }

    return $html . '</article>';
}

/**
 * @param array<string, mixed> $cita
 */
function render_clinical_cita_card(array $cita, string $back = 'citas', bool $canManage = true, bool $showDoctor = true): string
{
    $state = (string) ($cita['estado'] ?? '');
    $date = (string) ($cita['fecha_cupo'] ?? '');
    $timestamp = $date !== '' ? strtotime($date) : false;
    $day = $timestamp !== false ? date('d', $timestamp) : '';
    $month = format_month_short_es($date);
    $patient = trim((string) ($cita['paciente'] ?? 'Paciente'));
    $document = trim((string) ($cita['numero_documento'] ?? ''));
    $email = trim((string) ($cita['email'] ?? ''));
    $doctor = trim((string) ($cita['medico'] ?? ''));
    $specialty = trim((string) ($cita['especialidad'] ?? ''));
    $office = trim((string) ($cita['consultorio'] ?? ''));
    $reason = trim((string) ($cita['motivo_consulta'] ?? ''));
    $canAct = $canManage && in_array($state, ['pendiente', 'confirmada'], true);

    $html = '<article class="appointment-card clinical-card">';
    $html .= '<div class="appointment-date">'
        . '<strong>' . e($day !== '' ? $day : '--') . '</strong>'
        . '<span>' . e($month !== '' ? $month : '') . '</span>'
        . '</div>';
    $html .= '<div class="appointment-main">';
    $html .= '<div class="appointment-head">'
        . '<strong class="appointment-time">' . e(format_time_es((string) ($cita['hora_cupo'] ?? ''))) . '</strong>'
        . state_badge_label($state !== '' ? $state : '—')
        . '</div>';
    $html .= '<p class="appointment-patient">' . e($patient) . '</p>';
    $contact = [];
    if ($document !== '') {
        $contact[] = 'Documento ' . $document;
    }
    if ($email !== '') {
        $contact[] = $email;
    }
    if ($contact !== []) {
        $html .= '<p class="appointment-meta">' . e(implode(' · ', $contact)) . '</p>';
    }
    if ($showDoctor && $doctor !== '') {
        $html .= '<p class="appointment-doctor">' . e($doctor) . '</p>';
        $html .= '<p class="appointment-meta">' . e($specialty !== '' ? $specialty : 'Consulta médica')
            . ($office !== '' ? ' · ' . e($office) : '') . '</p>';
    } elseif (!$showDoctor) {
        $html .= '<p class="appointment-meta">' . e($specialty !== '' ? $specialty : 'Consulta médica')
            . ($office !== '' ? ' · ' . e($office) : '') . '</p>';
    }
    $html .= '<p class="appointment-date-text">' . e(format_date_es($date)) . '</p>';
    if ($reason !== '') {
        $html .= '<p class="appointment-reason"><span>Motivo:</span> ' . e($reason) . '</p>';
    }

    if ($canAct) {
        $html .= '<div class="appointment-actions clinical-actions">';
        $html .= '<form method="post" action="index.php" class="inline-form attendance-form">'
            . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
            . '<input type="hidden" name="action" value="asistencia">'
            . '<input type="hidden" name="back" value="' . e($back) . '">'
            . '<input type="hidden" name="id_cita" value="' . (int) ($cita['id'] ?? 0) . '">'
            . '<label class="sr-only" for="estado-cita-' . (int) ($cita['id'] ?? 0) . '">Actualizar asistencia</label>'
            . '<select id="estado-cita-' . (int) ($cita['id'] ?? 0) . '" name="estado" required>'
            . '<option value="" selected disabled>Cambiar estado…</option>'
            . ($state === 'pendiente' ? '<option value="confirmada">Confirmar</option>' : '')
            . '<option value="atendida">Atendida</option>'
            . '<option value="no_asistio">No asistió</option>'
            . '</select>'
            . '<button type="submit" class="btn primary small">Guardar</button>'
            . '</form>';
        $html .= '<form method="post" action="index.php" class="inline-form" onsubmit="return confirm(\'¿Cancelar esta cita?\');">'
            . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
            . '<input type="hidden" name="action" value="cancel_cita">'
            . '<input type="hidden" name="back" value="' . e($back) . '">'
            . '<input type="hidden" name="id_cita" value="' . (int) ($cita['id'] ?? 0) . '">'
            . '<button type="submit" class="btn danger small">Cancelar cita</button>'
            . '</form>';
        $html .= '</div>';
    }

    return $html . '</div></article>';
}

/**
 * @param array<string, mixed> $agenda
 */
function render_agenda_card(array $agenda, bool $isAdmin = false, int $doctorId = 0): string
{
    $state = (string) ($agenda['estado'] ?? '');
    $startDate = (string) ($agenda['fecha_inicio'] ?? '');
    $endDate = (string) ($agenda['fecha_fin'] ?? '');
    $duration = (int) ($agenda['duracion_cita'] ?? 0);
    $id = (int) ($agenda['id'] ?? 0);
    $range = format_date_es($startDate);
    if ($endDate !== '' && $endDate !== $startDate) {
        $range .= ' al ' . format_date_es($endDate);
    }

    $html = '<article class="agenda-card">'
        . '<div class="agenda-head">'
        . '<div>'
        . '<h3>' . e($range) . '</h3>'
        . '<p>' . e(format_time_es((string) ($agenda['hora_inicio'] ?? ''))) . ' a '
        . e(format_time_es((string) ($agenda['hora_fin'] ?? '')))
        . ($duration > 0 ? ' · ' . $duration . ' minutos por cita' : '') . '</p>'
        . '</div>'
        . state_badge_label($state !== '' ? $state : '—')
        . '</div>'
        . '<div class="agenda-actions">'
        . '<form method="post" action="index.php" class="inline-form">'
        . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
        . '<input type="hidden" name="action" value="agenda_generar">'
        . '<input type="hidden" name="id_agenda" value="' . $id . '">'
        . ($isAdmin ? '<input type="hidden" name="id_medico" value="' . $doctorId . '">' : '')
        . '<button type="submit" class="btn primary small">Generar cupos</button>'
        . '</form>'
        . '<form method="post" action="index.php" class="inline-form">'
        . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
        . '<input type="hidden" name="action" value="agenda_estado">'
        . '<input type="hidden" name="id_agenda" value="' . $id . '">'
        . ($isAdmin ? '<input type="hidden" name="id_medico" value="' . $doctorId . '">' : '')
        . '<input type="hidden" name="estado" value="' . ($state === 'activo' ? 'inactivo' : 'activo') . '">'
        . '<button type="submit" class="btn ghost small">' . ($state === 'activo' ? 'Desactivar' : 'Activar') . '</button>'
        . '</form>'
        . '<form method="post" action="index.php" class="inline-form" onsubmit="return confirm(\'¿Eliminar este horario?\');">'
        . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
        . '<input type="hidden" name="action" value="agenda_eliminar">'
        . '<input type="hidden" name="id_agenda" value="' . $id . '">'
        . ($isAdmin ? '<input type="hidden" name="id_medico" value="' . $doctorId . '">' : '')
        . '<button type="submit" class="btn danger small">Eliminar</button>'
        . '</form>'
        . '</div></article>';

    return $html;
}

/**
 * @param array<string, mixed> $entry
 */
function render_admin_wait_card(array $entry): string
{
    $state = (string) ($entry['estado'] ?? '');
    $patient = trim((string) ($entry['paciente'] ?? 'Paciente'));
    $document = trim((string) ($entry['numero_documento'] ?? ''));
    $email = trim((string) ($entry['email'] ?? ''));
    $doctor = trim((string) ($entry['medico'] ?? ''));
    $specialty = trim((string) ($entry['especialidad'] ?? ''));
    $offerDate = (string) ($entry['fecha_cupo'] ?? '');
    $offerTime = (string) ($entry['hora_cupo'] ?? '');
    $expires = (string) ($entry['fecha_expiracion'] ?? '');
    $offeredDoctor = trim((string) ($entry['medico_ofrecido'] ?? ''));
    $offeredSpecialty = trim((string) ($entry['especialidad_ofrecida'] ?? ''));
    $id = (int) ($entry['id'] ?? 0);

    $html = '<article class="wait-card">'
        . '<div class="wait-head">'
        . '<div>'
        . '<p class="wait-kicker">Solicitud de cupo</p>'
        . '<h3>' . e($patient) . '</h3>'
        . '<p class="wait-meta">' . e($document !== '' ? 'Documento ' . $document : 'Paciente') . '</p>'
        . '</div>'
        . state_badge_label($state !== '' ? $state : '—')
        . '</div>'
        . ($email !== '' ? '<p class="wait-meta">' . e($email) . '</p>' : '')
        . '<p class="wait-date">Solicitada el ' . e(format_datetime_es((string) ($entry['fecha_solicitud'] ?? ''))) . '</p>'
        . '<p class="wait-meta">Prefiere: ' . e($doctor !== '' ? $doctor : 'cualquier médico')
        . ($specialty !== '' ? ' · ' . e($specialty) : '') . '</p>';

    if ($state === 'ofrecida' && $offerDate !== '') {
        $html .= '<div class="wait-offer">'
            . '<span>Cupo ofrecido</span>'
            . '<strong>' . e(format_date_es($offerDate)) . ' a las ' . e(format_time_es($offerTime)) . '</strong>'
            . ($offeredDoctor !== '' ? '<small>Con ' . e($offeredDoctor) . ($offeredSpecialty !== '' ? ' · ' . e($offeredSpecialty) : '') . '</small>' : '')
            . ($expires !== '' ? '<small>Responde antes del ' . e(format_datetime_es($expires)) . '</small>' : '')
            . '</div>';
    }

    if ($state === 'ofrecida') {
        $html .= '<p class="wait-meta">Esperando confirmación del paciente desde su portal.</p>';
    } elseif ($state === 'pendiente') {
        $html .= '<p class="wait-meta">En cola por orden de llegada.</p>';
    }

    if (in_array($state, ['pendiente', 'ofrecida'], true)) {
        $html .= '<div class="wait-actions">'
            . '<form method="post" action="index.php" class="inline-form" onsubmit="return confirm(\'¿Cancelar esta solicitud?\');">'
            . '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'
            . '<input type="hidden" name="action" value="admin_espera_cancel">'
            . '<input type="hidden" name="id_entrada" value="' . $id . '">'
            . '<button type="submit" class="btn ghost small">Cancelar solicitud</button>'
            . '</form></div>';
    }

    return $html . '</article>';
}

function render_account_form(): string
{
    $html = '<section class="card">';
    $html .= '<h2>Correo y contraseña</h2>';
    $html .= '<p class="help" style="margin-bottom: 12px;">Puedes cambiar tu correo o tu contraseña cuando lo necesites.</p>';
    $html .= '<form method="post" action="index.php" class="stack">';
    $html .= '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
    $html .= '<input type="hidden" name="action" value="cuenta_update">';
    $html .= '<div class="fields">';
    $html .= '<label class="field"><span>Nuevo correo electrónico</span><input type="email" name="email" placeholder="tucorreo@ejemplo.com" autocomplete="email" spellcheck="false"></label>';
    $html .= '<label class="field"><span>Nueva contraseña</span><input type="password" name="password" placeholder="Déjala vacía para no cambiarla" autocomplete="new-password"></label>';
    $html .= '</div>';
    $html .= '<div class="form-actions"><button type="submit" class="btn primary">Guardar cambios</button></div>';
    $html .= '</form></section>';

    return $html;
}
