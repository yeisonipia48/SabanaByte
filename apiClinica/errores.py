class ErrorApi(Exception):
    status_code = 400


class ErrorNoEncontrado(ErrorApi):
    status_code = 404


class ErrorConflicto(ErrorApi):
    status_code = 409


class ErrorReglaNegocio(ErrorApi):
    status_code = 400
