import React, { useState, useEffect } from 'react';
import { X, Minus, Maximize2, Square, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import './TitleBar.css';

export default function TitleBar() {
  const { state } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const platform   = isElectron ? window.electronAPI.platform : 'web';

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.isMaximized().then(setIsMaximized);
    const cleanup = window.electronAPI.onWindowStateChange(({ maximized }) => setIsMaximized(maximized));
    return cleanup;
  }, [isElectron]);

  const isMac = platform === 'darwin';

  return (
    <div className={`titlebar drag-region ${isMac ? 'titlebar--mac' : 'titlebar--win'}`}>
      {isMac && <div className="titlebar__mac-spacer no-drag" />}

      <div className="titlebar__brand no-drag">
        <StratumMark />
        <span className="titlebar__name">MetaStrata</span>
      </div>

      {state.activeStratumFilePath && (
        <div className="titlebar__active-file no-drag">
          <span className="titlebar__file-name">{state.openStratum?.manifest?.archive_name || '—'}</span>
          {state.openStratum?.isDirty && <span className="titlebar__dirty" title="Unsaved changes" />}
        </div>
      )}

      <div className="titlebar__spacer" />

      <div className="titlebar__actions no-drag">
        <button className="titlebar__action-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>

      {!isMac && (
        <div className="titlebar__win-controls no-drag">
          <button className="win-btn win-btn--minimize" onClick={() => isElectron && window.electronAPI.minimize()}><Minus size={10} /></button>
          <button className="win-btn win-btn--maximize" onClick={() => isElectron && window.electronAPI.toggleMaximize()}>
            {isMaximized ? <Square size={9} /> : <Maximize2 size={9} />}
          </button>
          <button className="win-btn win-btn--close"    onClick={() => isElectron && window.electronAPI.close()}><X size={10} /></button>
        </div>
      )}
    </div>
  );
}

function StratumMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="2"  width="14" height="3"   rx="1" fill="var(--accent)"      />
      <rect x="1" y="6.5" width="14" height="2.5" rx="1" fill="var(--accent-dim)" opacity="0.75"/>
      <rect x="1" y="10.5" width="14" height="2.5" rx="1" fill="var(--accent-dim)" opacity="0.45"/>
      <rect x="1" y="14"   width="14" height="1"   rx="0.5" fill="var(--accent-dim)" opacity="0.25"/>
    </svg>
  );
}
