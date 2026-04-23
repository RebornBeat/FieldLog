import React from 'react';
import { Archive, BookOpen, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTime } from '../../utils/dateHelpers';
import './HistoryView.css';

const TYPE_ICONS = { stratum_created: Archive, scheme_created: BookOpen };
const TYPE_LABELS = { stratum_created:'Stratum created', scheme_created:'Scheme created', stratum_deleted:'Stratum deleted' };

export default function HistoryView() {
  const { state, dispatch } = useApp();
  const { history } = state;

  const clearHistory = () => {
    if (!window.confirm('Clear all history?')) return;
    dispatch({ type:'SET_HISTORY', payload:[] });
    if (window.electronAPI) window.electronAPI.writeHistory([]);
  };

  return (
    <div className="view-page">
      <div className="view-page__header">
        <div><h1 className="view-page__title">History</h1><p className="view-page__subtitle">{history.length} events recorded</p></div>
        {history.length > 0 && <button className="fb-clear-btn" onClick={clearHistory}><Trash2 size={12}/> Clear</button>}
      </div>
      <div className="view-page__body">
        {history.length === 0 && <div className="history-empty">No history yet. Actions like creating archives and updating schemes will appear here.</div>}
        <div className="history-list">
          {history.map(entry => {
            const Icon = TYPE_ICONS[entry.type] || Archive;
            return (
              <div key={entry.id} className="history-row">
                <div className="history-row__icon"><Icon size={13}/></div>
                <div className="history-row__info">
                  <span className="history-row__type">{TYPE_LABELS[entry.type]||entry.type}</span>
                  {entry.archiveName && <span className="history-row__name">{entry.archiveName}</span>}
                  {entry.sourceFilePath && <span className="history-row__detail">{entry.sourceFilePath}</span>}
                </div>
                <span className="history-row__time">{formatDateTime(entry.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
