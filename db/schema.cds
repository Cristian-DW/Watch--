namespace watch;

using {cuid,managed} from '@sap/cds/common';

/**
 * Watches — Entidades que el usuario desea monitorear.
 *
 * Cada Watch representa una URL o recurso en Internet
 * que será monitoreado periódicamente para detectar cambios
 * según la condición definida por el usuario.
 *
 * Existen dos familias de Watches:
 *  - Basados en URL   (PRICE, STOCK, CONTENT, CUSTOM): monitorean una página concreta.
 *  - Basados en búsqueda (JOB, PRODUCT): ejecutan una búsqueda por palabras clave
 *    contra múltiples providers (bolsas de empleo, tiendas) y notifican novedades.
 */
entity Watches : cuid, managed {
  name            : String(255)  @mandatory;
  /** Obligatoria para Watches basados en URL; opcional para JOB / PRODUCT. */
  url             : String(2048);
  type            : WatchType     default 'PRICE';
  condition       : String(1024);
  frequency       : Frequency     default 'DAILY';
  status          : Status        default 'ACTIVE';

  // ── Búsqueda (JOB / PRODUCT) ───────────────────────────
  /** Palabras clave. Soporta "frase exacta" y -exclusión. Ej: SAP Architect BTP -junior */
  query           : String(255);
  /** Ubicación deseada para empleos (vacío = global). Ej: Colombia, Remote */
  location        : String(255);
  /** Precio objetivo: se notifica cuando una oferta lo iguala o lo mejora. */
  targetPrice     : Decimal(15, 2);
  currency        : String(3)     default 'COP';
  /** Email opcional para recibir las notificaciones además de la bandeja in-app. */
  notifyEmail     : String(255);

  // ── Estado del monitoreo (lo mantiene el engine) ───────
  lastCheckedAt   : Timestamp     @readonly;
  lastError       : String(1024)  @readonly;
  resultCount     : Integer       @readonly default 0;
  bestPrice       : Decimal(15, 2) @readonly;
  bestPriceSource : String(255)   @readonly;
  bestPriceUrl    : String(2048)  @readonly;

  jobs            : Composition of many JobPostings   on jobs.watch = $self;
  offers          : Composition of many Offers        on offers.watch = $self;
  notifications   : Composition of many Notifications on notifications.watch = $self;
  runs            : Composition of many WatchRuns     on runs.watch = $self;
}

/**
 * JobPostings — Ofertas de empleo encontradas para un Watch de tipo JOB.
 * Se deduplican por (watch, externalId).
 */
entity JobPostings : cuid {
  watch       : Association to Watches;
  externalId  : String(512);
  provider    : String(60);
  source      : String(255);
  title       : String(512);
  company     : String(255);
  location    : String(255);
  remote      : Boolean default false;
  salary      : String(255);
  url         : String(2048);
  publishedAt : Timestamp;
  firstSeenAt : Timestamp;
}

/**
 * Offers — Publicaciones de un producto en distintas plataformas
 * (Watch de tipo PRODUCT). Una fila por publicación, con su precio vigente.
 */
entity Offers : cuid {
  watch         : Association to Watches;
  externalId    : String(512);
  provider      : String(60);
  /** Plataforma/tienda donde se vende (Amazon, MercadoLibre, Falabella...). */
  source        : String(255);
  title         : String(512);
  url           : String(2048);
  imageUrl      : String(2048);
  price         : Decimal(15, 2);
  /** Precio "antes" declarado por la tienda (precio tachado), si existe. */
  originalPrice : Decimal(15, 2);
  currency      : String(3);
  lowestPrice   : Decimal(15, 2);
  /** Último precio por el que se notificó (evita repetir la misma alerta). */
  notifiedPrice : Decimal(15, 2);
  available     : Boolean default true;
  /** Precio atípicamente bajo frente a la mediana (posible accesorio / error). */
  outlier       : Boolean default false;
  firstSeenAt   : Timestamp;
  lastSeenAt    : Timestamp;
  history       : Composition of many PriceSnapshots on history.offer = $self;
}

/**
 * PriceSnapshots — Histórico de precios de una oferta (solo cuando cambia).
 */
entity PriceSnapshots : cuid {
  offer      : Association to Offers;
  price      : Decimal(15, 2);
  capturedAt : Timestamp;
}

/**
 * Notifications — Bandeja in-app. Opcionalmente se replica por email.
 */
entity Notifications : cuid, managed {
  watch       : Association to Watches;
  kind        : NotificationKind;
  title       : String(255);
  message     : String(2048);
  url         : String(2048);
  isRead      : Boolean default false;
  emailStatus : EmailStatus default 'SKIPPED';
}

/**
 * WatchRuns — Bitácora de ejecuciones del engine (observabilidad).
 */
entity WatchRuns : cuid {
  watch      : Association to Watches;
  startedAt  : Timestamp;
  finishedAt : Timestamp;
  trigger    : String(20);  // SCHEDULER | MANUAL | CREATE
  status     : RunStatus;
  found      : Integer default 0;
  newItems   : Integer default 0;
  notified   : Integer default 0;
  errors     : String(2048);
}

/**
 * Tipos de monitoreo soportados.
 */
type WatchType  : String enum {
  PRICE;
  STOCK;
  CONTENT;
  CUSTOM;
  JOB;
  PRODUCT;
}

/**
 * Frecuencia de chequeo del Watch.
 */
type Frequency  : String enum {
  HOURLY;
  DAILY;
  WEEKLY;
}

/**
 * Estado del Watch.
 */
type Status     : String enum {
  ACTIVE;
  PAUSED;
  TRIGGERED;
  ARCHIVED;
}

type NotificationKind : String enum {
  NEW_JOB;
  JOBS_BASELINE;
  TARGET_PRICE;
}

type EmailStatus : String enum {
  SKIPPED;
  SENT;
  FAILED;
}

type RunStatus : String enum {
  SUCCESS;
  PARTIAL;
  FAILED;
  SKIPPED;
}
