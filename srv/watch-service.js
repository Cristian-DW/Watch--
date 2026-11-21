/**
 * Implementación custom del WatchService.
 *
 * Registra validaciones y hooks de negocio
 * para la entidad Watches.
 *
 * El CRUD estándar (GET, POST, PUT/PATCH, DELETE)
 * lo maneja CAP automáticamente; aquí solo añadimos
 * validaciones y lógica adicional:
 *   - Watches basados en URL vs. basados en búsqueda (JOB / PRODUCT).
 *   - Acción `checkNow` y primer chequeo automático tras crear.
 *   - Bandeja de notificaciones (marcar como leídas).
 */
const cds = require('@sap/cds');
const engine = require('./monitoring/engine');
const providers = require('./monitoring/providers');
const { getConfig } = require('./monitoring/config');

const LOG = cds.log('watch-service');

module.exports = function WatchService() {

  const URL_TYPES         = ['PRICE', 'STOCK', 'CONTENT', 'CUSTOM'];
  const SEARCH_TYPES      = ['JOB', 'PRODUCT'];
  const VALID_TYPES       = [...URL_TYPES, ...SEARCH_TYPES];
  const VALID_FREQUENCIES = ['HOURLY', 'DAILY', 'WEEKLY'];
  const VALID_STATUSES    = ['ACTIVE', 'PAUSED', 'TRIGGERED', 'ARCHIVED'];
  const URL_REGEX         = /^https?:\/\/.+/i;
  const EMAIL_REGEX       = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CURRENCY_REGEX    = /^[A-Z]{3}$/;

  // Entidades de persistencia (las escrituras técnicas no pasan por las restricciones del servicio)
  const { Watches, Notifications, Offers } = cds.entities('watch');

  // ── Helpers ────────────────────────────────────────────

  function validateUrl(url) {
    if (!url || url.trim().length === 0) {
      return 'La URL del Watch es obligatoria.';
    }
    if (!URL_REGEX.test(url.trim())) {
      return 'La URL debe comenzar con http:// o https://';
    }
    return null;
  }

  function validateName(name) {
    if (!name || name.trim().length === 0) {
      return 'El nombre del Watch es obligatorio.';
    }
    return null;
  }

  function validateEnum(value, allowed, fieldName) {
    if (value && !allowed.includes(value)) {
      return `Valor inválido para ${fieldName}: ${value}. Valores permitidos: ${allowed.join(', ')}`;
    }
    return null;
  }

  /**
   * Valida los campos dependientes del tipo sobre el estado resultante
   * (datos actuales + cambios), para que CREATE y UPDATE compartan reglas.
   */
  function validateByType(req, w) {
    const type = w.type || 'PRICE';

    if (SEARCH_TYPES.includes(type)) {
      if (!w.query || w.query.trim().length < 2) {
        req.error(400, type === 'JOB'
          ? 'Indica el rol o palabras clave del empleo a buscar (ej. SAP Architect BTP).'
          : 'Indica el producto a buscar (ej. New Balance 550).', 'query');
      }
      if (w.url && !URL_REGEX.test(w.url.trim())) {
        req.error(400, 'La URL debe comenzar con http:// o https://', 'url');
      }
    } else {
      const urlErr = validateUrl(w.url);
      if (urlErr) req.error(400, urlErr, 'url');
    }

    if (w.targetPrice !== undefined && w.targetPrice !== null && w.targetPrice !== '') {
      if (type !== 'PRODUCT' && type !== 'PRICE') {
        req.error(400, 'El precio objetivo solo aplica a Watches de producto o precio.', 'targetPrice');
      } else if (!(Number(w.targetPrice) > 0)) {
        req.error(400, 'El precio objetivo debe ser un número mayor que 0.', 'targetPrice');
      }
    }
    if (w.currency && !CURRENCY_REGEX.test(w.currency)) {
      req.error(400, 'La moneda debe ser un código ISO de 3 letras (ej. COP).', 'currency');
    }
    if (w.notifyEmail && !EMAIL_REGEX.test(w.notifyEmail.trim())) {
      req.error(400, 'El email de notificación no es válido.', 'notifyEmail');
    }
  }

  function normalizeStrings(data) {
    for (const key of ['url', 'name', 'query', 'location', 'notifyEmail']) {
      if (typeof data[key] === 'string') data[key] = data[key].trim() || null;
    }
    if (typeof data.currency === 'string') data.currency = data.currency.trim().toUpperCase();
    if (data.targetPrice === '') data.targetPrice = null;
  }

  function scheduleFirstCheck(id) {
    if (!getConfig().checkOnCreate) return;
    cds.spawn({ after: 50 }, () => engine.runWatch(id, { trigger: 'CREATE' })
      .catch((e) => LOG.error(`Primer chequeo del Watch ${id} falló:`, e.message)));
  }

  // ── Before CREATE ──────────────────────────────────────

  this.before('CREATE', 'Watches', (req) => {
    const { name, type, frequency, status } = req.data;

    const nameErr = validateName(name);
    if (nameErr) req.error(400, nameErr);

    const typeErr = validateEnum(type, VALID_TYPES, 'type');
    if (typeErr) req.error(400, typeErr);

    const freqErr = validateEnum(frequency, VALID_FREQUENCIES, 'frequency');
    if (freqErr) req.error(400, freqErr);

    const statusErr = validateEnum(status, VALID_STATUSES, 'status');
    if (statusErr) req.error(400, statusErr);

    // Normalizar strings (URL, nombre, query...)
    normalizeStrings(req.data);
    if (!typeErr) validateByType(req, req.data);
  });

  this.after('CREATE', 'Watches', (data) => {
    if (data && SEARCH_TYPES.includes(data.type) && data.status !== 'PAUSED') {
      scheduleFirstCheck(data.ID);
    }
  });

  // ── Before UPDATE ──────────────────────────────────────

  this.before('UPDATE', 'Watches', async (req) => {
    const { name, type, frequency, status } = req.data;

    if (name !== undefined && (name === null || name.trim().length === 0)) {
      req.error(400, 'El nombre del Watch no puede estar vacío.');
    }

    if (type !== undefined) {
      const typeErr = validateEnum(type, VALID_TYPES, 'type');
      if (typeErr) req.error(400, typeErr);
    }

    if (frequency !== undefined) {
      const freqErr = validateEnum(frequency, VALID_FREQUENCIES, 'frequency');
      if (freqErr) req.error(400, freqErr);
    }

    if (status !== undefined) {
      const statusErr = validateEnum(status, VALID_STATUSES, 'status');
      if (statusErr) req.error(400, statusErr);
    }

    normalizeStrings(req.data);
    if (req.errors) return;

    const current = await SELECT.one.from(Watches).where({ ID: req.data.ID });
    if (!current) return; // CAP responde 404
    validateByType(req, { ...current, ...req.data });

    // Guardar qué cambió para el after-handler
    req._watchChanges = {
      searchChanged: ['query', 'location', 'type'].some((k) => k in req.data && req.data[k] !== current[k]),
      targetChanged: 'targetPrice' in req.data
        && Number(req.data.targetPrice ?? NaN) !== Number(current.targetPrice ?? NaN)
    };
  });

  this.after('UPDATE', 'Watches', async (data, req) => {
    const changes = req._watchChanges;
    if (!changes || !data) return;

    if (changes.searchChanged) {
      // Nueva búsqueda → resultados anteriores ya no aplican
      await engine.resetResults(data.ID);
      await UPDATE(Watches, data.ID).set({
        resultCount: 0, bestPrice: null, bestPriceSource: null, bestPriceUrl: null, lastCheckedAt: null
      });
    } else if (changes.targetChanged) {
      // Nuevo objetivo → volver a evaluar las ofertas actuales
      await UPDATE(Offers).set({ notifiedPrice: null }).where({ watch_ID: data.ID });
    }

    const w = await SELECT.one.from(Watches).columns('type', 'status').where({ ID: data.ID });
    if ((changes.searchChanged || changes.targetChanged) && w && SEARCH_TYPES.includes(w.type)
      && w.status !== 'PAUSED' && w.status !== 'ARCHIVED') {
      req.on('succeeded', () => scheduleFirstCheck(data.ID));
    }
  });

  // ── Acciones ───────────────────────────────────────────

  this.on('checkNow', 'Watches', async (req) => {
    const key = req.params[0];
    const id = typeof key === 'object' ? key.ID : key;
    const exists = await SELECT.one.from(Watches).columns('ID', 'type').where({ ID: id });
    if (!exists) return req.reject(404, 'Watch no encontrado.');
    if (!SEARCH_TYPES.includes(exists.type)) {
      return req.reject(400, 'Solo los Watches de empleo (JOB) o producto (PRODUCT) admiten búsqueda inmediata por ahora.');
    }
    return engine.runWatch(id, { trigger: 'MANUAL', useCurrentTx: true });
  });

  this.on('markAllNotificationsRead', async (req) => {
    const { watchId } = req.data;
    const where = watchId ? { isRead: false, watch_ID: watchId } : { isRead: false };
    const count = await UPDATE(Notifications).set({ isRead: true }).where(where);
    await resetTriggered(watchId);
    return count;
  });

  this.on('providers', () => providers.listProviders());

  // ── Notificaciones ─────────────────────────────────────

  this.before('UPDATE', 'Notifications', (req) => {
    const allowed = ['ID', 'isRead'];
    const invalid = Object.keys(req.data).filter((k) => !allowed.includes(k));
    if (invalid.length) req.error(400, `Solo se puede modificar 'isRead' de una notificación (recibido: ${invalid.join(', ')}).`);
  });

  this.after('UPDATE', 'Notifications', async (data) => {
    if (data && data.isRead) {
      const n = await SELECT.one.from(Notifications).columns('watch_ID').where({ ID: data.ID });
      if (n) await resetTriggered(n.watch_ID);
    }
  });

  /**
   * Un Watch TRIGGERED vuelve a ACTIVE cuando no le quedan notificaciones sin leer.
   */
  async function resetTriggered(watchId) {
    const triggered = await SELECT.from(Watches).columns('ID')
      .where(watchId ? { ID: watchId, status: 'TRIGGERED' } : { status: 'TRIGGERED' });
    for (const w of triggered) {
      const unread = await SELECT.one.from(Notifications).columns('ID')
        .where({ watch_ID: w.ID, isRead: false });
      if (!unread) await UPDATE(Watches, w.ID).set({ status: 'ACTIVE' });
    }
  }

};
