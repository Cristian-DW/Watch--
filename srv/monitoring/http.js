/**
 * Cliente HTTP mínimo para providers (fetch nativo de Node ≥ 18).
 */
const DEFAULT_TIMEOUT = 15000;

class ProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}

async function getJson(url, { headers = {}, timeoutMs = DEFAULT_TIMEOUT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'WATCH-monitor/0.1', ...headers },
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ProviderError(`HTTP ${res.status} ${res.statusText} ${body.slice(0, 160)}`.trim(), res.status);
    }
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new ProviderError(`Timeout tras ${timeoutMs} ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function qs(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

module.exports = { getJson, qs, ProviderError };

