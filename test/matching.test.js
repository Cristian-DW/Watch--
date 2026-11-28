/**
 * Pruebas unitarias del matching de palabras clave (sin servidor).
 */
const { parseQuery, matchText, matchLocation } = require('../srv/monitoring/matching');

describe('Matching de palabras clave', () => {

  it('encuentra un rol aunque cambie el orden y el idioma', () => {
    const spec = parseQuery('SAP Architect BTP');
    expect(matchText(spec, 'Senior SAP BTP Solution Architect').matched).toBe(true);
    expect(matchText(spec, 'Arquitecto SAP BTP - Remoto').matched).toBe(true);
  });

  it('rechaza roles que no cubren suficientes términos', () => {
    const spec = parseQuery('SAP Architect BTP');
    expect(matchText(spec, 'SAP Basis Consultant').matched).toBe(false);
    expect(matchText(spec, 'Java Developer').matched).toBe(false);
  });

  it('exige los términos numéricos (modelos de producto)', () => {
    const spec = parseQuery('tenis New Balance 550');
    expect(matchText(spec, 'New Balance 550 White Green').matched).toBe(true);
    expect(matchText(spec, 'Zapatillas New Balance 574').matched).toBe(false);
  });

  it('soporta exclusiones y frases exactas', () => {
    const spec = parseQuery('"new balance" 550 -niño');
    expect(matchText(spec, 'New Balance 550 hombre').matched).toBe(true);
    expect(matchText(spec, 'New Balance 550 Niño').matched).toBe(false);
    expect(matchText(spec, 'Balance New 550').matched).toBe(false);
    expect(spec.searchText).toBe('new balance 550');
  });

  it('es insensible a tildes y mayúsculas', () => {
    const spec = parseQuery('consultor éxito');
    expect(matchText(spec, 'CONSULTOR EXITO').matched).toBe(true);
  });

  it('acepta empleos remotos o de la ubicación deseada', () => {
    expect(matchLocation('', 'Madrid', false)).toBe(true);
    expect(matchLocation('Colombia', 'Bogotá, Colombia', false)).toBe(true);
    expect(matchLocation('Colombia', 'Remote · LATAM', true)).toBe(true);
    expect(matchLocation('Colombia', 'Madrid, España', false)).toBe(false);
    expect(matchLocation('Remote', 'Bogotá', false)).toBe(false);
  });

});

