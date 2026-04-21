// Utilidades comunes: formateo de fecha, validaciones, etc.

export function fmtDate(iso, opts = {}) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const daysShort = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  if (opts.short) return `${daysShort[d.getDay()]} ${d.getDate()}`;
  if (opts.full) return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

export function weekStart(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay(); // 0 = domingo
  const offset = dow === 0 ? -6 : 1 - dow; // lunes como primer día
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function validateRUT(rut) {
  if (!rut) return false;
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dv === expected;
}

export function formatRUT(v) {
  const clean = v.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let out = '';
  for (let i = body.length; i > 0; i -= 3) {
    out = body.slice(Math.max(0, i - 3), i) + (out ? '.' + out : '');
  }
  return out + '-' + dv;
}

export function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
}
