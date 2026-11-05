/**
 * Matching de palabras clave para resultados de búsqueda.
 *
 * Sintaxis de la query del usuario:
 *   SAP Architect BTP            → términos (se exige un % mínimo de coincidencia)
 *   "New Balance 550"            → frase exacta obligatoria
 *   New Balance 550 -niño -usado → términos excluidos
 *
 * Reglas:
 *   - Insensible a mayúsculas y tildes.
 *   - Los términos numéricos (modelos: 550, 15, s24) son obligatorios.
 *   - Se aceptan sinónimos básicos ES/EN (arquitecto ↔ architect, tenis ↔ sneakers...).
 */

const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'o', 'para', 'por', 'con', 'un', 'una',
  'the', 'of', 'and', 'or', 'for', 'in', 'a', 'an', 'with', 'to'
]);

const SYNONYM_GROUPS = [
  ['architect', 'arquitecto', 'arquitecta', 'arquitectura', 'architecture'],
  ['developer', 'desarrollador', 'desarrolladora', 'dev', 'engineer', 'ingeniero', 'ingeniera'],
  ['consultant', 'consultor', 'consultora'],
  ['manager', 'gerente', 'lead', 'lider', 'jefe'],
  ['senior', 'sr'],
  ['junior', 'jr'],
  ['tenis', 'zapatillas', 'sneakers', 'sneaker', 'shoes', 'zapatos', 'calzado'],
  ['celular', 'smartphone', 'telefono', 'phone'],
  ['portatil', 'laptop', 'notebook']
];

const SYNONYMS = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYMS.set(word, group);
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(text) {
  return normalize(text).split(/[^a-z0-9+#]+/).filter(Boolean);
}

/**
 * Convierte la query del usuario en una especificación de matching.
 */
function parseQuery(query) {
  const phrases = [];
  let rest = String(query || '').replace(/"([^"]+)"/g, (_, p) => {
    phrases.push(normalize(p).trim());
    return ' ';
  });

  const excludes = [];
  rest = rest.replace(/(^|\s)-(\S+)/g, (_, sp, word) => {
    excludes.push(...tokenize(word));
    return ' ';
  });

  const terms = tokenize(rest).filter((t) => !STOPWORDS.has(t));
  const phraseTerms = phrases.flatMap(tokenize);

  return {
    terms,
    phrases,
    excludes,
    /** Texto limpio para enviar a los providers (sin operadores). */
    searchText: [...phrases, ...terms].join(' ').trim() || normalize(query).trim(),
    required: [...terms, ...phraseTerms].filter((t) => /\d/.test(t))
  };
}

function hasToken(tokens, haystack, term) {
  const candidates = SYNONYMS.get(term) || [term];
  return candidates.some((c) => tokens.has(c) || (c.length >= 5 && haystack.includes(c)));
}

/**
 * Evalúa un texto contra la spec. Devuelve { matched, score }.
 */
function matchText(spec, text, minScore = 0.75) {
  const haystack = normalize(text);
  const tokens = new Set(tokenize(text));

  if (spec.excludes.some((e) => tokens.has(e))) return { matched: false, score: 0 };
  if (spec.phrases.some((p) => !haystack.includes(p))) return { matched: false, score: 0 };
  if (spec.required.some((r) => !tokens.has(r))) return { matched: false, score: 0 };

  if (spec.terms.length === 0) return { matched: true, score: 1 };
  const hits = spec.terms.filter((t) => hasToken(tokens, haystack, t)).length;
  const score = hits / spec.terms.length;
  return { matched: score >= minScore, score };
}

const REMOTE_HINTS = ['remote', 'remoto', 'worldwide', 'anywhere', 'global', 'latam', 'americas', 'teletrabajo'];

/**
 * ¿La ubicación del empleo encaja con la deseada? Vacío = global.
 * Los empleos remotos/globales siempre encajan.
 */
function matchLocation(desired, jobLocation, isRemote) {
  if (!desired || !desired.trim()) return true;
  const want = normalize(desired);
  const have = normalize(jobLocation);
  if (isRemote || REMOTE_HINTS.some((h) => have.includes(h))) return true;
  if (REMOTE_HINTS.some((h) => want.includes(h))) return Boolean(isRemote);
  return tokenize(want).some((t) => have.includes(t));
}

module.exports = { normalize, tokenize, parseQuery, matchText, matchLocation };

