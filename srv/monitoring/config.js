/**
 * Configuración del módulo de monitoreo.
 *
 * Se lee de `cds.env.watch` (package.json → cds.watch, con perfiles
 * [development] / [test] / [production]) y se completa con defaults.
 * Los secretos (API keys, SMTP) se leen de variables de entorno.
 */
const cds = require('@sap/cds');

const DEFAULTS = {
  currency: 'COP',
  checkOnCreate: true,
  scheduler: { enabled: true, tickSeconds: 60, maxWatchesPerTick: 10 },
  engine: { providerTimeoutMs: 15000, maxRunsKept: 20, maxPerNotificationBatch: 5 },
  matching: { minScore: 0.75, outlierRatio: 0.35 },
  notifications: { email: { enabled: true, from: 'WATCH <no-reply@watch.local>' } },
  providers: {}
};

const FREQUENCY_MINUTES = { HOURLY: 60, DAILY: 24 * 60, WEEKLY: 7 * 24 * 60 };

function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object'
      ? merge(base[k], v)
      : v;
  }
  return out;
}

function getConfig() {
  return merge(DEFAULTS, cds.env.watch || {});
}

function providerConfig(name) {
  return getConfig().providers[name] || {};
}

module.exports = { getConfig, providerConfig, FREQUENCY_MINUTES };

