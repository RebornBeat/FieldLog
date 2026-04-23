import { v4 as uuidv4 } from 'uuid';

// ── Scheme helpers ────────────────────────────────────────────────────────────

export function createScheme(overrides = {}) {
  return {
    id:          uuidv4(),
    name:        'New Scheme',
    description: '',
    isBuiltIn:   false,
    forFormats:  [],
    fields:      [],
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
    ...overrides,
  };
}

export function createField(label = 'New Field', type = 'text', overrides = {}) {
  const key = label.toLowerCase().trim().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') || `f_${uuidv4().slice(0,6)}`;
  return { id: uuidv4(), label, key, type, required: false, placeholder: '', options: [], order: 0, ...overrides };
}

// ── Empty data shapes for a new stratum ───────────────────────────────────────

export function emptyMetadata(scheme) {
  const data = {};
  (scheme?.fields || []).forEach(f => { data[f.key] = f.type === 'tags' ? [] : ''; });
  return data;
}

export function emptyProvenance() {
  return { collection_date:'', collection_location:'', gps_lat:'', gps_lon:'', collection_method:'', equipment:'', collector:'', notes:'' };
}

export function emptyTags() { return []; }

// ── History entry ─────────────────────────────────────────────────────────────

export function createHistoryEntry(type, details = {}) {
  return { id: uuidv4(), type, timestamp: new Date().toISOString(), ...details };
}
