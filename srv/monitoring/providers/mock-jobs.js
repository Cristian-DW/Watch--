/**
 * Mock Jobs — bolsa de empleo simulada para desarrollo y demos (sin red).
 *
 * - Siempre devuelve un set base estable de ofertas para la query.
 * - Cada `newEveryMinutes` minutos puede "publicarse" una oferta nueva,
 *   lo que permite ver notificaciones NEW_JOB sin depender de APIs reales.
 */
const { rand, pick, titleCase } = require('./mock-utils');

const COMPANIES = ['Accenture', 'Deloitte', 'IBM', 'NTT DATA', 'Globant', 'SAP', 'Capgemini', 'EY', 'KPMG', 'Seidor'];
const LOCATIONS = ['Bogotá, Colombia', 'Medellín, Colombia', 'Remote · LATAM', 'Madrid, España', 'Ciudad de México', 'Remote · Worldwide'];
const PREFIXES = ['Senior', 'Lead', '', 'Principal', 'Sr.', ''];
const SUFFIXES = ['', '(Remoto)', '- Proyecto internacional', '', '- Contrato indefinido'];
const SALARIES = [null, 'COP 18.000.000 - 22.000.000 / mes', 'USD 5.000 - 6.500 / mes', null, 'A convenir'];
const SOURCES = ['LinkedIn (mock)', 'Computrabajo (mock)', 'Indeed (mock)', 'elempleo (mock)'];

function posting(query, seed, publishedAt) {
  const location = pick(LOCATIONS, `${seed}|loc`);
  return {
    id: `mock-${seed}`,
    source: pick(SOURCES, `${seed}|src`),
    title: [pick(PREFIXES, `${seed}|pre`), titleCase(query), pick(SUFFIXES, `${seed}|suf`)]
      .filter(Boolean).join(' '),
    company: pick(COMPANIES, `${seed}|co`),
    location,
    remote: /remote/i.test(location),
    salary: pick(SALARIES, `${seed}|sal`),
    url: `https://example.com/jobs/${encodeURIComponent(seed)}`,
    publishedAt,
    tags: []
  };
}

module.exports = {
  name: 'mock-jobs',
  kind: 'JOB',
  label: 'Bolsa de empleo simulada',
  defaultEnabled: false,

  async search({ query }, { config }) {
    const q = String(query).trim();
    const now = Date.now();
    const slotMs = (config.newEveryMinutes || 15) * 60000;
    const currentSlot = Math.floor(now / slotMs);
    const items = [];

    // Set base estable (3 ofertas "ya publicadas")
    for (let i = 0; i < 3; i++) {
      items.push(posting(q, `${q}|base|${i}`, new Date(now - (i + 2) * 86400000).toISOString()));
    }

    // Ofertas que se van publicando con el tiempo (últimos 48 slots)
    for (let slot = currentSlot - 48; slot <= currentSlot; slot++) {
      if (rand(`${q}|slot|${slot}`) < (config.probability ?? 0.35)) {
        items.push(posting(q, `${q}|slot|${slot}`, new Date(slot * slotMs).toISOString()));
      }
    }
    return items;
  }
};

