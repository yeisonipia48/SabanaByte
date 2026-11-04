<?php

declare(strict_types=1);

/*
 * Catálogo de todos los endpoints de la API.
 *
 * params: segmentos de la ruta, ej. /usuarios/{id_usuario}
 * query:  filtros de la URL
 * body:   campos del cuerpo JSON
 */
return [
    'auth' => [
        'label' => 'Autenticación',
        'hint' => 'Login y registro. El registro crea el perfil de paciente o médico según el rol.',
        'items' => [
            [
                'id' => 'auth.login',
                'label' => 'Login',
                'method' => 'POST',
                'path' => '/auth/login',
                'description' => 'Valida el documento y la contraseña. Devuelve true o false.',
                'body' => [
                    'numero_documento' => ['label' => 'Número de documento', 'type' => 'text', 'required' => true],
                    'password' => ['label' => 'Contraseña', 'type' => 'password', 'required' => true],
                ],
            ],
            [
                'id' => 'auth.register',
                'label' => 'Registro',
                'method' => 'POST',
                'path' => '/auth/register',
                'description' => 'Crea el usuario y su perfil. Para paciente usa nombres, apellidos, fecha de nacimiento y teléfono; para médico usa además tarjeta, especialidad y consultorio.',
                'body' => [
                    'id_rol' => ['label' => 'ID del rol', 'type' => 'number', 'required' => true, 'help' => 'Consulta el ID en /roles.'],
                    'tipo_documento' => ['label' => 'Tipo de documento', 'type' => 'text', 'required' => true, 'placeholder' => 'CC, TI, CE...'],
                    'numero_documento' => ['label' => 'Número de documento', 'type' => 'text', 'required' => true],
                    'email' => ['label' => 'Email', 'type' => 'email', 'required' => true],
                    'password' => ['label' => 'Contraseña', 'type' => 'password', 'required' => true],
                    'nombres' => ['label' => 'Nombres', 'type' => 'text'],
                    'apellidos' => ['label' => 'Apellidos', 'type' => 'text'],
                    'fecha_nacimiento' => ['label' => 'Fecha de nacimiento', 'type' => 'date'],
                    'telefono' => ['label' => 'Teléfono', 'type' => 'text'],
                    'direccion' => ['label' => 'Dirección', 'type' => 'text'],
                    'tarjeta_profesional' => ['label' => 'Tarjeta profesional', 'type' => 'text'],
                    'especialidad' => ['label' => 'Especialidad', 'type' => 'text'],
                    'consultorio' => ['label' => 'Consultorio', 'type' => 'text'],
                ],
            ],
        ],
    ],

    'usuarios' => [
        'label' => 'Usuarios',
        'hint' => 'CRUD de usuarios y consulta de roles.',
        'items' => [
            [
                'id' => 'usuarios.list',
                'label' => 'Listar usuarios',
                'method' => 'GET',
                'path' => '/usuarios',
                'description' => 'Devuelve todos los usuarios con el nombre de su rol.',
            ],
            [
                'id' => 'usuarios.get',
                'label' => 'Obtener usuario',
                'method' => 'GET',
                'path' => '/usuarios/{id_usuario}',
                'description' => 'Consulta un usuario por su ID.',
                'params' => [
                    'id_usuario' => ['label' => 'ID del usuario', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'usuarios.create',
                'label' => 'Crear usuario',
                'method' => 'POST',
                'path' => '/usuarios',
                'description' => 'Crea solo el usuario (sin perfil de paciente/médico).',
                'body' => [
                    'id_rol' => ['label' => 'ID del rol', 'type' => 'number', 'required' => true],
                    'tipo_documento' => ['label' => 'Tipo de documento', 'type' => 'text', 'required' => true],
                    'numero_documento' => ['label' => 'Número de documento', 'type' => 'text', 'required' => true],
                    'email' => ['label' => 'Email', 'type' => 'email', 'required' => true],
                    'password' => ['label' => 'Contraseña', 'type' => 'password', 'required' => true],
                ],
            ],
            [
                'id' => 'usuarios.update',
                'label' => 'Actualizar usuario',
                'method' => 'PATCH',
                'path' => '/usuarios/{usuario_id}',
                'description' => 'Actualiza solo los campos diligenciados.',
                'params' => [
                    'usuario_id' => ['label' => 'ID del usuario', 'type' => 'number', 'required' => true],
                ],
                'body' => [
                    'id_rol' => ['label' => 'ID del rol', 'type' => 'number'],
                    'tipo_documento' => ['label' => 'Tipo de documento', 'type' => 'text'],
                    'numero_documento' => ['label' => 'Número de documento', 'type' => 'text'],
                    'email' => ['label' => 'Email', 'type' => 'email'],
                    'password' => ['label' => 'Nueva contraseña', 'type' => 'password'],
                    'is_active' => ['label' => 'Activo', 'type' => 'select', 'options' => ['true' => 'Sí', 'false' => 'No'], 'empty' => 'Sin cambios'],
                ],
            ],
            [
                'id' => 'usuarios.delete',
                'label' => 'Eliminar usuario',
                'method' => 'DELETE',
                'path' => '/usuarios/{usuario_id}',
                'description' => 'Elimina el usuario y su perfil asociado.',
                'params' => [
                    'usuario_id' => ['label' => 'ID del usuario', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'roles.list',
                'label' => 'Listar roles',
                'method' => 'GET',
                'path' => '/roles',
                'description' => 'Devuelve los roles disponibles.',
            ],
            [
                'id' => 'roles.create',
                'label' => 'Crear rol',
                'method' => 'POST',
                'path' => '/roles',
                'description' => 'Crea un rol nuevo, por ejemplo paciente o medico.',
                'body' => [
                    'rol' => ['label' => 'Nombre del rol', 'type' => 'text', 'required' => true],
                ],
            ],
        ],
    ],

    'pacientes' => [
        'label' => 'Pacientes',
        'hint' => 'CRUD de perfiles de pacientes.',
        'items' => [
            [
                'id' => 'pacientes.list',
                'label' => 'Listar pacientes',
                'method' => 'GET',
                'path' => '/pacientes',
                'description' => 'Devuelve todos los pacientes con sus datos de usuario.',
            ],
            [
                'id' => 'pacientes.get',
                'label' => 'Obtener paciente',
                'method' => 'GET',
                'path' => '/pacientes/{id_paciente}',
                'description' => 'Consulta un paciente por su ID.',
                'params' => [
                    'id_paciente' => ['label' => 'ID del paciente', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'pacientes.create',
                'label' => 'Crear paciente',
                'method' => 'POST',
                'path' => '/pacientes',
                'description' => 'Crea el perfil de un usuario que ya existe.',
                'body' => [
                    'id_usuario' => ['label' => 'ID del usuario', 'type' => 'number', 'required' => true],
                    'nombres' => ['label' => 'Nombres', 'type' => 'text', 'required' => true],
                    'apellidos' => ['label' => 'Apellidos', 'type' => 'text', 'required' => true],
                    'fecha_nacimiento' => ['label' => 'Fecha de nacimiento', 'type' => 'date', 'required' => true],
                    'telefono' => ['label' => 'Teléfono', 'type' => 'text', 'required' => true],
                    'direccion' => ['label' => 'Dirección', 'type' => 'text'],
                ],
            ],
            [
                'id' => 'pacientes.update',
                'label' => 'Actualizar paciente',
                'method' => 'PATCH',
                'path' => '/pacientes/{paciente_id}',
                'description' => 'Actualiza solo los campos diligenciados.',
                'params' => [
                    'paciente_id' => ['label' => 'ID del paciente', 'type' => 'number', 'required' => true],
                ],
                'body' => [
                    'nombres' => ['label' => 'Nombres', 'type' => 'text'],
                    'apellidos' => ['label' => 'Apellidos', 'type' => 'text'],
                    'fecha_nacimiento' => ['label' => 'Fecha de nacimiento', 'type' => 'date'],
                    'telefono' => ['label' => 'Teléfono', 'type' => 'text'],
                    'direccion' => ['label' => 'Dirección', 'type' => 'text'],
                ],
            ],
            [
                'id' => 'pacientes.delete',
                'label' => 'Eliminar paciente',
                'method' => 'DELETE',
                'path' => '/pacientes/{paciente_id}',
                'description' => 'Elimina el perfil del paciente.',
                'params' => [
                    'paciente_id' => ['label' => 'ID del paciente', 'type' => 'number', 'required' => true],
                ],
            ],
        ],
    ],

    'medicos' => [
        'label' => 'Médicos',
        'hint' => 'CRUD de perfiles médicos.',
        'items' => [
            [
                'id' => 'medicos.list',
                'label' => 'Listar médicos',
                'method' => 'GET',
                'path' => '/medicos',
                'description' => 'Devuelve todos los médicos con sus datos de usuario.',
            ],
            [
                'id' => 'medicos.get',
                'label' => 'Obtener médico',
                'method' => 'GET',
                'path' => '/medicos/{id_medico}',
                'description' => 'Consulta un médico por su ID.',
                'params' => [
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'medicos.create',
                'label' => 'Crear médico',
                'method' => 'POST',
                'path' => '/medicos',
                'description' => 'Crea el perfil de un usuario que ya existe.',
                'body' => [
                    'id_usuario' => ['label' => 'ID del usuario', 'type' => 'number', 'required' => true],
                    'nombres' => ['label' => 'Nombres', 'type' => 'text', 'required' => true],
                    'apellidos' => ['label' => 'Apellidos', 'type' => 'text', 'required' => true],
                    'telefono' => ['label' => 'Teléfono', 'type' => 'text', 'required' => true],
                    'tarjeta_profesional' => ['label' => 'Tarjeta profesional', 'type' => 'text', 'required' => true],
                    'especialidad' => ['label' => 'Especialidad', 'type' => 'text', 'required' => true],
                    'consultorio' => ['label' => 'Consultorio', 'type' => 'text', 'required' => true],
                ],
            ],
            [
                'id' => 'medicos.update',
                'label' => 'Actualizar médico',
                'method' => 'PATCH',
                'path' => '/medicos/{medico_id}',
                'description' => 'Actualiza solo los campos diligenciados.',
                'params' => [
                    'medico_id' => ['label' => 'ID del médico', 'type' => 'number', 'required' => true],
                ],
                'body' => [
                    'nombres' => ['label' => 'Nombres', 'type' => 'text'],
                    'apellidos' => ['label' => 'Apellidos', 'type' => 'text'],
                    'telefono' => ['label' => 'Teléfono', 'type' => 'text'],
                    'tarjeta_profesional' => ['label' => 'Tarjeta profesional', 'type' => 'text'],
                    'especialidad' => ['label' => 'Especialidad', 'type' => 'text'],
                    'consultorio' => ['label' => 'Consultorio', 'type' => 'text'],
                ],
            ],
            [
                'id' => 'medicos.delete',
                'label' => 'Eliminar médico',
                'method' => 'DELETE',
                'path' => '/medicos/{medico_id}',
                'description' => 'Elimina el perfil del médico.',
                'params' => [
                    'medico_id' => ['label' => 'ID del médico', 'type' => 'number', 'required' => true],
                ],
            ],
        ],
    ],

    'agenda' => [
        'label' => 'Agenda',
        'hint' => 'Disponibilidad médica y generación de cupos.',
        'items' => [
            [
                'id' => 'agenda.list',
                'label' => 'Agenda del médico',
                'method' => 'GET',
                'path' => '/agenda/{id_medico}',
                'description' => 'Devuelve las agendas de un médico.',
                'params' => [
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'agenda.create',
                'label' => 'Crear agenda',
                'method' => 'POST',
                'path' => '/agenda',
                'description' => 'Crea un rango de disponibilidad para un médico.',
                'body' => [
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number', 'required' => true],
                    'fecha_inicio' => ['label' => 'Fecha inicio', 'type' => 'date', 'required' => true],
                    'fecha_fin' => ['label' => 'Fecha fin', 'type' => 'date', 'required' => true],
                    'duracion_cita' => ['label' => 'Duración cita (min)', 'type' => 'number', 'required' => true],
                    'hora_inicio' => ['label' => 'Hora inicio', 'type' => 'time', 'required' => true],
                    'hora_fin' => ['label' => 'Hora fin', 'type' => 'time', 'required' => true],
                ],
            ],
            [
                'id' => 'agenda.update',
                'label' => 'Actualizar agenda',
                'method' => 'PATCH',
                'path' => '/agenda/{id_agenda}',
                'description' => 'Actualiza solo los campos diligenciados.',
                'params' => [
                    'id_agenda' => ['label' => 'ID de la agenda', 'type' => 'number', 'required' => true],
                ],
                'body' => [
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number'],
                    'fecha_inicio' => ['label' => 'Fecha inicio', 'type' => 'date'],
                    'fecha_fin' => ['label' => 'Fecha fin', 'type' => 'date'],
                    'duracion_cita' => ['label' => 'Duración cita (min)', 'type' => 'number'],
                    'hora_inicio' => ['label' => 'Hora inicio', 'type' => 'time'],
                    'hora_fin' => ['label' => 'Hora fin', 'type' => 'time'],
                    'estado' => ['label' => 'Estado', 'type' => 'select', 'options' => ['activo' => 'Activo', 'inactivo' => 'Inactivo'], 'empty' => 'Sin cambios'],
                ],
            ],
            [
                'id' => 'agenda.delete',
                'label' => 'Eliminar agenda',
                'method' => 'DELETE',
                'path' => '/agenda/{id_agenda}',
                'description' => 'Elimina una agenda.',
                'params' => [
                    'id_agenda' => ['label' => 'ID de la agenda', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'agenda.generar-cupos',
                'label' => 'Generar cupos',
                'method' => 'POST',
                'path' => '/agenda/{id_agenda}/generar-cupos',
                'description' => 'Genera los cupos de una agenda según su duración.',
                'params' => [
                    'id_agenda' => ['label' => 'ID de la agenda', 'type' => 'number', 'required' => true],
                ],
            ],
        ],
    ],

    'cupos' => [
        'label' => 'Cupos',
        'hint' => 'Consulta de cupos disponibles y cambio de estado.',
        'items' => [
            [
                'id' => 'cupos.disponibles',
                'label' => 'Cupos disponibles',
                'method' => 'GET',
                'path' => '/cupos/disponibles',
                'description' => 'Filtra cupos disponibles por especialidad, médico y rango de fechas.',
                'query' => [
                    'especialidad' => ['label' => 'Especialidad', 'type' => 'text'],
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number'],
                    'fecha_inicio' => ['label' => 'Fecha inicio', 'type' => 'date'],
                    'fecha_fin' => ['label' => 'Fecha fin', 'type' => 'date'],
                ],
            ],
            [
                'id' => 'cupos.get',
                'label' => 'Obtener cupo',
                'method' => 'GET',
                'path' => '/cupos/{id_cupo}',
                'description' => 'Consulta el detalle de un cupo.',
                'params' => [
                    'id_cupo' => ['label' => 'ID del cupo', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'cupos.update',
                'label' => 'Cambiar estado del cupo',
                'method' => 'PATCH',
                'path' => '/cupos/{id_cupo}',
                'description' => 'Cambia el estado de un cupo.',
                'params' => [
                    'id_cupo' => ['label' => 'ID del cupo', 'type' => 'number', 'required' => true],
                ],
                'body' => [
                    'estado' => [
                        'label' => 'Estado',
                        'type' => 'select',
                        'required' => true,
                        'options' => [
                            'disponible' => 'Disponible',
                            'reservado' => 'Reservado',
                            'ocupado' => 'Ocupado',
                            'cancelado' => 'Cancelado',
                        ],
                    ],
                ],
            ],
        ],
    ],

    'citas' => [
        'label' => 'Citas',
        'hint' => 'Reserva, cancelación, asistencia y jornada del médico.',
        'items' => [
            [
                'id' => 'citas.create',
                'label' => 'Crear cita',
                'method' => 'POST',
                'path' => '/citas',
                'description' => 'Reserva un cupo para un paciente.',
                'body' => [
                    'id_cupo' => ['label' => 'ID del cupo', 'type' => 'number', 'required' => true],
                    'id_paciente' => ['label' => 'ID del paciente', 'type' => 'number', 'required' => true],
                    'motivo_consulta' => ['label' => 'Motivo de consulta', 'type' => 'textarea'],
                ],
            ],
            [
                'id' => 'citas.list',
                'label' => 'Listar citas',
                'method' => 'GET',
                'path' => '/citas',
                'description' => 'Filtra citas por paciente, médico, estado o fechas.',
                'query' => [
                    'id_paciente' => ['label' => 'ID del paciente', 'type' => 'number'],
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number'],
                    'estado' => [
                        'label' => 'Estado',
                        'type' => 'select',
                        'empty' => 'Todos',
                        'options' => [
                            'pendiente' => 'Pendiente',
                            'confirmada' => 'Confirmada',
                            'atendida' => 'Atendida',
                            'cancelada' => 'Cancelada',
                            'no_asistio' => 'No asistió',
                        ],
                    ],
                    'fecha' => ['label' => 'Fecha', 'type' => 'date'],
                    'fecha_inicio' => ['label' => 'Fecha inicio', 'type' => 'date'],
                    'fecha_fin' => ['label' => 'Fecha fin', 'type' => 'date'],
                ],
            ],
            [
                'id' => 'citas.get',
                'label' => 'Obtener cita',
                'method' => 'GET',
                'path' => '/citas/{id_cita}',
                'description' => 'Consulta el detalle de una cita.',
                'params' => [
                    'id_cita' => ['label' => 'ID de la cita', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'citas.cancelar',
                'label' => 'Cancelar cita',
                'method' => 'PATCH',
                'path' => '/citas/{id_cita}/cancelar',
                'description' => 'Cancela la cita y puede generar una oferta para la lista de espera.',
                'params' => [
                    'id_cita' => ['label' => 'ID de la cita', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'citas.asistencia',
                'label' => 'Actualizar asistencia',
                'method' => 'PATCH',
                'path' => '/citas/{id_cita}/asistencia',
                'description' => 'Marca la cita como confirmada, atendida o no asistió.',
                'params' => [
                    'id_cita' => ['label' => 'ID de la cita', 'type' => 'number', 'required' => true],
                ],
                'body' => [
                    'estado' => [
                        'label' => 'Estado',
                        'type' => 'select',
                        'required' => true,
                        'options' => [
                            'confirmada' => 'Confirmada',
                            'atendida' => 'Atendida',
                            'no_asistio' => 'No asistió',
                        ],
                    ],
                ],
            ],
            [
                'id' => 'citas.jornada',
                'label' => 'Jornada del médico',
                'method' => 'GET',
                'path' => '/medicos/{id_medico}/jornada',
                'description' => 'Citas de un médico en una fecha determinada.',
                'params' => [
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number', 'required' => true],
                ],
                'query' => [
                    'fecha' => ['label' => 'Fecha', 'type' => 'date', 'required' => true],
                ],
            ],
        ],
    ],

    'lista-espera' => [
        'label' => 'Lista de espera',
        'hint' => 'Solicitudes, ofertas de cupos y expiración.',
        'items' => [
            [
                'id' => 'lista-espera.create',
                'label' => 'Crear solicitud',
                'method' => 'POST',
                'path' => '/lista-espera',
                'description' => 'Agrega un paciente a la lista de espera.',
                'body' => [
                    'id_paciente' => ['label' => 'ID del paciente', 'type' => 'number', 'required' => true],
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number'],
                    'prioridad' => ['label' => 'Prioridad', 'type' => 'number', 'help' => 'Por defecto 0.'],
                ],
            ],
            [
                'id' => 'lista-espera.list',
                'label' => 'Listar solicitudes',
                'method' => 'GET',
                'path' => '/lista-espera',
                'description' => 'Filtra la lista de espera por médico o estado.',
                'query' => [
                    'id_medico' => ['label' => 'ID del médico', 'type' => 'number'],
                    'estado' => [
                        'label' => 'Estado',
                        'type' => 'select',
                        'empty' => 'Todos',
                        'options' => [
                            'pendiente' => 'Pendiente',
                            'ofrecida' => 'Ofrecida',
                            'aceptada' => 'Aceptada',
                            'rechazada' => 'Rechazada',
                            'expirada' => 'Expirada',
                            'cancelada' => 'Cancelada',
                        ],
                    ],
                ],
            ],
            [
                'id' => 'lista-espera.get',
                'label' => 'Obtener solicitud',
                'method' => 'GET',
                'path' => '/lista-espera/{id_entrada}',
                'description' => 'Consulta el detalle de una solicitud.',
                'params' => [
                    'id_entrada' => ['label' => 'ID de la solicitud', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'lista-espera.delete',
                'label' => 'Cancelar solicitud',
                'method' => 'DELETE',
                'path' => '/lista-espera/{id_entrada}',
                'description' => 'Cancela una solicitud de la lista de espera.',
                'params' => [
                    'id_entrada' => ['label' => 'ID de la solicitud', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'lista-espera.aceptar',
                'label' => 'Aceptar oferta',
                'method' => 'POST',
                'path' => '/lista-espera/{id_entrada}/aceptar',
                'description' => 'Acepta el cupo ofrecido y crea la cita.',
                'params' => [
                    'id_entrada' => ['label' => 'ID de la solicitud', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'lista-espera.rechazar',
                'label' => 'Rechazar oferta',
                'method' => 'POST',
                'path' => '/lista-espera/{id_entrada}/rechazar',
                'description' => 'Rechaza el cupo ofrecido.',
                'params' => [
                    'id_entrada' => ['label' => 'ID de la solicitud', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'id' => 'lista-espera.procesar',
                'label' => 'Procesar expiradas',
                'method' => 'POST',
                'path' => '/lista-espera/procesar-expiradas',
                'description' => 'Expira ofertas vencidas y genera nuevas ofertas.',
            ],
        ],
    ],
];
