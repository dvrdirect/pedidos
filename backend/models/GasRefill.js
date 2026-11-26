const mongoose = require('mongoose');

// Refills de gasolina registrados. Cada refil cubre ~2 días de reparto:
// el apartado acumula $32.50 por cada día con al menos un pedido, y cada
// refil (normalmente $65) se descuenta de lo acumulado.
const gasRefillSchema = new mongoose.Schema(
  {
    amountCents: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GasRefill', gasRefillSchema);
