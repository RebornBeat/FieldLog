import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STARTER_SCHEMES } from '../utils/starterSchemes';
import { createHistoryEntry } from '../utils/archiveFormat';
import { recordMetadataIntoBank } from '../utils/featureBank';
import { NAV_VIEWS } from '../constants';

// ─── Initial state ────────────────────────────────────────────────────────────
const init = {
  // Setup
  projectRoot:    null,
  setupComplete:  false,

  // Navigation
  activeView:     NAV_VIEWS.HOME,
  activeStratumFilePath: null,   // currently open .stratum for editing

  // Loaded from project root
  strata:      [],   // [{ filePath, filename, manifest }]
  collections: [],   // [{ filePath, filename, index }]

  // Open stratum data
  openStratum: null, // { manifest, metadata, provenance, tags, isDirty }

  // Scheme Bank (persisted)
  schemeBank:  [],

  // Feature Bank (persisted)
  featureBank: { fieldValues:{}, categories:[], fieldNames:[] },

  // History (persisted)
  history: [],

  // UI
  searchQuery: '',
  modals: {
    newStratum:        false,
    newCollection:     false,
    schemeEditor:      false,   // for editing scheme in SchemeBank
    editingSchemeId:   null,
    about:             false,
    nagoya:            false,
    confirmDeleteId:   null,    // filePath of stratum to delete
    setupWizard:       false,
  },
  notifications: [],
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(s, action) {
  switch (action.type) {

    case 'INIT_COMPLETE':
      return { ...s,
        projectRoot:   action.payload.projectRoot,
        setupComplete: action.payload.setupComplete,
        strata:        action.payload.strata || [],
        collections:   action.payload.collections || [],
        schemeBank:    action.payload.schemeBank || [],
        featureBank:   action.payload.featureBank || s.featureBank,
        history:       action.payload.history || [],
      };

    case 'SET_PROJECT_ROOT':
      return { ...s, projectRoot: action.payload, setupComplete: true };

    case 'SCAN_COMPLETE':
      return { ...s, strata: action.payload.strata || [], collections: action.payload.collections || [] };

    // ── Navigation ──────────────────────────────────────────────────────────
    case 'NAV':
      return { ...s, activeView: action.payload, activeStratumFilePath: null, openStratum: null };

    case 'OPEN_STRATUM':
      return { ...s, activeView: NAV_VIEWS.STRATUM, activeStratumFilePath: action.payload.filePath, openStratum: { ...action.payload.data, isDirty: false } };

    case 'CLOSE_STRATUM':
      return { ...s, activeView: NAV_VIEWS.HOME, activeStratumFilePath: null, openStratum: null };

    // ── Stratum edits ────────────────────────────────────────────────────────
    case 'UPDATE_OPEN_METADATA':
      return { ...s, openStratum: { ...s.openStratum, metadata: { ...s.openStratum.metadata, ...action.payload }, isDirty: true } };

    case 'UPDATE_OPEN_PROVENANCE':
      return { ...s, openStratum: { ...s.openStratum, provenance: { ...s.openStratum.provenance, ...action.payload }, isDirty: true } };

    case 'UPDATE_OPEN_TAGS':
      return { ...s, openStratum: { ...s.openStratum, tags: { feature_tags: action.payload }, isDirty: true } };

    case 'SET_OPEN_STRATUM_CLEAN':
      return { ...s, openStratum: s.openStratum ? { ...s.openStratum, isDirty: false } : null };

    case 'UPDATE_OPEN_MANIFEST':
      return { ...s, openStratum: { ...s.openStratum, manifest: { ...s.openStratum.manifest, ...action.payload } } };

    // ── Stratum list ─────────────────────────────────────────────────────────
    case 'ADD_STRATUM':
      return { ...s, strata: [action.payload, ...s.strata] };

    case 'REMOVE_STRATUM':
      return { ...s, strata: s.strata.filter(x => x.filePath !== action.payload) };

    case 'ADD_COLLECTION':
      return { ...s, collections: [action.payload, ...s.collections] };

    // ── Scheme Bank ──────────────────────────────────────────────────────────
    case 'SET_SCHEME_BANK':
      return { ...s, schemeBank: action.payload };

    case 'ADD_SCHEME':
      return { ...s, schemeBank: [action.payload, ...s.schemeBank] };

    case 'UPDATE_SCHEME': {
      const updated = s.schemeBank.map(sc => sc.id === action.payload.id ? { ...sc, ...action.payload, updated_at: new Date().toISOString() } : sc);
      return { ...s, schemeBank: updated };
    }

    case 'DELETE_SCHEME':
      return { ...s, schemeBank: s.schemeBank.filter(sc => sc.id !== action.payload) };

    // ── Feature Bank ─────────────────────────────────────────────────────────
    case 'SET_FEATURE_BANK':
      return { ...s, featureBank: action.payload };

    case 'RECORD_FEATURE_BANK':
      return { ...s, featureBank: action.payload };

    // ── History ──────────────────────────────────────────────────────────────
    case 'ADD_HISTORY':
      return { ...s, history: [action.payload, ...s.history].slice(0, 500) };

    case 'SET_HISTORY':
      return { ...s, history: action.payload };

    // ── UI ───────────────────────────────────────────────────────────────────
    case 'SET_SEARCH': return { ...s, searchQuery: action.payload };

    case 'OPEN_MODAL': {
      const { modal, ...extra } = action.payload;
      return { ...s, modals: { ...s.modals, [modal]: true, ...extra } };
    }
    case 'CLOSE_MODAL': return { ...s, modals: { ...s.modals, [action.payload]: false } };

    case 'ADD_NOTIFICATION': return { ...s, notifications: [...s.notifications, action.payload] };
    case 'REMOVE_NOTIFICATION': return { ...s, notifications: s.notifications.filter(n => n.id !== action.payload) };

    default: return s;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // ── Boot: load config, schemes, feature bank, history, scan project ────────
  useEffect(() => {
    if (!isElectron) return;
    (async () => {
      const config     = await window.electronAPI.getConfig();
      const rawSchemes = await window.electronAPI.readSchemeBank();
      const featureBank= await window.electronAPI.readFeatureBank();
      const history    = await window.electronAPI.readHistory();

      // Merge built-in + user schemes (built-ins go last in bank)
      const builtInIds = new Set(STARTER_SCHEMES.map(s => s.id));
      const userSchemes = rawSchemes.filter(s => !builtInIds.has(s.id));
      const schemeBank  = [...userSchemes, ...STARTER_SCHEMES];

      let strata = [], collections = [];
      if (config.projectRoot) {
        const scan = await window.electronAPI.scanProject();
        strata      = scan.strata      || [];
        collections = scan.collections || [];
      }

      dispatch({
        type: 'INIT_COMPLETE',
        payload: { projectRoot: config.projectRoot, setupComplete: config.setupComplete, strata, collections, schemeBank, featureBank, history },
      });

      if (!config.setupComplete || !config.projectRoot) {
        dispatch({ type: 'OPEN_MODAL', payload: { modal: 'setupWizard' } });
      }
    })();
  }, [isElectron]);

  // ── Menu action listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isElectron) return;
    const cleanup = window.electronAPI.onMenuAction(({ action }) => {
      switch (action) {
        case 'new-stratum':      dispatch({ type:'OPEN_MODAL', payload:{ modal:'newStratum' } }); break;
        case 'new-collection':   dispatch({ type:'OPEN_MODAL', payload:{ modal:'newCollection' } }); break;
        case 'nav-home':         dispatch({ type:'NAV', payload: NAV_VIEWS.HOME }); break;
        case 'nav-scheme-bank':  dispatch({ type:'NAV', payload: NAV_VIEWS.SCHEME_BANK }); break;
        case 'nav-feature-bank': dispatch({ type:'NAV', payload: NAV_VIEWS.FEATURE_BANK }); break;
        case 'nav-stats':        dispatch({ type:'NAV', payload: NAV_VIEWS.STATS }); break;
        case 'nav-history':      dispatch({ type:'NAV', payload: NAV_VIEWS.HISTORY }); break;
        case 'toggle-theme':     document.body.classList.toggle('theme-light'); break;
        case 'about':            dispatch({ type:'OPEN_MODAL', payload:{ modal:'about' } }); break;
        case 'nagoya':           dispatch({ type:'OPEN_MODAL', payload:{ modal:'nagoya' } }); break;
        default: break;
      }
    });
    return cleanup;
  }, [isElectron]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'n' && !e.shiftKey) { e.preventDefault(); dispatch({ type:'OPEN_MODAL', payload:{ modal:'newStratum' } }); }
      if (e.key === 'N' && e.shiftKey)  { e.preventDefault(); if (state.strata.length >= 2) dispatch({ type:'OPEN_MODAL', payload:{ modal:'newCollection' } }); }
      if (e.key === 'b') { e.preventDefault(); dispatch({ type:'NAV', payload: NAV_VIEWS.SCHEME_BANK }); }
      if (e.key === 'h') { e.preventDefault(); dispatch({ type:'NAV', payload: NAV_VIEWS.HOME }); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [state.strata.length]);

  // ── Persist scheme bank ────────────────────────────────────────────────────
  const persistSchemeBank = useCallback((schemes) => {
    if (!isElectron) return;
    const userOnly = schemes.filter(s => !s.isBuiltIn);
    window.electronAPI.writeSchemeBank(userOnly).catch(() => {});
  }, [isElectron]);

  // ── Persist feature bank ───────────────────────────────────────────────────
  const persistFeatureBank = useCallback((bank) => {
    if (!isElectron) return;
    window.electronAPI.writeFeatureBank(bank).catch(() => {});
  }, [isElectron]);

  // ── Persist history ────────────────────────────────────────────────────────
  const persistHistory = useCallback((entries) => {
    if (!isElectron) return;
    window.electronAPI.writeHistory(entries).catch(() => {});
  }, [isElectron]);

  // ── Notifications ──────────────────────────────────────────────────────────
  const notify = useCallback((type, message, duration = 4000) => {
    const id = uuidv4();
    dispatch({ type:'ADD_NOTIFICATION', payload:{ id, type, message, timestamp: Date.now() } });
    setTimeout(() => dispatch({ type:'REMOVE_NOTIFICATION', payload: id }), duration);
  }, []);

  // ── Setup wizard ───────────────────────────────────────────────────────────
  const chooseProjectRoot = useCallback(async () => {
    if (!isElectron) return;
    const root = await window.electronAPI.chooseProjectRoot();
    if (!root) return;
    dispatch({ type:'SET_PROJECT_ROOT', payload: root });
    dispatch({ type:'CLOSE_MODAL', payload:'setupWizard' });
    const scan = await window.electronAPI.scanProject();
    dispatch({ type:'SCAN_COMPLETE', payload: scan });
    notify('success', `Project root set: ${root}`);
  }, [isElectron, notify]);

  // ── Rescan ─────────────────────────────────────────────────────────────────
  const rescan = useCallback(async () => {
    if (!isElectron) return;
    const scan = await window.electronAPI.scanProject();
    dispatch({ type:'SCAN_COMPLETE', payload: scan });
  }, [isElectron]);

  // ── Create stratum ─────────────────────────────────────────────────────────
  const createStratum = useCallback(async ({ sourceFilePath, archiveName, metadata, provenance, tags, appliedSchemeId }) => {
    if (!isElectron) { notify('warning','File ops require the desktop app'); return null; }
    const result = await window.electronAPI.createStratum({ sourceFilePath, archiveName, metadata: metadata||{}, provenance: provenance||{}, tags: tags||[], appliedSchemeId: appliedSchemeId||null });
    if (!result.success) { notify('error', `Failed: ${result.error}`); return null; }

    const entry = { filePath: result.filePath, filename: archiveName + '.stratum', manifest: result.manifest };
    dispatch({ type:'ADD_STRATUM', payload: entry });

    // Record into feature bank
    const newBank = recordMetadataIntoBank(state.featureBank, metadata || {});
    dispatch({ type:'SET_FEATURE_BANK', payload: newBank });
    persistFeatureBank(newBank);

    // Add history entry
    const histEntry = createHistoryEntry('stratum_created', { archiveName, sourceFilePath: sourceFilePath?.split(/[\\/]/).pop(), appliedSchemeId });
    dispatch({ type:'ADD_HISTORY', payload: histEntry });
    persistHistory([histEntry, ...state.history].slice(0, 500));

    notify('success', `"${archiveName}.stratum" saved to project`);
    return entry;
  }, [isElectron, notify, state.featureBank, state.history, persistFeatureBank, persistHistory]);

  // ── Open stratum for editing ───────────────────────────────────────────────
  const openStratum = useCallback(async (filePath) => {
    if (!isElectron) return;
    const result = await window.electronAPI.readStratum(filePath);
    if (!result.success) { notify('error', `Could not read: ${result.error}`); return; }
    dispatch({ type:'OPEN_STRATUM', payload: { filePath, data: { manifest: result.manifest, metadata: result.metadata, provenance: result.provenance, tags: result.tags } } });
  }, [isElectron, notify]);

  // ── Save open stratum ──────────────────────────────────────────────────────
  const saveOpenStratum = useCallback(async () => {
    if (!isElectron || !state.activeStratumFilePath || !state.openStratum) return;
    const { metadata, provenance, tags, manifest } = state.openStratum;
    const result = await window.electronAPI.updateStratum(state.activeStratumFilePath, { metadata, provenance, tags: tags?.feature_tags || [], appliedSchemeId: manifest?.applied_scheme_id });
    if (!result.success) { notify('error', `Save failed: ${result.error}`); return; }
    dispatch({ type:'SET_OPEN_STRATUM_CLEAN' });

    // Update feature bank
    const newBank = recordMetadataIntoBank(state.featureBank, metadata || {});
    dispatch({ type:'SET_FEATURE_BANK', payload: newBank });
    persistFeatureBank(newBank);

    notify('success', 'Saved');
  }, [isElectron, state.activeStratumFilePath, state.openStratum, state.featureBank, notify, persistFeatureBank]);

  // ── Delete stratum ─────────────────────────────────────────────────────────
  const deleteStratum = useCallback(async (filePath) => {
    if (!isElectron) return;
    const result = await window.electronAPI.deleteStratum(filePath);
    if (!result.success) { notify('error', `Delete failed: ${result.error}`); return; }
    dispatch({ type:'REMOVE_STRATUM', payload: filePath });
    if (state.activeStratumFilePath === filePath) dispatch({ type:'CLOSE_STRATUM' });
    notify('success', 'Stratum deleted');
  }, [isElectron, state.activeStratumFilePath, notify]);

  // ── Create collection ──────────────────────────────────────────────────────
  const createCollection = useCallback(async ({ collectionName, stratumPaths, description }) => {
    if (!isElectron) { notify('warning','File ops require the desktop app'); return; }
    const result = await window.electronAPI.createStrata({ collectionName, stratumPaths, description: description||'' });
    if (!result.success) { notify('error', `Failed: ${result.error}`); return; }
    await rescan();
    notify('success', `"${collectionName}.strata" created`);
  }, [isElectron, notify, rescan]);

  // ── Scheme Bank actions ────────────────────────────────────────────────────
  const addScheme = useCallback((scheme) => {
    dispatch({ type:'ADD_SCHEME', payload: scheme });
    persistSchemeBank([scheme, ...state.schemeBank.filter(s => !s.isBuiltIn)]);
    notify('success', `Scheme "${scheme.name}" created`);
  }, [state.schemeBank, persistSchemeBank, notify]);

  const updateScheme = useCallback((scheme) => {
    dispatch({ type:'UPDATE_SCHEME', payload: scheme });
    const updated = state.schemeBank.map(s => s.id === scheme.id ? scheme : s);
    persistSchemeBank(updated.filter(s => !s.isBuiltIn));
    notify('success', `Scheme "${scheme.name}" updated`);
  }, [state.schemeBank, persistSchemeBank, notify]);

  const deleteScheme = useCallback((id) => {
    dispatch({ type:'DELETE_SCHEME', payload: id });
    persistSchemeBank(state.schemeBank.filter(s => s.id !== id && !s.isBuiltIn));
    notify('success', 'Scheme deleted');
  }, [state.schemeBank, persistSchemeBank, notify]);

  const importScheme = useCallback(async () => {
    if (!isElectron) return;
    const result = await window.electronAPI.importScheme();
    if (!result.success || !result.scheme) return;
    const s = { ...result.scheme, id: uuidv4(), isBuiltIn: false, imported: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    addScheme(s);
  }, [isElectron, addScheme]);

  const exportScheme = useCallback(async (scheme) => {
    if (!isElectron) return;
    await window.electronAPI.exportScheme(scheme);
  }, [isElectron]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredStrata = useMemo(() => {
    const q = state.searchQuery.toLowerCase().trim();
    if (!q) return state.strata;
    return state.strata.filter(s =>
      s.filename?.toLowerCase().includes(q) ||
      s.manifest?.archive_name?.toLowerCase().includes(q) ||
      s.manifest?.source_filename?.toLowerCase().includes(q) ||
      s.manifest?.source_format?.toLowerCase().includes(q)
    );
  }, [state.strata, state.searchQuery]);

  const value = {
    state, dispatch,
    isElectron,
    filteredStrata,
    notify,
    chooseProjectRoot, rescan,
    createStratum, openStratum, saveOpenStratum, deleteStratum,
    createCollection,
    addScheme, updateScheme, deleteScheme, importScheme, exportScheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
