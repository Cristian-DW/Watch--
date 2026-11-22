/**
 * Bootstrap del servidor CAP.
 *
 * Arranca el scheduler de monitoreo una vez que los servicios están servidos
 * y lo detiene al apagar el servidor.
 */
const cds = require('@sap/cds');
const scheduler = require('./monitoring/scheduler');

cds.on('served', () => scheduler.start());
cds.on('shutdown', () => scheduler.stop());

module.exports = cds.server;

