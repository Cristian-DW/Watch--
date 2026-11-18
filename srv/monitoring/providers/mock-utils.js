/**
 * Utilidades deterministas para los providers simulados (mock).
 * Mismo input → mismo output, para que la deduplicación funcione entre ejecuciones.
 */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Número pseudoaleatorio en [0, 1) derivado de una semilla de texto. */
function rand(seed) {
  return hash(seed) / 4294967296;
}

function pick(list, seed) {
  return list[Math.floor(rand(seed) * list.length)];
}

function titleCase(text) {
  return String(text).replace(/\b([a-z])([a-z]*)/g, (_, a, b) => a.toUpperCase() + b);
}

module.exports = { hash, rand, pick, titleCase };

