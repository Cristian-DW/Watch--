using watch from '../db/schema';

/**
 * WatchService — Servicio OData v4 para gestionar Watches.
 *
 * Expone operaciones CRUD estándar sobre la entidad Watches.
 * Lógica custom (validaciones, side-effects) se implementa
 * en watch-service.js.
 */
service WatchService @(path: '/api') {

  entity Watches as projection on watch.Watches;

}
