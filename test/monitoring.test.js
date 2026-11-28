/**
 * Pruebas de integración del monitoreo de búsquedas (JOB / PRODUCT).
 *
 * En el perfil [test] todos los providers reales y mock están deshabilitados;
 * aquí se registran providers falsos controlables para simular publicaciones
 * nuevas y cambios de precio de forma determinista.
 */
const cds = require('@sap/cds');
const path = require('path');
const providers = require('../srv/monitoring/providers');
const scheduler = require('../srv/monitoring/scheduler');

const PROJECT_ROOT = path.join(__dirname, '..');

const fakeJobs = { items: [], fail: false };
const fakeShop = { items: [] };

providers.register({
  name: 'test-jobs',
  kind: 'JOB',
  label: 'Test Jobs',
  async search() {
    if (fakeJobs.fail) throw new Error('caído');
    return fakeJobs.items;
  }
});

providers.register({
  name: 'test-shop',
  kind: 'PRODUCT',
  label: 'Test Shop',
  async search() { return fakeShop.items; }
});

const job = (id, title, extra = {}) => ({
  id, source: 'LinkedIn', title, company: 'ACME', location: 'Bogotá, Colombia',
  remote: false, url: `https://jobs.example.com/${id}`, publishedAt: new Date().toISOString(), ...extra
});

const offer = (id, source, price, extra = {}) => ({
  id, source, title: 'Tenis New Balance 550 Blanco', url: `https://shop.example.com/${id}`,
  price, currency: 'COP', ...extra
});

