/**
 * Implementación custom del WatchService.
 *
 * Registra validaciones y hooks de negocio
 * para la entidad Watches.
 *
 * El CRUD estándar (GET, POST, PUT/PATCH, DELETE)
 * lo maneja CAP automáticamente; aquí solo añadimos
 * validaciones y lógica adicional.
 */
module.exports = function WatchService() {

  const VALID_TYPES       = ['PRICE', 'STOCK', 'CONTENT', 'CUSTOM'];
  const VALID_FREQUENCIES = ['HOURLY', 'DAILY', 'WEEKLY'];
  const VALID_STATUSES    = ['ACTIVE', 'PAUSED', 'TRIGGERED', 'ARCHIVED'];
  const URL_REGEX         = /^https?:\/\/.+/i;

  // ── Helpers ────────────────────────────────────────────

  function validateUrl(url) {
    if (!url || url.trim().length === 0) {
      return 'La URL del Watch es obligatoria.';
    }
    if (!URL_REGEX.test(url.trim())) {
      return 'La URL debe comenzar con http:// o https://';
    }
    return null;
  }

  function validateName(name) {
    if (!name || name.trim().length === 0) {
      return 'El nombre del Watch es obligatorio.';
    }
    return null;
  }

  function validateEnum(value, allowed, fieldName) {
    if (value && !allowed.includes(value)) {
      return `Valor inválido para ${fieldName}: ${value}. Valores permitidos: ${allowed.join(', ')}`;
    }
    return null;
  }

  // ── Before CREATE ──────────────────────────────────────

  this.before('CREATE', 'Watches', (req) => {
    const { name, url, type, frequency, status } = req.data;

    const nameErr = validateName(name);
    if (nameErr) req.error(400, nameErr);

    const urlErr = validateUrl(url);
    if (urlErr) req.error(400, urlErr);

    const typeErr = validateEnum(type, VALID_TYPES, 'type');
    if (typeErr) req.error(400, typeErr);

    const freqErr = validateEnum(frequency, VALID_FREQUENCIES, 'frequency');
    if (freqErr) req.error(400, freqErr);

    const statusErr = validateEnum(status, VALID_STATUSES, 'status');
    if (statusErr) req.error(400, statusErr);

    // Normalizar URL
    if (url) req.data.url = url.trim();
    if (name) req.data.name = name.trim();
  });

  // ── Before UPDATE ──────────────────────────────────────

  this.before('UPDATE', 'Watches', (req) => {
    const { url, name, type, frequency, status } = req.data;

    if (url !== undefined) {
      const urlErr = validateUrl(url);
      if (urlErr) req.error(400, urlErr);
      req.data.url = url.trim();
    }

    if (name !== undefined && name.trim().length === 0) {
      req.error(400, 'El nombre del Watch no puede estar vacío.');
    }
    if (name) req.data.name = name.trim();

    if (type !== undefined) {
      const typeErr = validateEnum(type, VALID_TYPES, 'type');
      if (typeErr) req.error(400, typeErr);
    }

    if (frequency !== undefined) {
      const freqErr = validateEnum(frequency, VALID_FREQUENCIES, 'frequency');
      if (freqErr) req.error(400, freqErr);
    }

    if (status !== undefined) {
      const statusErr = validateEnum(status, VALID_STATUSES, 'status');
      if (statusErr) req.error(400, statusErr);
    }
  });

};
