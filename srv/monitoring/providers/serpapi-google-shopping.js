/**
 * SerpAPI · Google Shopping — compara precios de un producto en múltiples
 * tiendas (Amazon, Falabella, Éxito, MercadoLibre, tiendas oficiales...).
 * Requiere SERPAPI_KEY. Por defecto consulta Colombia (gl=co → precios en COP).
 * https://serpapi.com/google-shopping-api
 */
const { getJson, qs } = require('../http');

const COUNTRY_CURRENCY = { co: 'COP', mx: 'MXN', us: 'USD', es: 'EUR', ar: 'ARS', cl: 'CLP', pe: 'PEN' };

module.exports = {
  name: 'serpapi-google-shopping',
  kind: 'PRODUCT',
  label: 'Google Shopping (SerpAPI)',
  requiresEnv: 'SERPAPI_KEY',

  async search({ query }, { apiKey, timeoutMs, config }) {
    const gl = config.gl || 'co';
    const data = await getJson(
      `https://serpapi.com/search.json?${qs({
        engine: 'google_shopping',
        q: query,
        gl,
        hl: config.hl || 'es',
        api_key: apiKey
      })}`,
      { timeoutMs }
    );
    const currency = COUNTRY_CURRENCY[gl] || null;
    return (data.shopping_results || [])
      .filter((r) => typeof r.extracted_price === 'number')
      .map((r) => ({
        id: r.product_id || `${r.source}|${r.title}`,
        source: r.source || 'Google Shopping',
        title: r.title,
        url: r.product_link || r.link,
        imageUrl: r.thumbnail,
        price: r.extracted_price,
        originalPrice: r.extracted_old_price || null,
        currency
      }));
  }
};

