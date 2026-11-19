const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function publicUser(user) {
  return {
    username: user.username,
    name: user.name,
    role: user.role,
    isAdmin: user.isAdmin,
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

// POST /api/auth/login — solo el nombre, sin contraseña.
router.post('/login', async (req, res) => {
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: 'Falta el nombre' });
  }
  const user = await User.findOne({ username: String(username).trim().toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: 'Nombre no reconocido' });
  }
  return res.json({ token: signToken(user), user: publicUser(user) });
});

module.exports = router;
