import React, { useCallback, useRef } from 'react';
import { Plus, FileX, FolderOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NAV_VIEWS, FORMAT_LABELS } from '../../constants';
import { formatFileSize } from '../../utils/formatDetector';
import { formatDate } from '../../utils/dateHelpers';
import './MainView.css';

export default function MainView() {
  const { state, dispatch, filteredStrata, openStratum, createStratum } = useApp();
  const { searchQuery } = state;
  const dropZoneRef = useRef(null);

  // ── Drag-and-drop file onto the zone ─────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); dropZoneRef.current?.classList.add('drop-zone--over'); };
  const handleDragLeave= () => dropZoneRef.current?.classList.remove('drop-zone--over');
  const handleDrop     = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('drop-zone--over');
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const file = files[0];
    // Pre-fill the NewStratumModal with the dropped file path
    dispatch({ type:'OPEN_MODAL', payload:{ modal:'newStratum', prefillPath: file.path, prefillName: file.name } });
  };

  const handleOpenStratum = useCallback(async (filePath) => {
    await openStratum(filePath);
  }, [openStratum]);

  if (!state.setupComplete) {
    return (
      <div className="main-view main-view--center">
        <div className="main-empty">
          <div className="main-empty__strata">
            {[1,.7,.5,.3,.15].map((o,i)=><div key={i} className="strata-bar" style={{opacity:o,height:`${14-i*2}px`}}/>)}
          </div>
          <h2 className="main-empty__headline">Welcome to MetaStrata</h2>
          <p className="main-empty__sub">Choose a project folder to get started. All your archives will be auto-saved there.</p>
          <button className="main-empty__cta" onClick={() => dispatch({ type:'OPEN_MODAL', payload:{ modal:'setupWizard' } })}>
            <FolderOpen size={15} /> Choose Project Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="main-view"
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay hint */}
      <div className="drop-hint">Drop any file here to create a .stratum</div>

      {/* Empty state */}
      {filteredStrata.length === 0 && (
        <div className="main-view main-view--center">
          {searchQuery ? (
            <div className="main-empty">
              <FileX size={28} className="main-empty__icon" />
              <p className="main-empty__headline">No results for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="main-empty">
              <div className="main-empty__strata">
                {[1,.7,.5,.3,.15].map((o,i)=><div key={i} className="strata-bar" style={{opacity:o,height:`${14-i*2}px`}}/>)}
              </div>
              <h2 className="main-empty__headline">No archives yet</h2>
              <p className="main-empty__sub">Drag any file here or click below to create your first .stratum archive.</p>
              <button className="main-empty__cta" onClick={() => dispatch({ type:'OPEN_MODAL', payload:{ modal:'newStratum' } })}>
                <Plus size={15} /> New Stratum
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid of stratum cards */}
      {filteredStrata.length > 0 && (
        <div className="stratum-grid">
          {filteredStrata.map((s,i) => (
            <StratumCard
              key={s.filePath}
              stratum={s}
              index={i}
              onOpen={() => handleOpenStratum(s.filePath)}
            />
          ))}

          {/* Add card */}
          <button
            className="stratum-card stratum-card--add"
            onClick={() => dispatch({ type:'OPEN_MODAL', payload:{ modal:'newStratum' } })}
          >
            <Plus size={22} className="stratum-card__add-icon" />
            <span>New Stratum</span>
          </button>
        </div>
      )}
    </div>
  );
}

function StratumCard({ stratum, index, onOpen }) {
  const m    = stratum.manifest || {};
  const name = m.archive_name || stratum.filename?.replace('.stratum','') || `Archive ${index+1}`;
  const fmt  = m.source_format ? (FORMAT_LABELS[m.source_format] || m.source_format.toUpperCase()) : '?';
  const size = formatFileSize(m.source_size_bytes);
  const date = formatDate(m.updated_at || m.created_at);

  return (
    <button className="stratum-card" onClick={onOpen}>
      <div className="stratum-card__top">
        <span className="stratum-card__fmt">{fmt}</span>
        <span className="stratum-card__index">#{index+1}</span>
      </div>

      <div className="stratum-card__name truncate">{name}</div>

      <div className="stratum-card__file truncate">{m.source_filename || '—'}</div>

      <div className="stratum-card__bottom">
        <span className="stratum-card__size">{size}</span>
        <span className="stratum-card__date">{date}</span>
      </div>

      {m.applied_scheme_id && (
        <div className="stratum-card__scheme-badge">
          <span>scheme applied</span>
        </div>
      )}
    </button>
  );
}
