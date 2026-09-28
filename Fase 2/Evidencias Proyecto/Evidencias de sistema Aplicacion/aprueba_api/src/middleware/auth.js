import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_aprueba_2026';

export function generateTokens(payload) {
  // Aseguramos que el payload contenga sub e id
  const userPayload = {
    sub: payload.id || payload.sub,
    id: payload.id || payload.sub,
    role: payload.role || 'student',
    plan: payload.plan || 'free',
  };

  const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });

  return { accessToken, refreshToken };
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.fail('Acceso denegado. Token no proporcionado.', null, 401);
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.fail('Token inválido o expirado.', null, 403);
    }
    req.user = decoded;
    next();
  });
}