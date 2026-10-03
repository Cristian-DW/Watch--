/**
 * Pruebas CRUD básicas para WatchService.
 *
 * Utiliza cds.test() para levantar el servidor CAP
 * en memoria (SQLite) y ejecuta peticiones HTTP
 * directas contra la API OData.
 */
const cds = require('@sap/cds');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

describe('WatchService — CRUD', () => {

  const { GET, POST, PATCH, DELETE } = cds.test(PROJECT_ROOT);

  // ── CREATE ─────────────────────────────────────────

  it('debe crear un Watch correctamente', async () => {
    const { status, data } = await POST('/api/Watches', {
      name: 'Test Watch',
      url:  'https://www.ejemplo.com/producto',
      type: 'PRICE',
      frequency: 'DAILY'
    });

    expect(status).toBe(201);
    expect(data).toHaveProperty('ID');
    expect(data.name).toBe('Test Watch');
    expect(data.url).toBe('https://www.ejemplo.com/producto');
    expect(data.type).toBe('PRICE');
    expect(data.frequency).toBe('DAILY');
    expect(data.status).toBe('ACTIVE');
  });

  it('debe rechazar un Watch sin nombre', async () => {
    try {
      await POST('/api/Watches', {
        url: 'https://www.ejemplo.com'
      });
      fail('Se esperaba un error');
    } catch (e) {
      expect(e.response.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('debe rechazar un Watch sin URL', async () => {
    try {
      await POST('/api/Watches', {
        name: 'Sin URL'
      });
      fail('Se esperaba un error');
    } catch (e) {
      expect(e.response.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('debe rechazar una URL inválida', async () => {
    try {
      await POST('/api/Watches', {
        name: 'URL mala',
        url:  'ftp://invalid'
      });
      fail('Se esperaba un error');
    } catch (e) {
      expect(e.response.status).toBeGreaterThanOrEqual(400);
    }
  });

  // ── READ ───────────────────────────────────────────

  it('debe listar Watches', async () => {
    // Crear dos watches para tener datos
    await POST('/api/Watches', {
      name: 'Watch A',
      url:  'https://a.com',
      type: 'STOCK',
      frequency: 'HOURLY'
    });
    await POST('/api/Watches', {
      name: 'Watch B',
      url:  'https://b.com',
      type: 'CONTENT',
      frequency: 'WEEKLY'
    });

    const { status, data } = await GET('/api/Watches');
    expect(status).toBe(200);
    expect(data.value).toBeDefined();
    expect(data.value.length).toBeGreaterThanOrEqual(2);
  });

  it('debe obtener un Watch por ID', async () => {
    const { data: created } = await POST('/api/Watches', {
      name: 'Watch por ID',
      url:  'https://porId.com'
    });

    const { status, data } = await GET(`/api/Watches(${created.ID})`);
    expect(status).toBe(200);
    expect(data.name).toBe('Watch por ID');
  });

  // ── UPDATE ─────────────────────────────────────────

  it('debe actualizar un Watch', async () => {
    const { data: created } = await POST('/api/Watches', {
      name: 'Watch Original',
      url:  'https://original.com'
    });

    const { status, data } = await PATCH(`/api/Watches(${created.ID})`, {
      name:   'Watch Actualizado',
      status: 'PAUSED'
    });

    expect(status).toBe(200);
    expect(data.name).toBe('Watch Actualizado');
    expect(data.status).toBe('PAUSED');
  });

  it('debe rechazar un update con URL inválida', async () => {
    const { data: created } = await POST('/api/Watches', {
      name: 'Watch para update malo',
      url:  'https://original.com'
    });

    try {
      await PATCH(`/api/Watches(${created.ID})`, {
        url: 'sin-protocolo.com'
      });
      fail('Se esperaba un error');
    } catch (e) {
      expect(e.response.status).toBeGreaterThanOrEqual(400);
    }
  });

  // ── DELETE ─────────────────────────────────────────

  it('debe eliminar un Watch', async () => {
    const { data: created } = await POST('/api/Watches', {
      name: 'Watch a borrar',
      url:  'https://borrar.com'
    });

    const { status } = await DELETE(`/api/Watches(${created.ID})`);
    expect(status).toBe(204);

    // Verificar que ya no existe
    try {
      await GET(`/api/Watches(${created.ID})`);
      fail('Se esperaba un error 404');
    } catch (e) {
      expect(e.response.status).toBe(404);
    }
  });

});
