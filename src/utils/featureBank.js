/**
 * Feature Bank
 * Stores every category, field name, and value the user has ever typed.
 * Powers the as-you-type suggestion system.
 *
 * Shape:
 * {
 *   fieldValues: { fieldKey: [value, value, ...] },  // ordered by recency
 *   categories:  [string, ...],                       // feature tag categories
 *   fieldNames:  [string, ...],                       // field names ever used
 * }
 */

const MAX_SUGGESTIONS = 8;
const MAX_VALUES_PER_FIELD = 200;

/**
 * Return suggestions from bank for a given field key and current input.
 */
export function suggestFieldValues(bank, fieldKey, input) {
  if (!input || input.length < 1) return [];
  const values = bank?.fieldValues?.[fieldKey] || [];
  const q = input.toLowerCase();
  return values
    .filter(v => v.toLowerCase().includes(q) && v !== input)
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Return category suggestions from bank.
 */
export function suggestCategories(bank, input) {
  if (!input || input.length < 1) return [];
  const q = input.toLowerCase();
  return (bank?.categories || [])
    .filter(c => c.toLowerCase().includes(q) && c !== input)
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Return field name suggestions from bank.
 */
export function suggestFieldNames(bank, input) {
  if (!input || input.length < 1) return [];
  const q = input.toLowerCase();
  return (bank?.fieldNames || [])
    .filter(n => n.toLowerCase().includes(q) && n !== input)
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Record a field value into the bank (prepend for recency).
 * Returns updated bank.
 */
export function recordFieldValue(bank, fieldKey, value) {
  if (!value || !String(value).trim()) return bank;
  const v = String(value).trim();
  const existing = bank?.fieldValues?.[fieldKey] || [];
  const deduped  = [v, ...existing.filter(x => x !== v)].slice(0, MAX_VALUES_PER_FIELD);
  return {
    ...bank,
    fieldValues: { ...(bank?.fieldValues || {}), [fieldKey]: deduped },
  };
}

/**
 * Record a category name (for feature tags).
 */
export function recordCategory(bank, category) {
  if (!category?.trim()) return bank;
  const c = category.trim();
  const existing = bank?.categories || [];
  return { ...bank, categories: [c, ...existing.filter(x => x !== c)].slice(0, 200) };
}

/**
 * Record a field name (for scheme building suggestions).
 */
export function recordFieldName(bank, fieldName) {
  if (!fieldName?.trim()) return bank;
  const n = fieldName.trim();
  const existing = bank?.fieldNames || [];
  return { ...bank, fieldNames: [n, ...existing.filter(x => x !== n)].slice(0, 200) };
}

/**
 * Record all metadata values from a saved stratum into the bank.
 * metadata is { fieldKey: value } from metadata.json.
 */
export function recordMetadataIntoBank(bank, metadata) {
  let b = bank || { fieldValues:{}, categories:[], fieldNames:[] };
  for (const [key, value] of Object.entries(metadata || {})) {
    if (Array.isArray(value)) {
      value.forEach(v => { b = recordFieldValue(b, key, v); });
    } else {
      b = recordFieldValue(b, key, value);
    }
  }
  return b;
}

/**
 * Get stats about the feature bank for display.
 */
export function getFeatureBankStats(bank) {
  const fieldCount  = Object.keys(bank?.fieldValues  || {}).length;
  const totalValues = Object.values(bank?.fieldValues || {}).reduce((sum, arr) => sum + arr.length, 0);
  const catCount    = (bank?.categories || []).length;
  const nameCount   = (bank?.fieldNames || []).length;
  return { fieldCount, totalValues, catCount, nameCount };
}
