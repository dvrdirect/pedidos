const mongoose = require('mongoose');

// Un solo documento (key: 'split') con los porcentajes del reparto.
// Lo de Daniel es siempre el resto: 100 - ownerPct - gasPct.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    ownerPct: { type: Number, required: true, min: 0, max: 100 },
    gasPct: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true }
);

settingSchema.statics.getSplit = async function getSplit() {
  let doc = await this.findOne({ key: 'split' });
  if (!doc) {
    doc = await this.create({ key: 'split', ownerPct: 20, gasPct: 10 });
  }
  return doc;
};

settingSchema.statics.getPercents = async function getPercents() {
  const doc = await this.getSplit();
  return {
    ownerPct: doc.ownerPct,
    gasPct: doc.gasPct,
    danielPct: 100 - doc.ownerPct - doc.gasPct,
  };
};

module.exports = mongoose.model('Setting', settingSchema);
