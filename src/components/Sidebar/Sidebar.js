import React from 'react';
import { Home, Archive, BookOpen, Layers, BarChart2, Clock, Settings, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NAV_VIEWS } from '../../constants';
import './Sidebar.css';

const NAV_ITEMS = [
  { id:NAV_VIEWS.HOME,         icon:Home,      label:'Home',         section:'main' },
  { id:NAV_VIEWS.SCHEME_BANK,  icon:BookOpen,  label:'Scheme Bank',  section:'main' },
  { id:NAV_VIEWS.FEATURE_BANK, icon:Layers,    label:'Feature Bank', section:'main' },
  { id:NAV_VIEWS.STATS,        icon:BarChart2, label:'Statistics',   section:'main' },
  { id:NAV_VIEWS.HISTORY,      icon:Clock,     label:'History',      section:'main' },
  { id:NAV_VIEWS.SETTINGS,     icon:Settings,  label:'Settings',     section:'bottom' },
];

export default function Sidebar() {
  const { state, dispatch, openStratum } = useApp();
  const { activeView, strata, activeStratumFilePath } = state;

  const navTo  = (view) => dispatch({ type:'NAV', payload: view });
  const main   = NAV_ITEMS.filter(n => n.section === 'main');
  const bottom = NAV_ITEMS.filter(n => n.section === 'bottom');

  const handleOpenRecent = async (filePath) => {
    await openStratum(filePath);
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {main.map(item => (
          <NavItem key={item.id} item={item} active={activeView===item.id} onClick={()=>navTo(item.id)}
            badge={item.id===NAV_VIEWS.HOME ? (strata.length||null) : null} />
        ))}
      </nav>

      {strata.length > 0 && (
        <div className="sidebar__recent">
          <div className="sidebar__section-label">Recent</div>
          {strata.slice(0,8).map(s => (
            <RecentStratumItem
              key={s.filePath}
              stratum={s}
              active={activeStratumFilePath===s.filePath}
              onClick={()=>handleOpenRecent(s.filePath)}
            />
          ))}
        </div>
      )}

      <nav className="sidebar__bottom">
        {bottom.map(item => (
          <NavItem key={item.id} item={item} active={activeView===item.id} onClick={()=>navTo(item.id)} />
        ))}
      </nav>
    </aside>
  );
}

function NavItem({ item, active, onClick, badge }) {
  const Icon = item.icon;
  return (
    <button className={`nav-item ${active?'nav-item--active':''}`} onClick={onClick} title={item.label}>
      <Icon size={16} className="nav-item__icon" />
      <span className="nav-item__label">{item.label}</span>
      {badge>0 && <span className="nav-item__badge">{badge}</span>}
    </button>
  );
}

function RecentStratumItem({ stratum, active, onClick }) {
  const name = stratum.manifest?.archive_name || stratum.filename?.replace('.stratum','') || '—';
  const fmt  = stratum.manifest?.source_format?.toUpperCase() || '?';
  return (
    <button className={`recent-item ${active?'recent-item--active':''}`} onClick={onClick} title={name}>
      <span className="recent-item__fmt">{fmt}</span>
      <span className="recent-item__name truncate">{name}</span>
    </button>
  );
}
