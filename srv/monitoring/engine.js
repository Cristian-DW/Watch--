/**
 * Monitoring Engine — ejecuta un Watch de búsqueda (JOB / PRODUCT).
 *
 * Flujo de una ejecución:
 *   1. Consulta en paralelo todos los providers habilitados del tipo del Watch.
 *   2. Filtra resultados por relevancia (palabras clave, ubicación).
 *   3. Persiste novedades (deduplicación) e histórico de precios.
 *   4. Evalúa reglas de notificación:
 *        JOB     → toda oferta de empleo nueva genera notificación
 *                  (la primera ejecución genera un resumen "baseline").
 *        PRODUCT → precio ≤ precio objetivo (sin repetir alertas por el mismo precio).
 *   5. Actualiza el estado del Watch, registra la ejecución y entrega emails.
 */
const cds = require('@sap/cds');
const { getConfig } = require('./config');
const { parseQuery, matchText, matchLocation, normalize } = require('./matching');
const providers = require('./providers');
const notifier = require('./notifier');

const LOG = cds.log('watch-engine');
const SEARCH_TYPES = ['JOB', 'PRODUCT'];
const running = new Set();

// ── Helpers ──────────────────────────────────────────────

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

function money(value, currency) {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      maximumFractionDigits: currency === 'COP' || !currency ? 0 : 2
    }).format(value);
  } catch {
    return `${value} ${currency || ''}`.trim();
  }
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Calcula el Deal Score (0..100), el porcentaje de descuento real y el veredicto de compra.
 * Factores:
 *  - Descuento vs. precio original (tachado) o mediana del mercado.
 *  - Cumplimiento o mejora respecto al targetPrice del usuario.
 *  - Mínimo histórico (all-time low).
 */
function evaluateOffer({ price, originalPrice, lowestPrice, targetPrice, medianPrice, outlier }) {
  if (outlier) {
    return { dealScore: 0, discountPct: 0, recommendation: 'OUTLIER' };
  }

  const refPrice = (originalPrice && originalPrice > price)
    ? originalPrice
    : (medianPrice && medianPrice > price ? medianPrice : null);

  const discountPct = refPrice ? Math.max(0, Math.round((1 - price / refPrice) * 100)) : 0;

  let score = 45;
  // 1. Aporte por descuento porcentual (hasta +30 pts)
  score += Math.min(30, Math.round(discountPct * 1.1));

  // 2. Aporte frente al precio objetivo del usuario
  if (targetPrice && targetPrice > 0) {
    if (price <= targetPrice) {
      const belowPct = Math.round((1 - price / targetPrice) * 100);
      score += 20 + Math.min(15, belowPct);
    } else {
      const overPct = Math.round((price / targetPrice - 1) * 100);
      score -= Math.min(25, overPct);
    }
  } else if (medianPrice && price <= medianPrice) {
    score += 10;
  }

  // 3. Aporte por mínimo histórico
  if (!lowestPrice || price <= lowestPrice) {
    score += 10;
  }

  const dealScore = Math.max(5, Math.min(100, score));
  let recommendation = 'WAIT';
  if ((targetPrice && price <= targetPrice) || dealScore >= 80 || discountPct >= 25) {
    recommendation = 'BUY_NOW';
  } else if (dealScore >= 62 || discountPct >= 12 || (medianPrice && price < medianPrice * 0.95)) {
    recommendation = 'GOOD_DEAL';
  }

  return { dealScore, discountPct, recommendation };
}

// ── 1 + 2. Recolección y filtrado ────────────────────────

async function collect(watch, cfg) {
  const spec = parseQuery(watch.query);
  const active = providers.activeProviders(watch.type);
  const errors = [];
  const okProviders = new Set();
  let items = [];

  if (!active.length) {
    errors.push(`No hay providers habilitados para ${watch.type}.`);
    return { items, errors, okProviders, total: 0 };
  }

  const params = {
    query: spec.searchText,
    location: watch.location || null,
    currency: watch.currency || cfg.currency,
    limit: 50
  };

  const settled = await Promise.allSettled(
    active.map((p) => providers.runSearch(p, params, { timeoutMs: cfg.engine.providerTimeoutMs }))
  );

  settled.forEach((res, i) => {
    const p = active[i];
    if (res.status === 'fulfilled') {
      okProviders.add(p.name);
      items.push(...res.value.map((it) => ({ ...it, provider: p.name })));
    } else {
      LOG.warn(`Provider ${p.name} falló para el Watch ${watch.ID}:`, res.reason?.message);
      errors.push(`${p.label}: ${res.reason?.message || res.reason}`);
    }
  });

  const total = items.length;
  const minScore = cfg.matching.minScore;

  if (watch.type === 'JOB') {
    items = items.filter((j) => j.title && j.url
      && matchText(spec, `${j.title} ${(j.tags || []).join(' ')}`, minScore).matched
      && matchLocation(watch.location, j.location, j.remote));
  } else {
    items = items.filter((o) => o.title && Number(o.price) > 0
      && matchText(spec, o.title, minScore).matched);
  }

  return { items, errors, okProviders, total, failedAll: okProviders.size === 0 };
}

