import React from 'react';
import { FolderOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './EmptyState.css';

export default function EmptyState({ variant }) {
  const { dispatch, chooseProjectRoot } = useApp();
  if (variant === 'setup') {
    return (
      <div className="empty-state">
        <FolderOpen size={28} className="empty-state__icon" />
        <h2 className="empty-state__title">No project folder set</h2>
        <p className="empty-state__sub">Choose a folder where your archives will be auto-saved.</p>
        <button className="empty-state__btn" onClick={chooseProjectRoot}>Choose Project Folder</button>
      </div>
    );
  }
  return null;
}
