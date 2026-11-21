/**
 * Remotive — empleos remotos (API pública y gratuita).
 * https://remotive.com/api/remote-jobs
 *
 * Remotive pide no consultar la API más de unas pocas veces al día,
 * por eso el resultado se cachea 6 h por defecto.
 */
const { getJson, qs } = require('../http');

module.exports = {
  name: 'remotive',
  kind: 'JOB',
  label: 'Remotive (remoto)',
  defaultCacheMinutes: 360,

  async search({ query, limit = 50 }, { timeoutMs }) {
    const data = await getJson(
      `https://remotive.com/api/remote-jobs?${qs({ search: query, limit })}`,
      { timeoutMs }
    );
    return (data.jobs || []).map((j) => ({
      id: String(j.id),
      source: 'Remotive',
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Remote',
      remote: true,
      salary: j.salary || null,
      url: j.url,
      publishedAt: j.publication_date ? new Date(j.publication_date).toISOString() : null,
      tags: j.tags || []
    }));
  }
};

