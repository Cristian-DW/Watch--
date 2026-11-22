/**
 * SerpAPI · Google Jobs — agrega LinkedIn, Indeed, Glassdoor, Computrabajo,
 * portales corporativos, etc. Requiere SERPAPI_KEY (plan gratuito limitado).
 * https://serpapi.com/google-jobs-api
 */
const { getJson, qs } = require('../http');

function toIsoFromRelative(text) {
  // "hace 3 días" / "3 days ago" → fecha aproximada
  const m = /(\d+)\s*(hora|hour|día|dia|day|semana|week|mes|month)/i.exec(text || '');
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const hours = unit.startsWith('hor') || unit.startsWith('hour') ? n
    : unit.startsWith('d') ? n * 24
      : unit.startsWith('sem') || unit.startsWith('week') ? n * 24 * 7
        : n * 24 * 30;
  return new Date(Date.now() - hours * 3600000).toISOString();
}

module.exports = {
  name: 'serpapi-google-jobs',
  kind: 'JOB',
  label: 'Google Jobs (SerpAPI)',
  requiresEnv: 'SERPAPI_KEY',

  async search({ query, location }, { apiKey, timeoutMs, config }) {
    const data = await getJson(
      `https://serpapi.com/search.json?${qs({
        engine: 'google_jobs',
        q: query,
        location: location || undefined,
        hl: config.hl || 'es',
        api_key: apiKey
      })}`,
      { timeoutMs }
    );
    return (data.jobs_results || []).map((j) => {
      const ext = j.detected_extensions || {};
      const apply = (j.apply_options || [])[0];
      return {
        id: j.job_id || `${j.title}|${j.company_name}`,
        source: j.via ? String(j.via).replace(/^(via|a través de)\s+/i, '') : 'Google Jobs',
        title: j.title,
        company: j.company_name,
        location: j.location,
        remote: Boolean(ext.work_from_home),
        salary: ext.salary || null,
        url: (apply && apply.link) || j.share_link,
        publishedAt: toIsoFromRelative(ext.posted_at),
        tags: []
      };
    });
  }
};