// ── 3 + 4. Persistencia y reglas: empleos ────────────────

async function persistJobs(watch, items, now, cfg) {
  const { JobPostings } = cds.entities('watch');
  const existing = await SELECT.from(JobPostings)
    .columns('externalId', 'title', 'company')
    .where({ watch_ID: watch.ID });

  const dedupeKey = (title, company) => `${normalize(title).trim()}|${normalize(company).trim()}`;
  const seenIds = new Set(existing.map((e) => e.externalId));
  const seenKeys = new Set(existing.map((e) => dedupeKey(e.title, e.company)));
  const fresh = [];

  for (const j of items) {
    const externalId = truncate(`${j.provider}:${j.id}`, 512);
    const key = dedupeKey(j.title, j.company);
    if (seenIds.has(externalId) || seenKeys.has(key)) continue;
    seenIds.add(externalId);
    seenKeys.add(key);
    fresh.push({
      ID: cds.utils.uuid(),
      watch_ID: watch.ID,
      externalId,
      provider: j.provider,
      source: truncate(j.source, 255),
      title: truncate(j.title, 512),
      company: truncate(j.company, 255),
      location: truncate(j.location, 255),
      remote: Boolean(j.remote),
      salary: j.salary ? truncate(j.salary, 255) : null,
      url: truncate(j.url, 2048),
      publishedAt: j.publishedAt || null,
      firstSeenAt: now
    });
  }

  if (fresh.length) await INSERT.into(JobPostings).entries(fresh);

  fresh.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  const notifications = [];
  const label = watch.query || watch.name;
  const line = (j) => `${j.title} · ${j.company || 'Empresa confidencial'} · ${j.location || ''}`.trim();

  if (fresh.length && existing.length === 0) {
    notifications.push({
      kind: 'JOBS_BASELINE',
      title: `${fresh.length} ofertas activas para "${label}"`,
      message: fresh.slice(0, 3).map(line).join('\n') + (fresh.length > 3 ? `\n… y ${fresh.length - 3} más.` : ''),
      url: fresh[0].url
    });
  } else if (fresh.length > cfg.engine.maxPerNotificationBatch) {
    notifications.push({
      kind: 'NEW_JOB',
      title: `${fresh.length} nuevas ofertas para "${label}"`,
      message: fresh.slice(0, 5).map(line).join('\n') + `\n… y ${fresh.length - 5} más.`,
      url: fresh[0].url
    });
  } else {
    for (const j of fresh) {
      notifications.push({
        kind: 'NEW_JOB',
        title: truncate(`Nueva oferta: ${j.title}`, 255),
        message: `${j.company || 'Empresa confidencial'} · ${j.location || 'Ubicación no indicada'} · vía ${j.source}`
          + (j.salary ? ` · ${j.salary}` : ''),
        url: j.url
      });
    }
  }

  return {
    newItems: fresh.length,
    notifications,
    watchUpdate: { resultCount: existing.length + fresh.length }
  };
}

// ── 3 + 4. Persistencia y reglas: productos ──────────────

