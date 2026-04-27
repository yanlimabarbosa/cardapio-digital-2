/**
 * Normalizes a string for accent-insensitive, case-insensitive matching.
 * Used to match ViaCEP neighborhood names against delivery area records.
 *
 * Examples:
 *   "João Pessoa Manaíra" → "joao pessoa manaira"
 *   "Altiplano Cabo-Branco" → "altiplano cabo branco"
 *   "Anatólia" → "anatolia"
 */
export function normalizeNeighborhood(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
