import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { FORMAT_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateHelpers';
import './StatsView.css';

export default function StatsView() {
  const { state } = useApp();
  const { strata, schemeBank, history } = state;

  const stats = useMemo(() => {
    const byFormat = {};
    strata.forEach(s => {
      const fmt = s.manifest?.source_format || 'unknown';
      byFormat[fmt] = (byFormat[fmt]||0) + 1;
    });
    const withScheme = strata.filter(s => s.manifest?.applied_scheme_id).length;
    const totalSize  = strata.reduce((acc,s) => acc + (s.manifest?.source_size_bytes||0), 0);
    const schemeUsage = {};
    strata.forEach(s => {
      const id = s.manifest?.applied_scheme_id;
      if (id) schemeUsage[id] = (schemeUsage[id]||0)+1;
    });
    return { byFormat, withScheme, totalSize, schemeUsage };
  }, [strata]);

  const formatSize = (b) => b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/1024/1024).toFixed(1)} MB`;

  return (
    <div className="view-page">
      <div className="view-page__header"><div><h1 className="view-page__title">Statistics</h1><p className="view-page__subtitle">Aggregate overview of your collection</p></div></div>
      <div className="view-page__body">
        <div className="stats-grid">
          <StatCard label="Total Archives"    value={strata.length}           />
          <StatCard label="With Scheme"       value={stats.withScheme}        />
          <StatCard label="Total Source Size" value={formatSize(stats.totalSize)} />
          <StatCard label="Schemes Defined"   value={schemeBank.filter(s=>!s.isBuiltIn).length} />
          <StatCard label="History Events"    value={history.length}          />
        </div>

        {Object.keys(stats.byFormat).length > 0 && (
          <div className="stats-section">
            <h3 className="stats-section__title">Archives by Format</h3>
            <div className="stats-bars">
              {Object.entries(stats.byFormat).sort((a,b)=>b[1]-a[1]).map(([fmt,cnt])=>(
                <div key={fmt} className="stats-bar-row">
                  <span className="stats-bar-row__label">{FORMAT_LABELS[fmt]||fmt.toUpperCase()}</span>
                  <div className="stats-bar-row__track">
                    <div className="stats-bar-row__fill" style={{width:`${(cnt/strata.length)*100}%`}} />
                  </div>
                  <span className="stats-bar-row__count">{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(stats.schemeUsage).length > 0 && (
          <div className="stats-section">
            <h3 className="stats-section__title">Most Used Schemes</h3>
            <div className="stats-scheme-list">
              {Object.entries(stats.schemeUsage).sort((a,b)=>b[1]-a[1]).map(([id,cnt])=>{
                const sc = schemeBank.find(s=>s.id===id);
                return (
                  <div key={id} className="stats-scheme-row">
                    <span className="stats-scheme-row__name">{sc?.name||id.slice(0,12)}</span>
                    <span className="stats-scheme-row__cnt">{cnt}×</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}