async function persistOffers(watch, items, okProviders, now, cfg) {
  const { Offers, PriceSnapshots } = cds.entities('watch');
  const existing = await SELECT.from(Offers).where({ watch_ID: watch.ID });
  const byExt = new Map(existing.map((o) => [o.externalId, o]));
  const currency = watch.currency || cfg.currency;
  const target = num(watch.targetPrice);

  // Deduplicar dentro de la misma ejecución
  const unique = new Map();
  for (const it of items) unique.set(truncate(`${it.provider}:${it.id}`, 512), it);

  const comparable = [...unique.values()].filter((o) => !o.currency || o.currency === currency);
  const med = comparable.length >= 3 ? median(comparable.map((o) => Number(o.price))) : null;
  const isOutlier = (price) => med !== null && price < med * cfg.matching.outlierRatio;

  const seen = new Set();
  const snapshots = [];
  const hits = [];
  let newItems = 0;
  let best = null;

  for (const [externalId, it] of unique) {
    const price = Number(it.price);
    const itemCurrency = it.currency || currency;
    const outlier = itemCurrency === currency && isOutlier(price);
    const prev = byExt.get(externalId);
    const originalPrice = num(it.originalPrice);
    const lowestPrice = prev ? Math.min(num(prev.lowestPrice) ?? price, price) : price;
    const intel = evaluateOffer({
      price,
      originalPrice,
      lowestPrice,
      targetPrice: itemCurrency === currency ? target : null,
      medianPrice: itemCurrency === currency ? med : null,
      outlier
    });
    const row = {
      provider: it.provider,
      source: truncate(it.source, 255),
      title: truncate(it.title, 512),
      url: truncate(it.url, 2048),
      imageUrl: it.imageUrl ? truncate(it.imageUrl, 2048) : null,
      price,
      originalPrice,
      currency: itemCurrency,
      lowestPrice,
      available: true,
      outlier,
      dealScore: intel.dealScore,
      discountPct: intel.discountPct,
      recommendation: intel.recommendation,
      lastSeenAt: now
    };
    let offerId;

    if (prev) {
      offerId = prev.ID;
      const prevPrice = num(prev.price);
      await UPDATE(Offers, offerId).set(row);
      if (prevPrice !== price) snapshots.push({ offer_ID: offerId, price, capturedAt: now });
    } else {
      offerId = cds.utils.uuid();
      newItems++;
      await INSERT.into(Offers).entries({
        ID: offerId, watch_ID: watch.ID, externalId, ...row, firstSeenAt: now
      });
      snapshots.push({ offer_ID: offerId, price, capturedAt: now });
    }
    seen.add(offerId);

    const eligible = !outlier && itemCurrency === currency;
    if (!eligible) continue;
    if (!best || price < best.price) best = { price, source: row.source, url: row.url };

    const notifiedPrice = prev ? num(prev.notifiedPrice) : null;
    if (target !== null && price <= target && (notifiedPrice === null || price < notifiedPrice)) {
      hits.push({ offerId, price, row });
    }
  }

  if (snapshots.length) {
    await INSERT.into(PriceSnapshots).entries(snapshots.map((s) => ({ ID: cds.utils.uuid(), ...s })));
  }

  // Ofertas que ya no aparecen (solo si su provider respondió bien)
  const gone = existing.filter((o) => !seen.has(o.ID) && o.available && okProviders.has(o.provider));
  if (gone.length) {
    await UPDATE(Offers).set({ available: false }).where({ ID: { in: gone.map((o) => o.ID) } });
  }

  const notifications = [];
  if (hits.length) {
    hits.sort((a, b) => a.price - b.price);
    for (const h of hits) await UPDATE(Offers, h.offerId).set({ notifiedPrice: h.price });

    const top = hits[0];
    const discount = top.row.originalPrice && top.row.originalPrice > top.price
      ? ` (−${Math.round((1 - top.price / top.row.originalPrice) * 100)} % vs. precio anterior)`
      : '';
    notifications.push({
      kind: 'TARGET_PRICE',
      title: truncate(`¡Super descuento! ${watch.query || watch.name} a ${money(top.price, currency)}`, 255),
      message: `${top.row.source}: ${top.row.title} por ${money(top.price, currency)}${discount}. `
        + `Tu precio objetivo es ${money(target, currency)}.`
        + (hits.length > 1 ? ` Hay ${hits.length - 1} oferta(s) más bajo tu objetivo.` : ''),
      url: top.row.url
    });
  }

  return {
    newItems,
    notifications,
    watchUpdate: {
      resultCount: seen.size,
      bestPrice: best ? best.price : null,
      bestPriceSource: best ? best.source : null,
      bestPriceUrl: best ? best.url : null
    }
  };
}

// ── API pública ──────────────────────────────────────────

/**
 * Ejecuta un Watch.
 * @param {string} watchId
 * @param {object} [opts]
 * @param {'SCHEDULER'|'MANUAL'|'CREATE'} [opts.trigger]
 * @param {boolean} [opts.useCurrentTx] usar la transacción del request actual (acciones OData)
 * @returns {Promise<{status, found, newItems, notified, errors}>}
 */
