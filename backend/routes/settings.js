const express = require('express');
const Setting = require('../models/Setting');
const { adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings — porcentajes actuales del reparto.
router.get('/', async (req, res) => {
  const percents = await Setting.getPercents();
  return res.json(percents);
});

// PATCH /api/settings — solo el administrador (Daniel) cambia el reparto.
// Lo de Daniel es siempre el resto (100 - dueño - gasolina).
router.patch('/', adminOnly, async (req, res) => {
  const ownerPct = Number(req.body.ownerPct);
  const gasPct = Number(req.body.gasPct);
  if (!Number.isFinite(ownerPct) || !Number.isFinite(gasPct)) {
    return res.status(400).json({ error: 'Los porcentajes deben ser números' });
  }
  if (ownerPct < 0 || ownerPct > 100 || gasPct < 0 || gasPct > 100) {
    return res.status(400).json({ error: 'Los porcentajes van de 0 a 100' });
  }
  if (ownerPct + gasPct > 100) {
    return res.status(400).json({ error: 'Dueño + gasolina no pueden pasar de 100%' });
  }
  const doc = await Setting.getSplit();
  doc.ownerPct = ownerPct;
  doc.gasPct = gasPct;
  await doc.save();
  return res.json({
    ownerPct: doc.ownerPct,
    gasPct: doc.gasPct,
    danielPct: 100 - doc.ownerPct - doc.gasPct,
  });
});

module.exports = router;
