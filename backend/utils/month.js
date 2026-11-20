// Meses en hora de Ciudad de México (UTC-6 todo el año, sin horario de
// verano desde 2022). Un mes "YYYY-MM" cubre de las 00:00 del día 1 a las
// 00:00 del día 1 del mes siguiente, hora local, expresado en UTC.

// Rango [inicio, fin) en UTC para un mes "YYYY-MM". null si no es válido.
function monthRange(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ''));
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return null;
  // 06:00 UTC = 00:00 en Ciudad de México (UTC-6).
  const start = new Date(Date.UTC(year, mon - 1, 1, 6, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 1, 6, 0, 0, 0));
  return { start, end };
}

// Filtro de Mongo para createdAt dentro del mes. {} si el mes no es válido
// o no se pasó (sin filtrar).
function monthFilter(month) {
  const range = monthRange(month);
  if (!range) return {};
  return { createdAt: { $gte: range.start, $lt: range.end } };
}

// "YYYY-MM" de una fecha, en hora de Ciudad de México.
function monthKey(date) {
  const d = new Date(new Date(date).getTime() - 6 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return y + '-' + m;
}

// Rango [inicio, fin) en UTC para un día "YYYY-MM-DD", en hora de Ciudad
// de México (UTC-6). null si no es válido.
function dayRange(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  const d = Number(m[3]);
  if (mon < 1 || mon > 12 || d < 1 || d > 31) return null;
  // 06:00 UTC = 00:00 en Ciudad de México (UTC-6).
  const start = new Date(Date.UTC(year, mon - 1, d, 6, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon - 1, d + 1, 6, 0, 0, 0));
  return { start, end };
}

// Filtro de Mongo para createdAt dentro del día. {} si el día no es válido
// o no se pasó (sin filtrar).
function dayFilter(day) {
  const range = dayRange(day);
  if (!range) return {};
  return { createdAt: { $gte: range.start, $lt: range.end } };
}

// "YYYY-MM-DD" de hoy, en hora de Ciudad de México.
function todayKey() {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

module.exports = { monthRange, monthFilter, monthKey, dayRange, dayFilter, todayKey };
