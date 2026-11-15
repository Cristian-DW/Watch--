/**
 * Mock Shop — comparador de precios simulado para desarrollo y demos (sin red).
 *
 * Devuelve el producto buscado en varias tiendas con precios en COP.
 * Cada `repriceMinutes` los precios fluctúan y, con cierta probabilidad,
 * aparece un "flash sale" (−30 % a −40 %) para poder probar las alertas
 * de precio objetivo. Incluye un accesorio barato para ilustrar la
 * detección de precios atípicos (outliers).
 */
const { rand, titleCase } = require('./mock-utils');

const STORES = ['Amazon', 'MercadoLibre', 'Falabella', 'Éxito', 'Dafiti', 'Tienda oficial'];

function roundCop(value) {
  return Math.max(900, Math.round(value / 1000) * 1000 - 100);
}

module.exports = {
  name: 'mock-shop',
  kind: 'PRODUCT',
  label: 'Tiendas simuladas',
  defaultEnabled: false,

  async search({ query }, { config }) {
    const q = String(query).trim();
    const slot = Math.floor(Date.now() / ((config.repriceMinutes || 30) * 60000));
    const base = 250000 + Math.floor(rand(`${q}|base`) * 950000);
    const name = titleCase(q);

    const items = STORES.map((store) => {
      const listPrice = base * (0.92 + rand(`${q}|${store}`) * 0.22);
      const drift = 0.95 + rand(`${q}|${store}|${slot}|drift`) * 0.1;
      const flash = rand(`${q}|${store}|${slot}|flash`) < (config.flashProbability ?? 0.12);
      const price = flash
        ? listPrice * (0.6 + rand(`${q}|${store}|${slot}|deep`) * 0.1)
        : listPrice * drift;
      return {
        id: `mock-${store}-${q}`,
        source: store,
        title: `${name} ${store === 'Tienda oficial' ? '- Original' : ''}`.trim(),
        url: `https://example.com/${encodeURIComponent(store)}/${encodeURIComponent(q)}`,
        imageUrl: null,
        price: roundCop(price),
        originalPrice: flash ? roundCop(listPrice) : null,
        currency: 'COP'
      };
    });

    items.push({
      id: `mock-accessory-${q}`,
      source: 'MercadoLibre',
      title: `Cordones de repuesto para ${name}`,
      url: `https://example.com/accesorios/${encodeURIComponent(q)}`,
      imageUrl: null,
      price: 24900,
      originalPrice: null,
      currency: 'COP'
    });

    return items;
  }
};

