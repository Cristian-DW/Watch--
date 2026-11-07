/**
 * Scheduler — ejecuta periódicamente los Watches de búsqueda vencidos.
 *
 * Un Watch está "vencido" cuando nunca se ha chequeado o cuando desde
 * `lastCheckedAt` pasó el intervalo de su frecuencia (HOURLY/DAILY/WEEKLY).
 *
 * Nota: scheduler in-process, pensado para 1 instancia (mta.yaml → instances: 1).
 * Para escalar horizontalmente, migrar a SAP BTP Job Scheduling Service
 * invocando la acción `checkNow` o un endpoint técnico.
 */
const cds = require('@sap/cds');
const { getConfig, FREQUENCY_MINUTES } = require('./config');
const engine = require('./engine');

const LOG = cds.log('watch-scheduler');
let timer = null;
let ticking = false;

async function dueWatches(now = Date.now()) {
  const { Watches } = cds.entities('watch');
  const rows = await SELECT.from(Watches)
    .columns('ID', 'frequency', 'lastCheckedAt')
    .where({ status: { in: ['ACTIVE', 'TRIGGERED'] }, type: { in: engine.SEARCH_TYPES } });

  return rows
    .filter((w) => {
      if (!w.lastCheckedAt) return true;
      const minutes = FREQUENCY_MINUTES[w.frequency] || FREQUENCY_MINUTES.DAILY;
      return now - new Date(w.lastCheckedAt).getTime() >= minutes * 60000;
    })
    .sort((a, b) => String(a.lastCheckedAt || '').localeCompare(String(b.lastCheckedAt || '')));
}

async function tick() {
  if (ticking) return 0;
  ticking = true;
  try {
    const { maxWatchesPerTick } = getConfig().scheduler;
    const due = (await dueWatches()).slice(0, maxWatchesPerTick);
    for (const w of due) {
      try {
        await engine.runWatch(w.ID, { trigger: 'SCHEDULER' });
      } catch (e) {
        LOG.error(`Error ejecutando el Watch ${w.ID}:`, e.message);
      }
    }
    return due.length;
  } catch (e) {
    LOG.error('Error en el tick del scheduler:', e.message);
    return 0;
  } finally {
    ticking = false;
  }
}

function start() {
  const { enabled, tickSeconds } = getConfig().scheduler;
  if (!enabled || timer) return;
  LOG.info(`Scheduler iniciado (cada ${tickSeconds}s).`);
  timer = setInterval(tick, tickSeconds * 1000);
  timer.unref();
  setTimeout(tick, 5000).unref();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, tick, dueWatches };

