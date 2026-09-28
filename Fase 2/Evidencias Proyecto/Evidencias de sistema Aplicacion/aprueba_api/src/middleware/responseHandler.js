export function responseHandler(req, res, next) {
  // Helper para respuestas exitosas
  res.success = (data = null, meta = null, status = 200) => {
    return res.status(status).json({
      data,
      error: null,
      meta,
    });
  };

  // Helper para respuestas de error
  res.fail = (message = 'Error interno del servidor', details = null, status = 500) => {
    return res.status(status).json({
      data: null,
      error: {
        message,
        details,
      },
      meta: null,
    });
  };

  next();
}