async function runWatch(watchId, { trigger = 'MANUAL', useCurrentTx = false } = {}) {
  if (running.has(watchId)) {
    return { status: 'SKIPPED', found: 0, newItems: 0, notified: 0, errors: 'Ya hay una ejecución en curso.' };
  }
  running.add(watchId);
  const inTx = (fn) => (useCurrentTx ? fn() : cds.tx(fn));

  try {
    const cfg = getConfig();
    const { Watches, WatchRuns, Notifications } = cds.entities('watch');
    const startedAt = new Date().toISOString();
    const watch = await inTx(() => SELECT.one.from(Watches).where({ ID: watchId }));
    if (!watch) return { status: 'FAILED', found: 0, newItems: 0, notified: 0, errors: 'Watch no encontrado.' };

    if (!SEARCH_TYPES.includes(watch.type)) {
      return {
        status: 'SKIPPED', found: 0, newItems: 0, notified: 0,
        errors: 'El monitoreo de URLs (scraping) aún no está disponible; solo JOB y PRODUCT.'
      };
    }

    const { items, errors, okProviders, total, failedAll } = await collect(watch, cfg);
    const now = new Date().toISOString();
    const status = failedAll ? 'FAILED' : errors.length ? 'PARTIAL' : 'SUCCESS';

    const outcome = await inTx(async () => {
      let res = { newItems: 0, notifications: [], watchUpdate: {} };
      if (!failedAll) {
        res = watch.type === 'JOB'
          ? await persistJobs(watch, items, now, cfg)
          : await persistOffers(watch, items, okProviders, now, cfg);
      }

      const created = res.notifications.map((n) => ({
        ID: cds.utils.uuid(),
        watch_ID: watch.ID,
        kind: n.kind,
        title: truncate(n.title, 255),
        message: truncate(n.message, 2048),
        url: n.url ? truncate(n.url, 2048) : null,
        isRead: false,
        emailStatus: 'SKIPPED'
      }));
      if (created.length) await INSERT.into(Notifications).entries(created);

      const errorText = errors.length ? truncate(errors.join(' | '), 1024) : null;
      await UPDATE(Watches, watch.ID).set({
        ...res.watchUpdate,
        lastCheckedAt: now,
        lastError: errorText,
        ...(created.length && watch.status === 'ACTIVE' ? { status: 'TRIGGERED' } : {})
      });

      await INSERT.into(WatchRuns).entries({
        ID: cds.utils.uuid(),
        watch_ID: watch.ID,
        startedAt,
        finishedAt: new Date().toISOString(),
        trigger,
        status,
        found: total,
        newItems: res.newItems,
        notified: created.length,
        errors: errors.length ? truncate(errors.join(' | '), 2048) : null
      });

      const old = await SELECT.from(WatchRuns).columns('ID')
        .where({ watch_ID: watch.ID })
        .orderBy('startedAt desc')
        .limit(1000, cfg.engine.maxRunsKept);
      if (old.length) await DELETE.from(WatchRuns).where({ ID: { in: old.map((r) => r.ID) } });

      return { newItems: res.newItems, created, matched: items.length };
    });

    const deliver = () => notifier.deliver(watch, outcome.created)
      .catch((e) => LOG.error('Error entregando notificaciones:', e.message));
    if (useCurrentTx && cds.context?.on) cds.context.on('succeeded', deliver);
    else await deliver();

    LOG.info(`Watch ${watch.ID} (${watch.type}) → ${status}: ${outcome.matched}/${total} relevantes, `
      + `${outcome.newItems} nuevos, ${outcome.created.length} notificaciones.`);

    return {
      status,
      found: outcome.matched,
      newItems: outcome.newItems,
      notified: outcome.created.length,
      errors: errors.length ? errors.join(' | ') : null
    };
  } finally {
    running.delete(watchId);
  }
}

/**
 * Elimina resultados previos (cuando cambia la búsqueda del Watch).
 */
async function resetResults(watchId) {
  const { JobPostings, Offers, PriceSnapshots } = cds.entities('watch');
  const offers = await SELECT.from(Offers).columns('ID').where({ watch_ID: watchId });
  if (offers.length) {
    await DELETE.from(PriceSnapshots).where({ offer_ID: { in: offers.map((o) => o.ID) } });
  }
  await DELETE.from(Offers).where({ watch_ID: watchId });
  await DELETE.from(JobPostings).where({ watch_ID: watchId });
}

module.exports = { runWatch, resetResults, SEARCH_TYPES, evaluateOffer, _internal: { collect, median, money } };
