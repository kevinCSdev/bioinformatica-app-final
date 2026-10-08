/**
 * Catálogo de consulta independiente del motor de alineamiento.
 * Nombres/códigos adaptados de cesar/src/scripts/core-alignment.js y
 * categorías de cesar/src/scripts/app.js (corrige «Aspargina» a «Asparagina»).
 */
export const AMINO_ACIDS = Object.freeze([
  { letter: 'A', code3: 'Ala', name: 'Alanina', category: 'Alifático' },
  { letter: 'C', code3: 'Cys', name: 'Cisteína', category: 'Tioles / Polar' },
  { letter: 'D', code3: 'Asp', name: 'Ácido aspártico', category: 'Ácido (-)' },
  { letter: 'E', code3: 'Glu', name: 'Ácido glutámico', category: 'Ácido (-)' },
  { letter: 'F', code3: 'Phe', name: 'Fenilalanina', category: 'Aromático' },
  { letter: 'G', code3: 'Gly', name: 'Glicina', category: 'Alifático' },
  { letter: 'H', code3: 'His', name: 'Histidina', category: 'Básico (+)' },
  { letter: 'I', code3: 'Ile', name: 'Isoleucina', category: 'Alifático' },
  { letter: 'K', code3: 'Lys', name: 'Lisina', category: 'Básico (+)' },
  { letter: 'L', code3: 'Leu', name: 'Leucina', category: 'Alifático' },
  { letter: 'M', code3: 'Met', name: 'Metionina', category: 'Tioéter' },
  { letter: 'N', code3: 'Asn', name: 'Asparagina', category: 'Amida / Polar' },
  { letter: 'P', code3: 'Pro', name: 'Prolina', category: 'Cíclico' },
  { letter: 'Q', code3: 'Gln', name: 'Glutamina', category: 'Amida / Polar' },
  { letter: 'R', code3: 'Arg', name: 'Arginina', category: 'Básico (+)' },
  { letter: 'S', code3: 'Ser', name: 'Serina', category: 'Hidroxilo' },
  { letter: 'T', code3: 'Thr', name: 'Treonina', category: 'Hidroxilo' },
  { letter: 'V', code3: 'Val', name: 'Valina', category: 'Alifático' },
  { letter: 'W', code3: 'Trp', name: 'Triptófano', category: 'Aromático' },
  { letter: 'Y', code3: 'Tyr', name: 'Tirosina', category: 'Aromático' }
].map(entry => Object.freeze(entry)));

function normalize(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Busca una subcadena en letra, código, nombre o categoría sin distinguir
 * mayúsculas ni acentos. Devuelve una nueva lista en el orden del catálogo.
 * @param {string} query - Texto de consulta; vacío devuelve los 20 residuos.
 * @returns {Array<{letter: string, code3: string, name: string, category: string}>}
 */
export function filterAminoAcids(query = '') {
  const normalizedQuery = normalize(query.trim());
  return AMINO_ACIDS.filter(entry =>
    [entry.letter, entry.code3, entry.name, entry.category]
      .some(field => normalize(field).includes(normalizedQuery))
  );
}
