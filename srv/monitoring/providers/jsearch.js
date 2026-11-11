/**
 * JSearch (RapidAPI) — agregador de empleos (LinkedIn, Indeed, Glassdoor,
 * ZipRecruiter...). Requiere RAPIDAPI_KEY.
 * https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 */
const { getJson, qs } = require('../http');

module.exports = {
  name: 'jsearch',
  kind: 'JOB',
  label: 'JSearch (RapidAPI)',
  requiresEnv: 'RAPIDAPI_KEY',

  async search({ query, location }, { apiKey, timeoutMs, config }) {
    const q = location ? `${query} in ${location}` : query;
    const data = await getJson(
      `https://jsearch.p.rapidapi.com/search?${qs({
        query: q,
        page: 1,
        num_pages: config.pages || 1,
        date_posted: config.datePosted || 'week'
      })}`,
      {
        timeoutMs,
        headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' }
      }
    );
    return (data.data || []).map((j) => {
      const salary = j.job_min_salary && j.job_max_salary
        ? `${j.job_min_salary} - ${j.job_max_salary} ${j.job_salary_currency || ''}`.trim()
        : null;
      return {
        id: j.job_id,
        source: j.job_publisher || 'JSearch',
        title: j.job_title,
        company: j.employer_name,
        location: [j.job_city, j.job_country].filter(Boolean).join(', '),
        remote: Boolean(j.job_is_remote),
        salary,
        url: j.job_apply_link,
        publishedAt: j.job_posted_at_datetime_utc || null,
        tags: []
      };
    });
  }
};

