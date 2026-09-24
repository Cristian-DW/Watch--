namespace watch;

using {
  cuid,
  managed
} from '@sap/cds/common';

/**
 * Watches — Entidades que el usuario desea monitorear.
 *
 * Cada Watch representa una URL o recurso en Internet
 * que será monitoreado periódicamente para detectar cambios
 * según la condición definida por el usuario.
 */
entity Watches : cuid, managed {
  name      : String(255)  @mandatory;
  url       : String(2048) @mandatory;
  type      : WatchType     default 'PRICE';
  condition : String(1024);
  frequency : Frequency     default 'DAILY';
  status    : Status        default 'ACTIVE';
}

/**
 * Tipos de monitoreo soportados.
 */
type WatchType  : String enum {
  PRICE;
  STOCK;
  CONTENT;
  CUSTOM;
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
