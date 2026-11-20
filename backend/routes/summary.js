const express = require('express');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const { centsToMoney } = require('../utils/split');
const { monthFilter, dayFilter, todayKey } = require('../utils/month');

const router = express.Router();

// Totales y reparto sumando los valores guardados en cada pedido, así un
// cambio de porcentajes no altera lo ya registrado. `match` es un filtro
// de Mongo sobre createdAt (mes, día o vacío = todo).
async function computeSummary(match) {
  const pipeline = [];
  if (match.createdAt) pipeline.push({ $match: match });
  pipeline.push({
    $group: {
      _id: '$owner',
      count: { $sum: 1 },
      totalCents: { $sum: '$amountCents' },
      ownerCents: { $sum: '$ownerCents' },
      gasCents: { $sum: '$gasCents' },
      danielCents: { $sum: '$danielCents' },
    },
  });

  const rows = await Order.aggregate(pipeline);

  const totals = {
    count: 0,
    total: 0,
    ownerTotal: 0,
    gasTotal: 0,
    danielTotal: 0,
    perOwner: { rosario: 0, luis: 0 },
  };

  for (const row of rows) {
    totals.count += row.count;
    totals.total += row.totalCents;
    totals.ownerTotal += row.ownerCents;
    totals.gasTotal += row.gasCents;
    totals.danielTotal += row.danielCents;
    if (row._id === 'rosario' || row._id === 'luis') {
      totals.perOwner[row._id] = centsToMoney(row.ownerCents);
    }
  }

  totals.total = centsToMoney(totals.total);
  totals.ownerTotal = centsToMoney(totals.ownerTotal);
  totals.gasTotal = centsToMoney(totals.gasTotal);
  totals.danielTotal = centsToMoney(totals.danielTotal);

  return totals;
}

// GET /api/summary — totales generales y por dueño de la moto.
// ?month=YYYY-MM filtra por mes (hora de Ciudad de México).
router.get('/', async (req, res) => {
  const totals = await computeSummary(monthFilter(req.query.month));
  const percents = await Setting.getPercents();
  return res.json({ ...totals, percents });
});

// GET /api/summary/today — totales solo del día de hoy (hora de Ciudad
// de México). Responde con la misma forma que /api/summary más `date`.
router.get('/today', async (req, res) => {
  const date = todayKey();
  const totals = await computeSummary(dayFilter(date));
  const percents = await Setting.getPercents();
  return res.json({ ...totals, percents, date });
});

module.exports = router;
