const jwt = require('jsonwebtoken');

// Verifica el JWT del header Authorization: Bearer <token>.
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, name, role, isAdmin }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

// Solo Daniel (administrador).
function adminOnly(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Solo el administrador puede hacer esto' });
  }
  return next();
}

module.exports = { auth, adminOnly };
