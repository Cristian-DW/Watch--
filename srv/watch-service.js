/**
 * Implementación custom del WatchService.
 *
 * Aquí se registrarán validaciones, hooks y lógica
 * de negocio para la entidad Watches.
 */
module.exports = function WatchService() {

  const { Watches } = this.entities;

  /**
   * Validación antes de crear un Watch.
   * Verifica que la URL tenga un formato válido.
   */
  this.before('CREATE', 'Watches', (req) => {
    const { url, name } = req.data;

    if (!name || name.trim().length === 0) {
      req.error(400, 'El nombre del Watch es obligatorio.');
    }

    if (!url || url.trim().length === 0) {
      req.error(400, 'La URL del Watch es obligatoria.');
    }

    if (url && !/^https?:\/\/.+/i.test(url.trim())) {
      req.error(400, 'La URL debe comenzar con http:// o https://');
    }
  });

  /**
   * Validación antes de actualizar un Watch.
   */
  this.before('UPDATE', 'Watches', (req) => {
    const { url } = req.data;

    if (url && !/^https?:\/\/.+/i.test(url.trim())) {
      req.error(400, 'La URL debe comenzar con http:// o https://');
    }
  });

};
