using watch from '../db/schema';

/**
 * WatchService — Servicio OData v4 para gestionar Watches.
 *
 * Expone operaciones CRUD estándar sobre la entidad Watches.
 * Lógica custom (validaciones, side-effects) se implementa
 * en watch-service.js.
 *
 * Los resultados del monitoreo (empleos, ofertas, histórico, ejecuciones)
 * son de solo lectura: los produce el engine (srv/monitoring).
 */
service WatchService @(path: '/api') @(requires: 'WatchUser') {

  entity Watches as projection on watch.Watches actions {
    /** Ejecuta el monitoreo inmediatamente (búsqueda en todos los providers). */
    action checkNow() returns RunResult;
  };

  @readonly entity JobPostings    as projection on watch.JobPostings;
  @readonly entity Offers         as projection on watch.Offers;
  @readonly entity PriceSnapshots as projection on watch.PriceSnapshots;
  @readonly entity WatchRuns      as projection on watch.WatchRuns;

  @(Capabilities: {
    InsertRestrictions.Insertable: false,
    UpdateRestrictions.Updatable : true,
    DeleteRestrictions.Deletable : true
  })
  entity Notifications as projection on watch.Notifications;

  /** Marca como leídas todas las notificaciones (opcionalmente de un Watch). */
  action markAllNotificationsRead(watchId : UUID) returns Integer;

  /** Providers de búsqueda registrados y si están habilitados. */
  function providers() returns array of ProviderInfo;

  /**
   * Autocompletado y sugerencias inteligentes de productos, empleos y plantillas de Watch.
   * Permite que el usuario solo escriba parte del nombre sin necesidad de pegar una URL.
   */
  function suggest(term : String, type : String, category : String) returns array of WatchSuggestion;

  /** Catálogo de categorías por áreas de empleabilidad y tipos de producto. */
  function categories(type : String) returns array of CategoryInfo;

  type RunResult {
    status   : String;
    found    : Integer;
    newItems : Integer;
    notified : Integer;
    errors   : String;
  }

  type ProviderInfo {
    name     : String;
    kind     : String;
    label    : String;
    enabled  : Boolean;
    reason   : String;
  }

  type WatchSuggestion {
    id          : String;
    title       : String;
    query       : String;
    type        : String;
    category    : String;
    subcategory : String;
    location    : String;
    targetPrice : Decimal(15, 2);
    currency    : String;
    url         : String;
    description : String;
  }

  type CategoryInfo {
    code          : String;
    kind          : String;
    label         : String;
    icon          : String;
    subcategories : array of String;
  }
}
