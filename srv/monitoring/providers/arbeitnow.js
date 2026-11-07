/**
 * Arbeitnow — job board con API pública y gratuita (sin búsqueda por texto:
 * se descargan las páginas más recientes y el engine filtra por palabras clave).
 * https://www.arbeitnow.com/api/job-board-api
 */
const { getJson, qs } = require('../http');

module.exports = {
  name: 'arbeitnow',
  kind: 'JOB',
  label: 'Arbeitnow',
  defaultCacheMinutes: 60,

  async search(params, { timeoutMs, config }) {
    const pages = config.pages || 2;
    const out = [];
    for (let page = 1; page <= pages; page++) {
      const data = await getJson(
        `https://www.arbeitnow.com/api/job-board-api?${qs({ page })}`,
        { timeoutMs }
      );
      for (const j of data.data || []) {
        out.push({
          id: j.slug,
          source: 'Arbeitnow',
          title: j.title,
          company: j.company_name,
          location: j.location || (j.remote ? 'Remote' : ''),
          remote: Boolean(j.remote),
          salary: null,
          url: j.url,
          publishedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
          tags: [...(j.tags || []), ...(j.job_types || [])]
        });
      }
      if (!data.links || !data.links.next) break;
    }
    return out;
  }
};

