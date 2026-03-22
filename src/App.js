import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import TitleBar from './components/TitleBar/TitleBar';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import HomeView from './components/MainView/MainView';
import StratumView from './components/StratumView/StratumView';
import SchemeBank from './components/SchemeBank/SchemeBank';
import FeatureBank from './components/FeatureBank/FeatureBank';
import StatsView from './components/Stats/StatsView';
import HistoryView from './components/History/HistoryView';
import Settings from './components/Settings/Settings';
import EmptyState from './components/EmptyState/EmptyState';
import NewStratumModal from './components/Modals/NewStratumModal';
import NewCollectionModal from './components/Modals/NewCollectionModal';
import ConfirmModal from './components/Modals/ConfirmModal';
import AboutModal from './components/Modals/AboutModal';
import NagoyaModal from './components/Modals/NagoyaModal';
import SetupWizard from './components/Modals/SetupWizard';
import Notifications from './components/Notifications/Notifications';
import { NAV_VIEWS } from './constants';
import './App.css';

function AppShell() {
  const { state } = useApp();
  const { activeView, setupComplete } = state;

  const renderContent = () => {
    if (!setupComplete && activeView === NAV_VIEWS.HOME) {
      return <EmptyState variant="setup" />;
    }
    switch (activeView) {
      case NAV_VIEWS.HOME:         return <HomeView />;
      case NAV_VIEWS.STRATUM:      return <StratumView />;
      case NAV_VIEWS.SCHEME_BANK:  return <SchemeBank />;
      case NAV_VIEWS.FEATURE_BANK: return <FeatureBank />;
      case NAV_VIEWS.STATS:        return <StatsView />;
      case NAV_VIEWS.HISTORY:      return <HistoryView />;
      case NAV_VIEWS.SETTINGS:     return <Settings />;
      default:                     return <HomeView />;
    }
  };

  return (
    <div className="app-root">
      <TitleBar />
      <div className="app-body">
        <Sidebar />
        <div className="app-content">
          <Header />
          <div className="app-main">
            {renderContent()}
          </div>
        </div>
      </div>
      {/* Modals */}
      <NewStratumModal />
      <NewCollectionModal />
      <ConfirmModal />
      <AboutModal />
      <NagoyaModal />
      <SetupWizard />
      <Notifications />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ThemeProvider>
  );
}