describe('Monitoreo de búsquedas', () => {

  const { GET, POST, PATCH } = cds.test(PROJECT_ROOT);

  beforeEach(() => {
    fakeJobs.items = [];
    fakeJobs.fail = false;
    fakeShop.items = [];
  });

  async function checkNow(id) {
    const { data } = await POST(`/api/Watches(${id})/WatchService.checkNow`, {});
    return data;
  }

  async function notificationsOf(id) {
    const { data } = await GET(`/api/Notifications?$filter=watch_ID eq ${id}&$orderby=createdAt asc`);
    return data.value;
  }

  // ── Validaciones ──────────────────────────────────

  it('crea un Watch de empleo sin URL', async () => {
    const { status, data } = await POST('/api/Watches', {
      name: 'SAP Architect BTP', type: 'JOB', query: 'SAP Architect BTP', location: 'Colombia'
    });
    expect(status).toBe(201);
    expect(data.url).toBeNull();
    expect(data.currency).toBe('COP');
    expect(data.category).toBe('JOB_SAP_ERP');
  });

  it('autocompleta query desde el nombre e infiere la categoría automáticamente sin URL', async () => {
    const { status, data } = await POST('/api/Watches', {
      name: 'Tenis New Balance 550', type: 'PRODUCT'
    });
    expect(status).toBe(201);
    expect(data.query).toBe('Tenis New Balance 550');
    expect(data.category).toBe('PROD_FOOTWEAR');
  });

  it('rechaza un Watch de búsqueda con nombre/query demasiado corto', async () => {
    await expect(POST('/api/Watches', { name: 'A', type: 'JOB', query: 'A' }))
      .rejects.toMatchObject({ response: { status: 400 } });
  });

  it('devuelve sugerencias de autocompletado y catálogo de categorías', async () => {
    const { data: catData } = await GET('/api/categories(type=\'JOB\')');
    expect(catData.value.length).toBeGreaterThanOrEqual(5);
    expect(catData.value.map((c) => c.code)).toContain('JOB_SAP_ERP');

    const { data: sugJobs } = await GET('/api/suggest(term=\'sap\',type=\'JOB\',category=\'\')');
    expect(sugJobs.value.length).toBeGreaterThan(0);
    expect(sugJobs.value[0].category).toBe('JOB_SAP_ERP');

    const { data: sugProd } = await GET('/api/suggest(term=\'new balance\',type=\'PRODUCT\',category=\'\')');
    expect(sugProd.value.length).toBeGreaterThan(0);
    expect(sugProd.value[0].category).toBe('PROD_FOOTWEAR');
    expect(Number(sugProd.value[0].targetPrice)).toBeGreaterThan(0);
  });

  it('rechaza un precio objetivo inválido', async () => {
    await expect(POST('/api/Watches', {
      name: 'NB', type: 'PRODUCT', query: 'New Balance 550', targetPrice: -5
    })).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('rechaza un email de notificación inválido', async () => {
    await expect(POST('/api/Watches', {
      name: 'NB', type: 'PRODUCT', query: 'New Balance 550', notifyEmail: 'no-es-email'
    })).rejects.toMatchObject({ response: { status: 400 } });
  });

  // ── Empleos ───────────────────────────────────────

  it('notifica cada oferta de empleo nueva y no repite las ya vistas', async () => {
    const { data: w } = await POST('/api/Watches', {
      name: 'SAP BTP', type: 'JOB', query: 'SAP Architect BTP', location: 'Colombia'
    });

    // 1ª ejecución: baseline (resumen) + filtra irrelevantes / otra ubicación
    fakeJobs.items = [
      job('1', 'SAP BTP Architect'),
      job('2', 'Senior SAP BTP Solution Architect', { location: 'Remote', remote: true }),
      job('3', 'Java Developer'),
      job('4', 'SAP BTP Architect', { company: 'Otra', location: 'Madrid, España' })
    ];
    let run = await checkNow(w.ID);
    expect(run.status).toBe('SUCCESS');
    expect(run.newItems).toBe(2);
    let notes = await notificationsOf(w.ID);
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe('JOBS_BASELINE');

    // 2ª ejecución: misma data → nada nuevo
    run = await checkNow(w.ID);
    expect(run.newItems).toBe(0);
    expect(await notificationsOf(w.ID)).toHaveLength(1);

    // 3ª ejecución: se publica una oferta nueva
    fakeJobs.items.push(job('5', 'Arquitecto SAP BTP Integration Suite', { company: 'NTT DATA' }));
    run = await checkNow(w.ID);
    expect(run.newItems).toBe(1);
    notes = await notificationsOf(w.ID);
    expect(notes).toHaveLength(2);
    expect(notes[1].kind).toBe('NEW_JOB');
    expect(notes[1].title).toContain('Arquitecto SAP BTP');
    expect(notes[1].url).toBe('https://jobs.example.com/5');

    const { data: watch } = await GET(`/api/Watches(${w.ID})?$expand=jobs`);
    expect(watch.status).toBe('TRIGGERED');
    expect(watch.jobs).toHaveLength(3);
    expect(watch.resultCount).toBe(3);
    expect(watch.lastCheckedAt).toBeTruthy();
  });

  it('registra errores de providers sin romper la ejecución', async () => {
    const { data: w } = await POST('/api/Watches', { name: 'Fallo', type: 'JOB', query: 'SAP Architect BTP' });
    fakeJobs.fail = true;
    const run = await checkNow(w.ID);
    expect(['PARTIAL', 'FAILED']).toContain(run.status);
    expect(run.errors).toContain('Test Jobs');
    const { data } = await GET(`/api/Watches(${w.ID})?$expand=runs`);
    expect(data.lastError).toContain('caído');
    expect(data.runs).toHaveLength(1);
  });

  // ── Productos ─────────────────────────────────────

  it('compara precios entre plataformas y notifica al alcanzar el precio objetivo', async () => {
    const { data: w } = await POST('/api/Watches', {
      name: 'NB 550', type: 'PRODUCT', query: 'tenis New Balance 550', targetPrice: 450000
    });

    fakeShop.items = [
      offer('a', 'Amazon', 599900),
      offer('b', 'Falabella', 549900),
      offer('c', 'MercadoLibre', 520000),
      offer('d', 'MercadoLibre', 19900, { title: 'Cordones New Balance 550' }), // outlier
      offer('e', 'Dafiti', 300000, { title: 'New Balance 574' })              // no coincide
    ];
    let run = await checkNow(w.ID);
    expect(run.found).toBe(4);
    expect(run.notified).toBe(0);

    let { data: watch } = await GET(`/api/Watches(${w.ID})?$expand=offers($orderby=price)`);
    expect(Number(watch.bestPrice)).toBe(520000);
    expect(watch.bestPriceSource).toBe('MercadoLibre');
    expect(watch.offers).toHaveLength(4);
    expect(watch.offers[0].outlier).toBe(true);

    // Super descuento en Falabella
    fakeShop.items[1] = offer('b', 'Falabella', 399900, { originalPrice: 549900 });
    run = await checkNow(w.ID);
    expect(run.notified).toBe(1);
    const notes = await notificationsOf(w.ID);
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe('TARGET_PRICE');
    expect(notes[0].message).toContain('Falabella');
    expect(notes[0].url).toBe('https://shop.example.com/b');

    ({ data: watch } = await GET(`/api/Watches(${w.ID})?$expand=offers($filter=source eq 'Falabella';$expand=history)`));
    expect(Number(watch.bestPrice)).toBe(399900);
    expect(Number(watch.offers[0].lowestPrice)).toBe(399900);
    expect(watch.offers[0].history).toHaveLength(2);

    // Mismo precio → no se repite la alerta; si baja más, sí
    run = await checkNow(w.ID);
    expect(run.notified).toBe(0);
    fakeShop.items[1] = offer('b', 'Falabella', 379900);
    run = await checkNow(w.ID);
    expect(run.notified).toBe(1);
  });

  it('reevalúa las ofertas cuando cambia el precio objetivo', async () => {
    const { data: w } = await POST('/api/Watches', {
      name: 'NB objetivo', type: 'PRODUCT', query: 'New Balance 550', targetPrice: 100000
    });
    fakeShop.items = [offer('x', 'Amazon', 500000), offer('y', 'Éxito', 480000), offer('z', 'Falabella', 510000)];
    expect((await checkNow(w.ID)).notified).toBe(0);

    await PATCH(`/api/Watches(${w.ID})`, { targetPrice: 490000 });
    const run = await checkNow(w.ID);
    expect(run.notified).toBe(1);
  });

  // ── Bandeja ───────────────────────────────────────

  it('marca notificaciones como leídas y el Watch vuelve a ACTIVE', async () => {
    const { data: w } = await POST('/api/Watches', { name: 'Leer', type: 'JOB', query: 'SAP Architect BTP' });
    fakeJobs.items = [job('r1', 'SAP BTP Architect Lead')];
    await checkNow(w.ID);

    let { data: watch } = await GET(`/api/Watches(${w.ID})`);
    expect(watch.status).toBe('TRIGGERED');

    const { data: count } = await POST('/api/markAllNotificationsRead', { watchId: w.ID });
    expect(count.value).toBeGreaterThanOrEqual(1);
    ({ data: watch } = await GET(`/api/Watches(${w.ID})`));
    expect(watch.status).toBe('ACTIVE');
  });

  it('no permite modificar el contenido de una notificación', async () => {
    const { data: w } = await POST('/api/Watches', { name: 'Inmutable', type: 'JOB', query: 'SAP Architect BTP' });
    fakeJobs.items = [job('i1', 'SAP BTP Architect')];
    await checkNow(w.ID);
    const [n] = await notificationsOf(w.ID);
    await expect(PATCH(`/api/Notifications(${n.ID})`, { title: 'hack' }))
      .rejects.toMatchObject({ response: { status: 400 } });
    const { status } = await PATCH(`/api/Notifications(${n.ID})`, { isRead: true });
    expect(status).toBe(200);
  });

  it('no permite búsqueda inmediata en Watches de URL', async () => {
    const { data: w } = await POST('/api/Watches', { name: 'URL', url: 'https://example.com' });
    await expect(POST(`/api/Watches(${w.ID})/WatchService.checkNow`, {}))
      .rejects.toMatchObject({ response: { status: 400 } });
  });

  // ── Scheduler / providers ─────────────────────────

  it('el scheduler solo considera Watches de búsqueda vencidos', async () => {
    const { data: w } = await POST('/api/Watches', { name: 'Vencido', type: 'JOB', query: 'SAP Architect BTP' });
    let due = await scheduler.dueWatches();
    expect(due.map((d) => d.ID)).toContain(w.ID);

    fakeJobs.items = [];
    await checkNow(w.ID);
    due = await scheduler.dueWatches();
    expect(due.map((d) => d.ID)).not.toContain(w.ID);

    // Una hora y un minuto después, un Watch HOURLY vuelve a estar vencido
    await PATCH(`/api/Watches(${w.ID})`, { frequency: 'HOURLY' });
    due = await scheduler.dueWatches(Date.now() + 61 * 60000);
    expect(due.map((d) => d.ID)).toContain(w.ID);
  });

  it('lista los providers y su disponibilidad', async () => {
    const { data } = await GET('/api/providers()');
    const byName = Object.fromEntries(data.value.map((p) => [p.name, p]));
    expect(byName['test-jobs'].enabled).toBe(true);
    expect(byName.remotive.enabled).toBe(false);
    expect(byName['serpapi-google-shopping']).toBeDefined();
  });

  it('calcula Deal Score, veredicto de compra, permite gestionar postulaciones y expone insights de retención', async () => {
    const { data: wProd } = await POST('/api/Watches', {
      name: 'NB Deal Score', type: 'PRODUCT', query: 'New Balance 550', targetPrice: 450000
    });
    fakeShop.items = [
      offer('ds1', 'Falabella', 380000, { originalPrice: 540000 }),
      offer('ds2', 'Amazon', 520000),
      offer('ds3', 'Éxito', 530000)
    ];
    await checkNow(wProd.ID);

    const { data: prodDetail } = await GET(`/api/Watches(${wProd.ID})?$expand=offers($orderby=price)`);
    expect(prodDetail.offers[0].recommendation).toBe('BUY_NOW');
    expect(prodDetail.offers[0].dealScore).toBeGreaterThanOrEqual(80);
    expect(prodDetail.offers[0].discountPct).toBeGreaterThanOrEqual(25);

    const { data: wJob } = await POST('/api/Watches', {
      name: 'SAP Tracker', type: 'JOB', query: 'SAP Architect BTP'
    });
    fakeJobs.items = [job('jt1', 'SAP BTP Solution Architect')];
    await checkNow(wJob.ID);

    const { data: jobDetail } = await GET(`/api/Watches(${wJob.ID})?$expand=jobs`);
    const jobId = jobDetail.jobs[0].ID;
    expect(jobDetail.jobs[0].applicationStatus).toBe('NEW');

    const { status: patchStatus, data: updatedJob } = await PATCH(`/api/JobPostings(${jobId})`, {
      applicationStatus: 'APPLIED',
      isSaved: true
    });
    expect(patchStatus).toBe(200);
    expect(updatedJob.applicationStatus).toBe('APPLIED');
    expect(updatedJob.isSaved).toBe(true);

    const { data: insights } = await GET('/api/insights()');
    expect(insights.buyNowDeals).toBeGreaterThanOrEqual(1);
    expect(Number(insights.totalSavingsCop)).toBeGreaterThanOrEqual(160000);
    expect(insights.appliedJobs).toBeGreaterThanOrEqual(1);
    expect(insights.savedJobs).toBeGreaterThanOrEqual(1);
  });

});

