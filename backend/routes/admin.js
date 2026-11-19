const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const { splitOrder } = require('../utils/split');

const router = express.Router();

// Usuarios iniciales. Las contraseñas se leen de variables de entorno
// (SEED_PASSWORD_ROSARIO, SEED_PASSWORD_LUIS, SEED_PASSWORD_DANIEL)
// y NUNCA se guardan en el código ni en el repositorio.
const SEED_USERS = [
  { username: 'rosario', name: 'Rosario', role: 'dueno', isAdmin: false, env: 'SEED_PASSWORD_ROSARIO' },
  { username: 'luis', name: 'Luis', role: 'dueno', isAdmin: false, env: 'SEED_PASSWORD_LUIS' },
  { username: 'daniel', name: 'Daniel', role: 'repartidor', isAdmin: true, env: 'SEED_PASSWORD_DANIEL' },
];

// Pedidos iniciales (MXN). Dueño: Rosario por defecto; se puede reasignar
// cada pedido dentro de la app.
const SEED_ORDERS = [
  { amount: 28.5, owner: 'rosario', note: 'Pedido inicial' },
  { amount: 19.0, owner: 'rosario', note: 'Pedido inicial' },
  { amount: 38.39, owner: 'rosario', note: 'Pedido inicial' },
];

// POST /api/admin/seed — crea los 3 usuarios y los 3 pedidos iniciales.
// Solo funciona si la colección de usuarios está vacía y con la clave
// correcta en el header x-setup-key (variable de entorno SETUP_KEY).
router.post('/seed', async (req, res) => {
  const setupKey = process.env.SETUP_KEY;
  if (!setupKey || req.headers['x-setup-key'] !== setupKey) {
    return res.status(403).json({ error: 'Clave de configuración inválida' });
  }
  const existing = await User.countDocuments();
  if (existing > 0) {
    return res.status(409).json({ error: 'Ya existen usuarios; no se puede sembrar de nuevo' });
  }
  for (const seed of SEED_USERS) {
    const password = process.env[seed.env];
    if (!password || password.length < 6) {
      return res
        .status(500)
        .json({ error: `Falta configurar la variable ${seed.env} (mínimo 6 caracteres)` });
    }
  }
  const users = [];
  for (const seed of SEED_USERS) {
    const user = await User.create({
      username: seed.username,
      name: seed.name,
      role: seed.role,
      isAdmin: seed.isAdmin,
      passwordHash: await bcrypt.hash(process.env[seed.env], 10),
      mustChangePassword: true,
    });
    users.push(user.username);
  }
  // Reparto inicial 20/10/70.
  for (const seed of SEED_ORDERS) {
    const split = splitOrder(seed.amount, 20, 10);
    await Order.create({ ...split, owner: seed.owner, note: seed.note, createdBy: 'daniel' });
  }
  return res.status(201).json({
    ok: true,
    users,
    ordersSeeded: SEED_ORDERS.length,
    note: 'Cada usuario debe cambiar su contraseña en el primer inicio de sesión.',
  });
});

module.exports = router;
