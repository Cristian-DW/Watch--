/**
 * MercadoLibre — búsqueda de productos (por defecto sitio Colombia, MCO / COP).
 * La API de búsqueda exige un access token OAuth: MELI_ACCESS_TOKEN.
 * https://developers.mercadolibre.com.co/es_ar/items-y-busquedas
 */
const { getJson, qs } = require('../http');

module.exports = {
  name: 'mercadolibre',
  kind: 'PRODUCT',
  label: 'MercadoLibre',
  requiresEnv: 'MELI_ACCESS_TOKEN',

  async search({ query, limit = 30 }, { apiKey, timeoutMs, config }) {
    const site = config.site || 'MCO';
    const data = await getJson(
      `https://api.mercadolibre.com/sites/${site}/search?${qs({ q: query, limit })}`,
      { timeoutMs, headers: { Authorization: `Bearer ${apiKey}` } }
    );
    return (data.results || []).map((r) => ({
      id: r.id,
      source: r.official_store_name ? `MercadoLibre · ${r.official_store_name}` : 'MercadoLibre',
      title: r.title,
      url: r.permalink,
      imageUrl: r.thumbnail,
      price: r.price,
      originalPrice: r.original_price || null,
      currency: r.currency_id
    }));
  }
};

