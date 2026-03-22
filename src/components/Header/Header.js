import React from 'react';
import { Search, Plus, RefreshCw, FolderOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NAV_VIEWS } from '../../constants';
import './Header.css';

const VIEW_META = {
  [NAV_VIEWS.HOME]:         { title: 'My Collection',  subtitle: 'All .stratum archives in your project' },
  [NAV_VIEWS.SCHEME_BANK]:  { title: 'Scheme Bank',    subtitle: 'Your metadata templates' },
  [NAV_VIEWS.FEATURE_BANK]: { title: 'Feature Bank',   subtitle: 'Your field name and value history' },
  [NAV_VIEWS.STATS]:        { title: 'Statistics',     subtitle: 'Collection overview and activity' },
  [NAV_VIEWS.HISTORY]:      { title: 'History',        subtitle: 'Recent actions and created archives' },
  [NAV_VIEWS.SETTINGS]:     { title: 'Settings',       subtitle: 'Project root and preferences' },
  [NAV_VIEWS.STRATUM]:      { title: null,             subtitle: null },
};

export default function Header() {
  const { state, dispatch, rescan } = useApp();
  const { activeView, searchQuery } = state;
  const meta = VIEW_META[activeView] || {};

  const isHome = activeView === NAV_VIEWS.HOME;
  const isStratum = activeView === NAV_VIEWS.STRATUM;

  if (isStratum) return null; // StratumView has its own header

  return (
    <header className="header">
      <div className="header__left">
        {meta.title && <h1 className="header__title">{meta.title}</h1>}
        {meta.subtitle && <p className="header__subtitle">{meta.subtitle}</p>}
      </div>

      <div className="header__right">
        {isHome && (
          <>
            <div className="header__search">
              <Search size={13} className="header__search-icon" />
              <input
                type="search"
                className="header__search-input"
                placeholder="Search archives…"
                value={searchQuery}
                onChange={e => dispatch({ type:'SET_SEARCH', payload: e.target.value })}
                spellCheck={false}
              />
              {searchQuery && (
                <button className="header__search-clear" onClick={() => dispatch({ type:'SET_SEARCH', payload:'' })}>×</button>
              )}
            </div>

            <button className="header__icon-btn" onClick={rescan} title="Rescan project folder">
              <RefreshCw size={14} />
            </button>

            <button
              className="header__new-btn"
              onClick={() => dispatch({ type:'OPEN_MODAL', payload:{ modal:'newStratum' } })}
              title="New Stratum (⌘N)"
            >
              <Plus size={13} />
              <span>New Stratum</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
