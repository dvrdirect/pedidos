const express = require('express');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const { centsToMoney } = require('../utils/split');

const router = express.Router();

// GET /api/summary — totales generales y por dueño de la moto.
// Se suman los repartos guardados en cada pedido, así un cambio de
// porcentajes no altera lo ya registrado.
router.get('/', async (req, res) => {
  const rows = await Order.aggregate([
    {
      $group: {
        _id: '$owner',
        count: { $sum: 1 },
        totalCents: { $sum: '$amountCents' },
        ownerCents: { $sum: '$ownerCents' },
        gasCents: { $sum: '$gasCents' },
        danielCents: { $sum: '$danielCents' },
      },
    },
  ]);

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

  const percents = await Setting.getPercents();
  return res.json({ ...totals, percents });
});

module.exports = router;
