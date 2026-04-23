const MAX_VALS  = 200;
const MAX_CATS  = 300;
const MAX_NAMES = 300;
const MAX_SUGG  = 8;

export function suggestFieldValues(bank, fieldKey, input) {
  if (!input || input.length < 1 || !fieldKey) return [];
  const q = input.toLowerCase();
  return (bank?.fieldValues?.[fieldKey] || []).filter(v => v.toLowerCase().includes(q) && v !== input).slice(0, MAX_SUGG);
}

export function suggestCategories(bank, input) {
  if (!input || input.length < 1) return [];
  const q = input.toLowerCase();
  return (bank?.categories || []).filter(c => c.toLowerCase().includes(q) && c !== input).slice(0, MAX_SUGG);
}

export function recordFieldValue(bank, fieldKey, value) {
  if (!value || !String(value).trim() || !fieldKey) return bank;
  const v = String(value).trim();
  const ex = bank?.fieldValues?.[fieldKey] || [];
  return { ...bank, fieldValues: { ...(bank?.fieldValues || {}), [fieldKey]: [v, ...ex.filter(x => x !== v)].slice(0, MAX_VALS) } };
}

export function recordCategory(bank, category) {
  if (!category?.trim()) return bank;
  const c = category.trim();
  return { ...bank, categories: [c, ...(bank?.categories || []).filter(x => x !== c)].slice(0, MAX_CATS) };
}

export function recordFieldName(bank, fieldName) {
  if (!fieldName?.trim()) return bank;
  const n = fieldName.trim();
  return { ...bank, fieldNames: [n, ...(bank?.fieldNames || []).filter(x => x !== n)].slice(0, MAX_NAMES) };
}

export function recordMetadataIntoBank(bank, metadata) {
  let b = bank || { fieldValues:{}, categories:[], fieldNames:[] };
  for (const [key, value] of Object.entries(metadata || {})) {
    if (!key) continue;
    if (Array.isArray(value)) value.forEach(v => { b = recordFieldValue(b, key, v); });
    else if (value !== null && value !== undefined && value !== '') b = recordFieldValue(b, key, value);
  }
  return b;
}

export function recordTagsIntoBank(bank, tags) {
  if (!Array.isArray(tags)) return bank;
  let b = bank;
  for (const tag of tags) {
    if (tag.category) b = recordCategory(b, tag.category);
    if (tag.category && tag.value) b = recordFieldValue(b, `tag_${tag.category}`, tag.value);
  }
  return b;
}

export function recordSchemeFieldNames(bank, scheme) {
  if (!scheme?.fields?.length) return bank;
  let b = bank;
  for (const f of scheme.fields) { if (f.label) b = recordFieldName(b, f.label); }
  return b;
}

export function getFeatureBankStats(bank) {
  const fieldValues = bank?.fieldValues || {};
  return {
    fieldCount:  Object.keys(fieldValues).length,
    totalValues: Object.values(fieldValues).reduce((s, a) => s + a.length, 0),
    catCount:    (bank?.categories || []).length,
    nameCount:   (bank?.fieldNames || []).length,
  };
}
