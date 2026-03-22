import React, { useState, useMemo } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getFeatureBankStats } from '../../utils/featureBank';
import './FeatureBank.css';

export default function FeatureBank() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('values');
  const bank = state.featureBank;
  const stats = getFeatureBankStats(bank);

  const filteredValues = useMemo(() => {
    const q = search.toLowerCase();
    const result = [];
    Object.entries(bank.fieldValues || {}).forEach(([key, vals]) => {
      const filteredVals = q ? vals.filter(v => v.toLowerCase().includes(q) || key.toLowerCase().includes(q)) : vals;
      if (filteredVals.length) result.push({ key, values: filteredVals });
    });
    return result;
  }, [bank, search]);

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase();
    return (bank.categories || []).filter(c => !q || c.toLowerCase().includes(q));
  }, [bank, search]);

  const clearBank = () => {
    if (!window.confirm('Clear all Feature Bank history? This cannot be undone.')) return;
    const empty = { fieldValues:{}, categories:[], fieldNames:[] };
    dispatch({ type:'SET_FEATURE_BANK', payload: empty });
    if (window.electronAPI) window.electronAPI.writeFeatureBank(empty);
  };

  return (
    <div className="view-page">
      <div className="view-page__header">
        <div>
          <h1 className="view-page__title">Feature Bank</h1>
          <p className="view-page__subtitle">{stats.totalValues} values across {stats.fieldCount} fields · {stats.catCount} categories</p>
        </div>
        <button className="fb-clear-btn" onClick={clearBank}><Trash2 size={12}/> Clear All</button>
      </div>

      <div className="view-page__body">
        <div className="fb-search-row">
          <div className="fb-search">
            <Search size={13} className="fb-search__icon"/>
            <input className="fb-search__input" placeholder="Search history…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div className="fb-tabs">
            {[['values','Field Values'],['categories','Tag Categories'],['names','Field Names']].map(([id,lbl])=>(
              <button key={id} className={`fb-tab ${tab===id?'fb-tab--active':''}`} onClick={()=>setTab(id)}>{lbl}</button>
            ))}
          </div>
        </div>

        {tab === 'values' && (
          <div className="fb-section">
            {filteredValues.length === 0 && <div className="fb-empty">No field values in history yet.</div>}
            {filteredValues.map(({ key, values }) => (
              <div key={key} className="fb-group">
                <div className="fb-group__key">{key}</div>
                <div className="fb-group__vals">
                  {values.map((v,i) => <span key={i} className="fb-chip">{v}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'categories' && (
          <div className="fb-chips">
            {filteredCategories.length === 0 && <div className="fb-empty">No tag categories in history yet.</div>}
            {filteredCategories.map((c,i) => <span key={i} className="fb-chip fb-chip--cat">{c}</span>)}
          </div>
        )}

        {tab === 'names' && (
          <div className="fb-chips">
            {(bank.fieldNames||[]).filter(n=>!search||n.toLowerCase().includes(search.toLowerCase())).map((n,i)=>(
              <span key={i} className="fb-chip fb-chip--name">{n}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
