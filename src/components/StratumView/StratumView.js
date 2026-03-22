import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Trash2, Download, BookOpen, Tag, MapPin, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NAV_VIEWS, PROVENANCE_FIELDS, FORMAT_LABELS } from '../../constants';
import { formatDateTime, formatDate } from '../../utils/dateHelpers';
import { formatFileSize } from '../../utils/formatDetector';
import { suggestFieldValues, suggestCategories } from '../../utils/featureBank';
import AutoSuggestInput from '../common/AutoSuggestInput';
import { Input, Textarea, Select, TagsInput, Toggle } from '../common/FormElements';
import './StratumView.css';

const TABS = [
  { id:'metadata',   label:'Metadata',   icon: FileText },
  { id:'provenance', label:'Provenance', icon: MapPin },
  { id:'tags',       label:'Tags',       icon: Tag },
];

export default function StratumView() {
  const { state, dispatch, saveOpenStratum, deleteStratum } = useApp();
  const [activeTab, setActiveTab] = useState('metadata');
  const { openStratum: stratum, activeStratumFilePath, featureBank } = state;

  // Auto-save on unmount if dirty
  const saveRef = useRef(saveOpenStratum);
  saveRef.current = saveOpenStratum;
  useEffect(() => () => { if (state.openStratum?.isDirty) saveRef.current(); }, []);

  // Save on ⌘S
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveOpenStratum(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveOpenStratum]);

  if (!stratum) {
    return (
      <div className="stratum-view stratum-view--empty">
        <p>No stratum open. Go back to Home and select one.</p>
        <button className="sv-back-btn" onClick={() => dispatch({ type:'NAV', payload: NAV_VIEWS.HOME })}>
          <ArrowLeft size={14} /> Back to Home
        </button>
      </div>
    );
  }

  const m = stratum.manifest || {};
  const appliedScheme = state.schemeBank.find(sc => sc.id === m.applied_scheme_id) || null;

  const handleMetadataChange = (key, val) => {
    dispatch({ type:'UPDATE_OPEN_METADATA', payload:{ [key]: val } });
  };
  const handleProvenanceChange = (key, val) => {
    dispatch({ type:'UPDATE_OPEN_PROVENANCE', payload:{ [key]: val } });
  };
  const handleTagsChange = (tags) => {
    dispatch({ type:'UPDATE_OPEN_TAGS', payload: tags });
  };
  const handleSchemeChange = (schemeId) => {
    dispatch({ type:'UPDATE_OPEN_MANIFEST', payload:{ applied_scheme_id: schemeId } });
    // Pre-seed metadata keys from new scheme
    const sc = state.schemeBank.find(s => s.id === schemeId);
    if (sc) {
      const seeded = {};
      sc.fields.forEach(f => { if (!(f.key in (stratum.metadata||{}))) seeded[f.key] = f.type==='tags'?[]:''; });
      if (Object.keys(seeded).length) dispatch({ type:'UPDATE_OPEN_METADATA', payload: seeded });
    }
  };

  return (
    <div className="stratum-view">
      {/* Stratum header bar */}
      <div className="sv-header">
        <button className="sv-back-btn" onClick={() => { if(stratum.isDirty) saveOpenStratum(); dispatch({ type:'NAV', payload:NAV_VIEWS.HOME }); }}>
          <ArrowLeft size={13} />
        </button>

        <div className="sv-header__info">
          <span className="sv-header__name">{m.archive_name || '—'}</span>
          <span className="sv-header__file">{m.source_filename}</span>
          <span className="sv-header__fmt">{m.source_format ? (FORMAT_LABELS[m.source_format] || m.source_format.toUpperCase()) : '?'}</span>
          <span className="sv-header__size">{formatFileSize(m.source_size_bytes)}</span>
        </div>

        {stratum.isDirty && <span className="sv-header__dirty">unsaved</span>}

        <div className="sv-header__actions">
          {/* Scheme selector */}
          <div className="sv-scheme-select">
            <BookOpen size={12} />
            <select
              className="sv-scheme-dropdown"
              value={m.applied_scheme_id || ''}
              onChange={e => handleSchemeChange(e.target.value)}
            >
              <option value="">— No scheme —</option>
              {state.schemeBank.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name}{sc.isBuiltIn ? ' ★' : ''}</option>
              ))}
            </select>
          </div>

          <button className="sv-btn sv-btn--ghost" title="Extract source file" onClick={() => window.electronAPI?.extractStratumSource(activeStratumFilePath)}>
            <Download size={13} />
          </button>
          <button className="sv-btn sv-btn--danger" title="Delete archive" onClick={() => { if(window.confirm('Delete this .stratum archive? This cannot be undone.')) deleteStratum(activeStratumFilePath); }}>
            <Trash2 size={13} />
          </button>
          <button className="sv-btn sv-btn--primary" onClick={saveOpenStratum} disabled={!stratum.isDirty} title="Save (⌘S)">
            <Save size={13} /> Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sv-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`sv-tab ${activeTab===tab.id ? 'sv-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="sv-body">
        {activeTab === 'metadata' && (
          <MetadataTab
            appliedScheme={appliedScheme}
            metadata={stratum.metadata || {}}
            featureBank={featureBank}
            onChange={handleMetadataChange}
          />
        )}
        {activeTab === 'provenance' && (
          <ProvenanceTab
            provenance={stratum.provenance || {}}
            onChange={handleProvenanceChange}
          />
        )}
        {activeTab === 'tags' && (
          <TagsTab
            tags={stratum.tags?.feature_tags || []}
            featureBank={featureBank}
            onChange={handleTagsChange}
          />
        )}
      </div>

      {/* Manifest footer */}
      <div className="sv-footer">
        <span className="sv-footer__item"><strong>SHA-256:</strong> {m.source_sha256?.slice(0,16)}…</span>
        <span className="sv-footer__item"><strong>Created:</strong> {formatDate(m.created_at)}</span>
        <span className="sv-footer__item"><strong>Updated:</strong> {formatDate(m.updated_at)}</span>
        <span className="sv-footer__item"><strong>MetaStrata:</strong> {m.metastrata_version}</span>
      </div>
    </div>
  );
}

// ── Metadata Tab ─────────────────────────────────────────────────────────────
function MetadataTab({ appliedScheme, metadata, featureBank, onChange }) {
  if (!appliedScheme || !appliedScheme.fields.length) {
    return (
      <div className="sv-tab-empty">
        <BookOpen size={24} />
        <p>No scheme applied.</p>
        <p>Select a scheme from the dropdown above to add structured metadata fields.</p>
        <p className="sv-tab-hint">You can create or edit schemes in the <strong>Scheme Bank</strong>.</p>
      </div>
    );
  }
  return (
    <div className="sv-fields">
      {[...appliedScheme.fields].sort((a,b)=>a.order-b.order).map(field => (
        <MetadataField
          key={field.id}
          field={field}
          value={metadata[field.key]}
          featureBank={featureBank}
          onChange={val => onChange(field.key, val)}
        />
      ))}
    </div>
  );
}

function MetadataField({ field, value, featureBank, onChange }) {
  const suggestions = suggestFieldValues(featureBank, field.key, typeof value === 'string' ? value : '');
  switch (field.type) {
    case 'textarea':
      return <Textarea label={field.label} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder} required={field.required} rows={3} />;
    case 'select':
      return <Select label={field.label} value={value||''} onChange={e=>onChange(e.target.value)} options={(field.options||[]).map(o=>({value:o,label:o}))} required={field.required} />;
    case 'tags':
      return <TagsInput label={field.label} value={Array.isArray(value)?value:[]} onChange={onChange} />;
    case 'boolean':
      return <Toggle label={field.label} checked={!!value} onChange={onChange} />;
    case 'date':
      return <Input label={field.label} type="date" value={value?.slice?.(0,10)||''} onChange={e=>onChange(e.target.value)} required={field.required} />;
    case 'number':
      return <Input label={field.label} type="number" value={value??''} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||'0'} required={field.required} />;
    case 'url':
      return <Input label={field.label} type="url" value={value||''} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||'https://…'} required={field.required} />;
    case 'gps':
      return (
        <div className="gps-field">
          <label className="field__label">{field.label}</label>
          <div className="gps-field__row">
            <Input placeholder="Latitude" type="number" value={value?.lat??''} onChange={e=>onChange({...(value||{}),lat:e.target.value})} />
            <Input placeholder="Longitude" type="number" value={value?.lon??''} onChange={e=>onChange({...(value||{}),lon:e.target.value})} />
          </div>
        </div>
      );
    default:
      return (
        <AutoSuggestInput
          label={field.label}
          value={value||''}
          onChange={onChange}
          suggestions={suggestions}
          placeholder={field.placeholder||`Enter ${field.label.toLowerCase()}…`}
          required={field.required}
        />
      );
  }
}

// ── Provenance Tab ────────────────────────────────────────────────────────────
function ProvenanceTab({ provenance, onChange }) {
  return (
    <div className="sv-fields">
      <p className="sv-section-note">Collection context — always preserved in provenance.json regardless of scheme.</p>
      {PROVENANCE_FIELDS.map(f => {
        const val = provenance[f.key] ?? '';
        if (f.type === 'textarea') return <Textarea key={f.key} label={f.label} value={val} onChange={e=>onChange(f.key,e.target.value)} rows={3} />;
        if (f.type === 'number')   return <Input    key={f.key} label={f.label} type="number" value={val} onChange={e=>onChange(f.key,e.target.value)} />;
        if (f.type === 'date')     return <Input    key={f.key} label={f.label} type="date"   value={val?.slice?.(0,10)||''} onChange={e=>onChange(f.key,e.target.value)} />;
        return <Input key={f.key} label={f.label} value={val} onChange={e=>onChange(f.key,e.target.value)} />;
      })}
    </div>
  );
}

// ── Tags Tab ──────────────────────────────────────────────────────────────────
function TagsTab({ tags, featureBank, onChange }) {
  const [newCat, setNewCat]     = useState('');
  const [newVal, setNewVal]     = useState('');
  const [catSugg, setCatSugg]   = useState([]);
  const [valSugg, setValSugg]   = useState([]);

  // suggestCategories and suggestFieldValues imported at top of file

  const updateCat = (v) => { setNewCat(v); setCatSugg(suggestCategories(featureBank, v)); };
  const updateVal = (v) => { setNewVal(v); setValSugg(suggestFieldValues(featureBank, `tag_${newCat}`, v)); };

  const addTag = () => {
    const c = newCat.trim(); const v = newVal.trim();
    if (!c || !v) return;
    onChange([...tags, { category: c, value: v }]);
    setNewCat(''); setNewVal(''); setCatSugg([]); setValSugg([]);
  };
  const removeTag = (i) => onChange(tags.filter((_,idx)=>idx!==i));

  return (
    <div className="sv-tags-tab">
      <p className="sv-section-note">Feature tags are free-form key-value annotations. Stored in tags.json, separate from scheme metadata.</p>

      <div className="tags-list">
        {tags.length === 0 && <p className="tags-empty">No tags yet. Add one below.</p>}
        {tags.map((t,i) => (
          <div key={i} className="tag-row">
            <span className="tag-row__cat">{t.category}</span>
            <span className="tag-row__sep">→</span>
            <span className="tag-row__val">{t.value}</span>
            <button className="tag-row__remove" onClick={()=>removeTag(i)}>×</button>
          </div>
        ))}
      </div>

      <div className="tag-add-form">
        <div className="tag-add-form__row">
          <AutoSuggestInput
            placeholder="Category (e.g. habitat)"
            value={newCat}
            onChange={updateCat}
            suggestions={catSugg}
          />
          <AutoSuggestInput
            placeholder="Value"
            value={newVal}
            onChange={updateVal}
            suggestions={valSugg}
            onKeyDown={e => e.key==='Enter' && addTag()}
          />
          <button className="tag-add-btn" onClick={addTag}>Add</button>
        </div>
      </div>
    </div>
  );
}
