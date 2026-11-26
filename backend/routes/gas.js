const express = require('express');
const Order = require('../models/Order');
const GasRefill = require('../models/GasRefill');
const { centsToMoney } = require('../utils/split');
const { monthKey } = require('../utils/month');

const router = express.Router();

// Regla del apartado: un refil de $65 cubre 2 días de reparto, o sea
// $32.50 por cada día con al menos un pedido. El saldo es acumulado (todos
// los meses): lo apartado menos los refills registrados.
const REFILL_CENTS = 6500;
const PER_DAY_CENTS = 3250;

// "YYYY-MM-DD" de una fecha, en hora de Ciudad de México.
// (monthKey del util solo devuelve "YYYY-MM", no sirve para contar días.)
function dayKey(date) {
  const d = new Date(new Date(date).getTime() - 6 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function serialize(refill) {
  return {
    id: refill._id.toString(),
    amount: centsToMoney(refill.amountCents),
    note: refill.note || '',
    createdBy: refill.createdBy,
    createdAt: refill.createdAt,
  };
}

// GET /api/gas — resumen del apartado de gasolina.
// ?month=YYYY-MM filtra el desglose del mes (hora de Ciudad de México).
router.get('/', async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month || ''))
    ? req.query.month
    : null;
  const orders = await Order.find({}, 'createdAt').lean();
  const refills = await GasRefill.find({}).sort({ createdAt: -1 }).lean();
  const inMonth = (d) => !month || dayKey(d).slice(0, 7) === month;

  const daysAll = new Set(orders.map((o) => dayKey(o.createdAt)));
  const daysMonth = new Set(
    orders.filter((o) => inMonth(o.createdAt)).map((o) => dayKey(o.createdAt))
  );
  const accruedCents = daysAll.size * PER_DAY_CENTS;
  const accruedMonthCents = daysMonth.size * PER_DAY_CENTS;
  const refillsTotalCents = refills.reduce((sum, r) => sum + r.amountCents, 0);
  const monthRefills = refills.filter((r) => inMonth(r.createdAt));
  const refillsMonthCents = monthRefills.reduce(
    (sum, r) => sum + r.amountCents,
    0
  );
  const balanceCents = accruedCents - refillsTotalCents;

  return res.json({
    month: month || monthKey(new Date()).slice(0, 7),
    refillAmount: centsToMoney(REFILL_CENTS),
    perDay: centsToMoney(PER_DAY_CENTS),
    deliveryDays: daysMonth.size,
    deliveryDaysTotal: daysAll.size,
    accrued: centsToMoney(accruedCents),
    accruedMonth: centsToMoney(accruedMonthCents),
    refillsTotal: centsToMoney(refillsTotalCents),
    refillsMonth: centsToMoney(refillsMonthCents),
    refillsCount: refills.length,
    refillsCountMonth: monthRefills.length,
    balance: centsToMoney(balanceCents),
    refillsCovered: Math.floor(balanceCents / REFILL_CENTS),
    refills: monthRefills.map(serialize),
  });
});

// POST /api/gas/refill — registra un refil de gasolina.
// body: { amount? (pesos, por defecto 65), note? }
router.post('/refill', async (req, res) => {
  const amount =
    req.body && req.body.amount !== undefined ? Number(req.body.amount) : 65;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
    return res
      .status(400)
      .json({ error: 'El monto del refil debe ser mayor que 0' });
  }
  const note = String((req.body && req.body.note) || '').trim();
  if (note.length > 200) {
    return res
      .status(400)
      .json({ error: 'La nota no puede pasar de 200 caracteres' });
  }
  const refill = await GasRefill.create({
    amountCents: Math.round(amount * 100),
    note,
    createdBy: req.user.username,
  });
  return res.status(201).json({ refill: serialize(refill) });
});

// DELETE /api/gas/refill/:id — borra un refil (por error al registrarlo).
router.delete('/refill/:id', async (req, res) => {
  const refill = await GasRefill.findByIdAndDelete(req.params.id);
  if (!refill) {
    return res.status(404).json({ error: 'Refil no encontrado' });
  }
  return res.json({ ok: true });
});

module.exports = router;
