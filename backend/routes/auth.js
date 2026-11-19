const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  return {
    username: user.username,
    name: user.name,
    role: user.role,
    isAdmin: user.isAdmin,
    mustChangePassword: user.mustChangePassword,
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Falta el usuario o la contraseña' });
  }
  const user = await User.findOne({ username: String(username).trim().toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  return res.json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 6 caracteres' });
  }
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  }
  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.mustChangePassword = false;
  await user.save();
  return res.json({ ok: true, user: publicUser(user) });
});

module.exports = router;
