const express = require('express');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const { splitOrder, centsToMoney } = require('../utils/split');
const { monthFilter, monthKey } = require('../utils/month');

const router = express.Router();
const OWNERS = ['rosario', 'luis'];

function serialize(order) {
  return {
    id: order._id.toString(),
    amount: centsToMoney(order.amountCents),
    ownerAmount: centsToMoney(order.ownerCents),
    gasAmount: centsToMoney(order.gasCents),
    danielAmount: centsToMoney(order.danielCents),
    owner: order.owner,
    note: order.note || '',
    createdBy: order.createdBy,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function validateOrderInput(body) {
  const errors = [];
  const amount = Number(body && body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    errors.push('El monto debe ser un número mayor que 0');
  }
  if (body && body.owner !== undefined && !OWNERS.includes(body.owner)) {
    errors.push('El dueño de la moto debe ser Rosario o Luis');
  }
  if (body && body.note !== undefined && String(body.note).length > 200) {
    errors.push('La nota no puede pasar de 200 caracteres');
  }
  return { errors, amount };
}

// GET /api/orders/months — meses con pedidos, del más reciente al más antiguo.
router.get('/months', async (req, res) => {
  const orders = await Order.find({}, 'createdAt').lean();
  const months = new Set();
  for (const o of orders) months.add(monthKey(o.createdAt));
  return res.json({ months: [...months].sort().reverse() });
});

// GET /api/orders — lista de pedidos, del más reciente al más antiguo.
// ?month=YYYY-MM filtra por mes (hora de Ciudad de México).
router.get('/', async (req, res) => {
  const orders = await Order.find(monthFilter(req.query.month)).sort({ createdAt: -1 });
  return res.json({ orders: orders.map(serialize) });
});

// POST /api/orders — agrega un pedido y calcula su reparto.
router.post('/', async (req, res) => {
  const { errors, amount } = validateOrderInput(req.body);
  if (errors.length) {
    return res.status(400).json({ error: errors[0] });
  }
  const owner = req.body.owner || 'rosario';
  const note = (req.body.note || '').trim();
  const percents = await Setting.getPercents();
  const split = splitOrder(amount, percents.ownerPct, percents.gasPct);
  const order = await Order.create({
    ...split,
    owner,
    note,
    createdBy: req.user.username,
  });
  return res.status(201).json({ order: serialize(order) });
});

// PATCH /api/orders/:id — edita monto, nota o dueño de la moto.
// Si cambia el monto, el reparto se recalcula con los porcentajes actuales.
router.patch('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
  if (req.body.amount !== undefined) {
    const { errors, amount } = validateOrderInput(req.body);
    if (errors.length) {
      return res.status(400).json({ error: errors[0] });
    }
    const percents = await Setting.getPercents();
    Object.assign(order, splitOrder(amount, percents.ownerPct, percents.gasPct));
  }
  if (req.body.owner !== undefined) {
    if (!OWNERS.includes(req.body.owner)) {
      return res.status(400).json({ error: 'El dueño de la moto debe ser Rosario o Luis' });
    }
    order.owner = req.body.owner;
  }
  if (req.body.note !== undefined) {
    if (String(req.body.note).length > 200) {
      return res.status(400).json({ error: 'La nota no puede pasar de 200 caracteres' });
    }
    order.note = String(req.body.note).trim();
  }
  await order.save();
  return res.json({ order: serialize(order) });
});

// DELETE /api/orders/:id — borra un pedido.
router.delete('/:id', async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
  return res.json({ ok: true });
});

module.exports = router;
