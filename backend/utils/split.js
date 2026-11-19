// Reparto de un pedido en centavos exactos.
// ownerPct y gasPct son porcentajes; lo de Daniel es el resto, así las
// partes siempre suman el total exacto del pedido.
function splitOrder(amount, ownerPct = 20, gasPct = 10) {
  const totalCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    throw new Error('Monto inválido');
  }
  const ownerCents = Math.round((totalCents * ownerPct) / 100);
  const gasCents = Math.round((totalCents * gasPct) / 100);
  const danielCents = totalCents - ownerCents - gasCents;
  return { amountCents: totalCents, ownerCents, gasCents, danielCents };
}

// Centavos -> pesos con 2 decimales (número, no texto).
function centsToMoney(cents) {
  return Math.round(cents) / 100;
}

module.exports = { splitOrder, centsToMoney };
