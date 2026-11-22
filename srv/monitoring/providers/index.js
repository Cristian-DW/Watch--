/**
 * Registry de providers de búsqueda.
 *
 * Contrato de un provider:
 *   {
 *     name: 'remotive',              // id único (clave de configuración)
 *     kind: 'JOB' | 'PRODUCT',
 *     label: 'Remotive',
 *     requiresEnv: 'SERPAPI_KEY',    // opcional: secreto necesario
 *     defaultEnabled: true,          // opcional
 *     defaultCacheMinutes: 0,        // opcional: respeta rate limits de APIs gratuitas
 *     async search({ query, location, currency, limit }, ctx) → items normalizados
 *   }
 *
 * Item JOB:     { id, source, title, company, location, remote, salary, url, publishedAt, tags }
 * Item PRODUCT: { id, source, title, url, imageUrl, price, originalPrice, currency }
 *
 * Configuración por provider en package.json → cds.watch.providers.<name>:
 *   { "enabled": true|false, "apiKey": "...", "cacheMinutes": 60, ... }
 */
const { providerConfig } = require('../config');

const BUILTIN = [
  require('./remotive'),
  require('./arbeitnow'),
  require('./serpapi-google-jobs'),
  require('./jsearch'),
  require('./mercadolibre'),
  require('./serpapi-google-shopping'),
  require('./mock-jobs'),
  require('./mock-shop')
];

const registry = new Map(BUILTIN.map((p) => [p.name, p]));
const cache = new Map();

function register(provider) {
  registry.set(provider.name, provider);
}

function unregister(name) {
  registry.delete(name);
}

function availability(provider) {
  const cfg = providerConfig(provider.name);
  const enabled = cfg.enabled ?? provider.defaultEnabled ?? true;
  if (!enabled) return { enabled: false, reason: 'Deshabilitado por configuración' };
  if (provider.requiresEnv && !(cfg.apiKey || process.env[provider.requiresEnv])) {
    return { enabled: false, reason: `Requiere la variable de entorno ${provider.requiresEnv}` };
  }
  return { enabled: true, reason: null };
}

function listProviders() {
  return [...registry.values()].map((p) => ({
    name: p.name,
    kind: p.kind,
    label: p.label,
    ...availability(p)
  }));
}

function activeProviders(kind) {
  return [...registry.values()].filter((p) => p.kind === kind && availability(p).enabled);
}

/**
 * Ejecuta la búsqueda de un provider aplicando cache (si está configurado).
 */
async function runSearch(provider, params, { timeoutMs }) {
  const cfg = providerConfig(provider.name);
  const ctx = {
    config: cfg,
    apiKey: cfg.apiKey || (provider.requiresEnv && process.env[provider.requiresEnv]),
    timeoutMs
  };
  const cacheMinutes = cfg.cacheMinutes ?? provider.defaultCacheMinutes ?? 0;
  const key = `${provider.name}|${params.query}|${params.location || ''}|${params.currency || ''}`;

  if (cacheMinutes > 0) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < cacheMinutes * 60000) return hit.items;
  }

  const items = (await provider.search(params, ctx)) || [];
  if (cacheMinutes > 0) cache.set(key, { at: Date.now(), items });
  return items;
}

function clearCache() {
  cache.clear();
}

module.exports = { register, unregister, listProviders, activeProviders, runSearch, clearCache, availability };

