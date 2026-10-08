import { AMINO_ACIDS, filterAminoAcids } from '../core/AminoAcids.js';

/** Consulta de solo lectura: no modifica el estado del alineamiento. */
export class ProteinCatalog {
  constructor({ opener, dialog, search, closeButton, results, status, empty }) {
    const render = () => {
      const entries = filterAminoAcids(search.value);
      const cards = entries.map(entry => {
        const card = results.ownerDocument.createElement('li');
        card.className = 'protein-catalog-card';
        for (const [field, className] of [
          ['letter', 'protein-catalog-letter'], ['code3', 'protein-catalog-code'],
          ['name', 'protein-catalog-name'], ['category', 'protein-catalog-category']
        ]) {
          const text = results.ownerDocument.createElement('span');
          text.className = className;
          text.textContent = entry[field];
          card.append(text);
        }
        return card;
      });
      results.replaceChildren(...cards);
      status.textContent = `${entries.length} de ${AMINO_ACIDS.length} aminoácidos`;
      empty.hidden = entries.length !== 0;
    };

    opener.addEventListener('click', () => {
      if (dialog.open) return;
      search.value = '';
      render();
      dialog.showModal();
      search.focus();
    });
    search.addEventListener('input', render);
    closeButton.addEventListener('click', () => dialog.close());
    // Escape conserva el comportamiento nativo; close cubre ambas vías de salida.
    dialog.addEventListener('close', () => opener.focus());
  }
}
