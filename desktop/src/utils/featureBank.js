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
const MAX_CATEGORIES = 300;
const MAX_FIELD_NAMES = 300;

// ─── Suggest ──────────────────────────────────────────────────────────────────

export function suggestFieldValues(bank, fieldKey, input) {
  if (!input || input.length < 1 || !fieldKey) return [];
  const values = bank?.fieldValues?.[fieldKey] || [];
  const q = input.toLowerCase();
  return values
    .filter((v) => v.toLowerCase().includes(q) && v !== input)
    .slice(0, MAX_SUGGESTIONS);
}

export function suggestCategories(bank, input) {
  if (!input || input.length < 1) return [];
  const q = input.toLowerCase();
  return (bank?.categories || [])
    .filter((c) => c.toLowerCase().includes(q) && c !== input)
    .slice(0, MAX_SUGGESTIONS);
}

export function suggestFieldNames(bank, input) {
  if (!input || input.length < 1) return [];
  const q = input.toLowerCase();
  return (bank?.fieldNames || [])
    .filter((n) => n.toLowerCase().includes(q) && n !== input)
    .slice(0, MAX_SUGGESTIONS);
}

// ─── Record ───────────────────────────────────────────────────────────────────

/**
 * Record a typed field value into the bank.
 * Called whenever a stratum is saved with metadata.
 */
export function recordFieldValue(bank, fieldKey, value) {
  if (!value || !String(value).trim() || !fieldKey) return bank;
  const v = String(value).trim();
  const existing = bank?.fieldValues?.[fieldKey] || [];
  const deduped = [v, ...existing.filter((x) => x !== v)].slice(
    0,
    MAX_VALUES_PER_FIELD,
  );
  return {
    ...bank,
    fieldValues: { ...(bank?.fieldValues || {}), [fieldKey]: deduped },
  };
}

/**
 * Record a tag category name.
 * Called when a tag is added to a stratum.
 */
export function recordCategory(bank, category) {
  if (!category?.trim()) return bank;
  const c = category.trim();
  const existing = bank?.categories || [];
  return {
    ...bank,
    categories: [c, ...existing.filter((x) => x !== c)].slice(
      0,
      MAX_CATEGORIES,
    ),
  };
}

/**
 * Record a field name (label) used in any scheme.
 * Called when a scheme is created/updated or applied to a stratum.
 */
export function recordFieldName(bank, fieldName) {
  if (!fieldName?.trim()) return bank;
  const n = fieldName.trim();
  const existing = bank?.fieldNames || [];
  return {
    ...bank,
    fieldNames: [n, ...existing.filter((x) => x !== n)].slice(
      0,
      MAX_FIELD_NAMES,
    ),
  };
}

/**
 * Record all metadata values from a saved stratum.
 * metadata is the flat { fieldKey: value } object from metadata.json.
 */
export function recordMetadataIntoBank(bank, metadata) {
  let b = bank || { fieldValues: {}, categories: [], fieldNames: [] };
  for (const [key, value] of Object.entries(metadata || {})) {
    if (!key) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => {
        b = recordFieldValue(b, key, v);
      });
    } else if (value !== null && value !== undefined && value !== "") {
      b = recordFieldValue(b, key, value);
    }
  }
  return b;
}

/**
 * Record all field names from a scheme.
 * Called when a scheme is applied, created, or updated.
 */
export function recordSchemeFieldNames(bank, scheme) {
  if (!scheme?.fields?.length) return bank;
  let b = bank;
  for (const field of scheme.fields) {
    if (field.label) b = recordFieldName(b, field.label);
  }
  return b;
}

/**
 * Record all tag categories from a saved tags array.
 * Called when a stratum with tags is saved.
 */
export function recordTagsIntoBank(bank, featureTags) {
  if (!Array.isArray(featureTags)) return bank;
  let b = bank;
  for (const tag of featureTags) {
    if (tag.category) b = recordCategory(b, tag.category);
    // Also record the tag value as a field value keyed by category
    if (tag.category && tag.value)
      b = recordFieldValue(b, `tag_${tag.category}`, tag.value);
  }
  return b;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function getFeatureBankStats(bank) {
  const fieldCount = Object.keys(bank?.fieldValues || {}).length;
  const totalValues = Object.values(bank?.fieldValues || {}).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const catCount = (bank?.categories || []).length;
  const nameCount = (bank?.fieldNames || []).length;
  return { fieldCount, totalValues, catCount, nameCount };
}
