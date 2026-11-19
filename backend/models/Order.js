const mongoose = require('mongoose');

// Los montos se guardan en centavos (enteros) para que el reparto cuadre
// al centavo. owner = usuario dueño de la moto usada en ese pedido.
const orderSchema = new mongoose.Schema(
  {
    amountCents: { type: Number, required: true, min: 1 },
    ownerCents: { type: Number, required: true, min: 0 },
    gasCents: { type: Number, required: true, min: 0 },
    danielCents: { type: Number, required: true, min: 0 },
    owner: { type: String, enum: ['rosario', 'luis'], required: true },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
