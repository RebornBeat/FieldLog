import { v4 as uuidv4 } from 'uuid';
import React, { useState } from 'react';
import { Plus, Upload, Download, Edit2, Trash2, Copy, Star, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { createScheme, createField } from '../../utils/archiveFormat';
import { FIELD_TYPES } from '../../constants';
import { Input, Textarea, Select, Toggle } from '../common/FormElements';
import './SchemeBank.css';

export default function SchemeBank() {
  const { state, addScheme, updateScheme, deleteScheme, importScheme, exportScheme } = useApp();
  const [editing, setEditing]   = useState(null); // scheme being edited (null = list view)
  const [expandedId, setExpandedId] = useState(null);

  const userSchemes    = state.schemeBank.filter(s => !s.isBuiltIn);
  const builtinSchemes = state.schemeBank.filter(s => s.isBuiltIn);

  const startNew = () => {
    const s = createScheme({ name:'New Scheme', fields:[] });
    setEditing(s);
  };

  const duplicate = (scheme) => {
    const s = { ...scheme, id: uuidv4(), name:`${scheme.name} (copy)`, isBuiltIn:false, created_at:new Date().toISOString(), updated_at:new Date().toISOString() };
    addScheme(s);
    setEditing(s);
  };

  const handleSave = (scheme) => {
    if (state.schemeBank.find(s => s.id === scheme.id)) updateScheme(scheme);
    else addScheme(scheme);
    setEditing(null);
  };

  if (editing) {
    return <SchemeEditorPanel scheme={editing} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="view-page">
      <div className="view-page__header">
        <div>
          <h1 className="view-page__title">Scheme Bank</h1>
          <p className="view-page__subtitle">{userSchemes.length} custom · {builtinSchemes.length} built-in starter schemes</p>
        </div>
        <div className="sb-actions">
          <button className="sb-btn sb-btn--ghost" onClick={importScheme}><Upload size={13}/> Import .metascheme</button>
          <button className="sb-btn sb-btn--primary" onClick={startNew}><Plus size={13}/> New Scheme</button>
        </div>
      </div>

      <div className="view-page__body">
        {userSchemes.length > 0 && (
          <section className="sb-section">
            <h3 className="sb-section__title">Your Schemes</h3>
            <div className="scheme-list">
              {userSchemes.map(s => (
                <SchemeCard
                  key={s.id}
                  scheme={s}
                  expanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  onEdit={() => setEditing({ ...s })}
                  onDuplicate={() => duplicate(s)}
                  onDelete={() => deleteScheme(s.id)}
                  onExport={() => exportScheme(s)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="sb-section">
          <h3 className="sb-section__title">Built-in Starter Schemes <span className="sb-readonly-note">— Read-only · Duplicate to customise</span></h3>
          <div className="scheme-list">
            {builtinSchemes.map(s => (
              <SchemeCard
                key={s.id}
                scheme={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                onDuplicate={() => duplicate(s)}
                readOnly
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SchemeCard({ scheme, expanded, onToggle, onEdit, onDuplicate, onDelete, onExport, readOnly }) {
  return (
    <div className={`scheme-card ${expanded ? 'scheme-card--expanded' : ''}`}>
      <div className="scheme-card__header" onClick={onToggle}>
        <div className="scheme-card__left">
          {readOnly ? <Lock size={12} className="scheme-card__lock" /> : <Star size={12} className="scheme-card__star" />}
          <div>
            <span className="scheme-card__name">{scheme.name}</span>
            <span className="scheme-card__desc">{scheme.description}</span>
          </div>
        </div>
        <div className="scheme-card__right">
          <span className="scheme-card__count">{scheme.fields.length} field{scheme.fields.length!==1?'s':''}</span>
          <div className="scheme-card__actions" onClick={e=>e.stopPropagation()}>
            <button className="sc-btn" onClick={onDuplicate} title="Duplicate"><Copy size={11}/></button>
            {!readOnly && <><button className="sc-btn" onClick={onEdit} title="Edit"><Edit2 size={11}/></button><button className="sc-btn sc-btn--danger" onClick={onDelete} title="Delete"><Trash2 size={11}/></button></>}
            {!readOnly && <button className="sc-btn" onClick={onExport} title="Export .metascheme"><Download size={11}/></button>}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="scheme-card__fields">
          {scheme.fields.length === 0 && <span className="scheme-card__no-fields">No fields defined.</span>}
          {scheme.fields.map(f => (
            <div key={f.id} className="scheme-field-preview">
              <span className="sfp__label">{f.label}</span>
              <span className={`sfp__type sfp__type--${f.type}`}>{f.type}</span>
              {f.required && <span className="sfp__req">required</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Full Scheme Editor Panel ──────────────────────────────────────────────────
function SchemeEditorPanel({ scheme: initialScheme, onSave, onCancel }) {
  const [scheme, setScheme] = useState(initialScheme);
  const [expandedField, setExpandedField] = useState(null);
  const [dragIdx, setDragIdx]   = useState(null);
  const [overIdx, setOverIdx]   = useState(null);

  const patch  = (k, v) => setScheme(s => ({ ...s, [k]: v }));
  const addField = () => {
    const f = createField('New Field','text',{ order: scheme.fields.length });
    setScheme(s => ({ ...s, fields:[...s.fields, f] }));
    setExpandedField(f.id);
  };
  const patchField = (id, updates) => setScheme(s => ({ ...s, fields: s.fields.map(f => f.id===id ? {...f,...updates} : f) }));
  const removeField = (id) => { setScheme(s => ({ ...s, fields: s.fields.filter(f=>f.id!==id) })); if (expandedField===id) setExpandedField(null); };

  const moveField = (from, to) => {
    const next = [...scheme.fields];
    const [item] = next.splice(from,1);
    next.splice(to,0,item);
    setScheme(s => ({ ...s, fields: next.map((f,i)=>({...f,order:i})) }));
  };

  return (
    <div className="view-page">
      <div className="view-page__header">
        <div><h1 className="view-page__title">{scheme.name || 'New Scheme'}</h1><p className="view-page__subtitle">Scheme Editor</p></div>
        <div className="sb-actions">
          <button className="sb-btn sb-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="sb-btn sb-btn--primary" onClick={() => onSave(scheme)}>Save Scheme</button>
        </div>
      </div>
      <div className="view-page__body">
        <div className="se-form">
          <div className="se-form__meta">
            <Input label="Scheme Name" value={scheme.name} onChange={e=>patch('name',e.target.value)} required />
            <Textarea label="Description (optional)" value={scheme.description||''} onChange={e=>patch('description',e.target.value)} rows={2} />
          </div>

          <div className="se-fields">
            <div className="se-fields__header">
              <span className="se-fields__title">Fields ({scheme.fields.length})</span>
              <button className="sb-btn sb-btn--ghost" onClick={addField}><Plus size={12}/> Add Field</button>
            </div>

            {scheme.fields.length === 0 && (
              <div className="se-fields__empty">No fields yet. Add a field above to define your metadata structure.</div>
            )}

            {[...scheme.fields].sort((a,b)=>a.order-b.order).map((field, idx) => (
              <div
                key={field.id}
                className={`se-field ${expandedField===field.id?'se-field--expanded':''} ${overIdx===idx?'se-field--over':''} ${dragIdx===idx?'se-field--dragging':''}`}
                draggable
                onDragStart={e=>{setDragIdx(idx);e.dataTransfer.effectAllowed='move';}}
                onDragOver={e=>{e.preventDefault();setOverIdx(idx);}}
                onDrop={e=>{e.preventDefault();if(dragIdx!==null&&dragIdx!==idx)moveField(dragIdx,idx);setDragIdx(null);setOverIdx(null);}}
                onDragEnd={()=>{setDragIdx(null);setOverIdx(null);}}
              >
                <div className="se-field__row">
                  <span className="se-field__grip">⠿</span>
                  <span className="se-field__name">{field.label||'Unnamed'}</span>
                  <span className={`se-field__type`}>{field.type}</span>
                  {field.required && <span className="se-field__req">req</span>}
                  <button className="sc-btn" onClick={()=>setExpandedField(expandedField===field.id?null:field.id)}>{expandedField===field.id?'▲':'▼'}</button>
                  <button className="sc-btn sc-btn--danger" onClick={()=>removeField(field.id)}><Trash2 size={11}/></button>
                </div>
                {expandedField===field.id && (
                  <div className="se-field__editor">
                    <div className="se-field__editor-row">
                      <Input label="Label" value={field.label} onChange={e=>patchField(field.id,{label:e.target.value})} />
                      <Select label="Type" value={field.type} onChange={e=>patchField(field.id,{type:e.target.value})} options={FIELD_TYPES} />
                    </div>
                    <Input label="Placeholder" value={field.placeholder||''} onChange={e=>patchField(field.id,{placeholder:e.target.value})} placeholder="Hint text shown when empty…" />
                    {field.type==='select' && (
                      <div className="field"><label className="field__label">Options (one per line)</label><textarea className="field__input field__textarea" rows={4} value={(field.options||[]).join('\n')} onChange={e=>patchField(field.id,{options:e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)})} /></div>
                    )}
                    <Toggle label="Required field" checked={field.required} onChange={v=>patchField(field.id,{required:v})} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
