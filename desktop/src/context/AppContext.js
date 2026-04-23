import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { STARTER_SCHEMES } from "../utils/starterSchemes";
import { createHistoryEntry } from "../utils/archiveFormat";
import {
  recordMetadataIntoBank,
  recordTagsIntoBank,
  recordSchemeFieldNames,
} from "../utils/featureBank";
import { NAV_VIEWS } from "../constants";

// ─── Data version for migrations ─────────────────────────────────────────────
// Increment this when the persisted data shape changes. Migration runs on boot.
const DATA_VERSION = 1;

// ─── Initial state ─────────────────────────────────────────────────────────
const init = {
  projectRoot: null,
  setupComplete: false,
  dataVersion: DATA_VERSION,

  activeView: NAV_VIEWS.HOME,
  activeStratumFilePath: null,

  // Strata items now include metadata/tags for Feature Bank stats (from electron.js deep scan)
  strata: [],
  collections: [],

  // openStratum holds: { manifest, metadata, provenance, tags, isDirty }
  openStratum: null,

  schemeBank: [],
  featureBank: { fieldValues: {}, categories: [], fieldNames: [] },
  history: [],

  searchQuery: "",
  modals: {
    newStratum: false,
    newCollection: false,
    schemeEditor: false,
    about: false,
    nagoya: false,
    setupWizard: false,
    transfer: false,
    prefillPath: null,
    prefillName: "",
  },
  notifications: [],
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
function reducer(s, action) {
  switch (action.type) {
    case "INIT_COMPLETE":
      return {
        ...s,
        projectRoot: action.payload.projectRoot,
        setupComplete: action.payload.setupComplete,
        // strata items contain metadata/tags for relationships
        strata: action.payload.strata || [],
        collections: action.payload.collections || [],
        schemeBank: action.payload.schemeBank || [],
        featureBank: action.payload.featureBank || s.featureBank,
        history: action.payload.history || [],
      };

    case "SET_PROJECT_ROOT":
      return { ...s, projectRoot: action.payload, setupComplete: true };

    case "SCAN_COMPLETE":
      return {
        ...s,
        strata: action.payload.strata || [],
        collections: action.payload.collections || [],
      };

    // ── Navigation ────────────────────────────────────────────────────────
    case "NAV":
      return {
        ...s,
        activeView: action.payload,
        activeStratumFilePath: null,
        openStratum: null,
      };

    case "OPEN_STRATUM":
      return {
        ...s,
        activeView: NAV_VIEWS.STRATUM,
        activeStratumFilePath: action.payload.filePath,
        openStratum: { ...action.payload.data, isDirty: false },
      };

    case "CLOSE_STRATUM":
      return {
        ...s,
        activeView: NAV_VIEWS.HOME,
        activeStratumFilePath: null,
        openStratum: null,
      };

    // ── Stratum edits ─────────────────────────────────────────────────────
    case "UPDATE_OPEN_METADATA":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          // Deep merge: spread existing metadata, then apply only the changed key(s)
          metadata: { ...s.openStratum.metadata, ...action.payload },
          isDirty: true,
        },
      };

    case "UPDATE_OPEN_PROVENANCE":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          provenance: { ...s.openStratum.provenance, ...action.payload },
          isDirty: true,
        },
      };

    case "UPDATE_OPEN_TAGS":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          tags: { feature_tags: action.payload },
          isDirty: true,
        },
      };

    case "UPDATE_OPEN_MANIFEST":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          manifest: { ...s.openStratum.manifest, ...action.payload },
        },
      };

    case "SEED_METADATA_FIELDS": {
      // Add missing field keys from a newly applied scheme WITHOUT overwriting existing values
      if (!s.openStratum) return s;
      const current = s.openStratum.metadata || {};
      const seeded = { ...current };
      for (const [key, defaultVal] of Object.entries(action.payload)) {
        if (!(key in seeded)) seeded[key] = defaultVal;
      }
      return {
        ...s,
        openStratum: { ...s.openStratum, metadata: seeded, isDirty: true },
      };
    }

    case "SET_OPEN_STRATUM_CLEAN":
      return {
        ...s,
        openStratum: s.openStratum
          ? { ...s.openStratum, isDirty: false }
          : null,
      };

    // ── Stratum list ──────────────────────────────────────────────────────
    case "ADD_STRATUM":
      return { ...s, strata: [action.payload, ...s.strata] };

    case "REMOVE_STRATUM":
      return {
        ...s,
        strata: s.strata.filter((x) => x.filePath !== action.payload),
      };

    case "UPDATE_STRATA_ENTRY":
      return {
        ...s,
        strata: s.strata.map((item) =>
          item.filePath === action.payload.filePath
            ? { ...item, ...action.payload.data }
            : item,
        ),
      };

    case "ADD_COLLECTION":
      return { ...s, collections: [action.payload, ...s.collections] };

    // ── Scheme Bank ───────────────────────────────────────────────────────
    case "SET_SCHEME_BANK":
      return { ...s, schemeBank: action.payload };

    case "ADD_SCHEME":
      return { ...s, schemeBank: [action.payload, ...s.schemeBank] };

    case "UPDATE_SCHEME":
      return {
        ...s,
        schemeBank: s.schemeBank.map((sc) =>
          sc.id === action.payload.id
            ? { ...sc, ...action.payload, updated_at: new Date().toISOString() }
            : sc,
        ),
      };

    case "DELETE_SCHEME":
      return {
        ...s,
        schemeBank: s.schemeBank.filter((sc) => sc.id !== action.payload),
      };

    // ── Feature Bank ──────────────────────────────────────────────────────
    case "SET_FEATURE_BANK":
      return { ...s, featureBank: action.payload };

    // ── History ───────────────────────────────────────────────────────────
    case "ADD_HISTORY":
      return { ...s, history: [action.payload, ...s.history].slice(0, 500) };

    case "SET_HISTORY":
      return { ...s, history: action.payload };

    // ── UI ─────────────────────────────────────────────────────────────────
    case "SET_SEARCH":
      return { ...s, searchQuery: action.payload };

    case "OPEN_MODAL": {
      const { modal, ...extra } = action.payload;
      return { ...s, modals: { ...s.modals, [modal]: true, ...extra } };
    }
    case "CLOSE_MODAL":
      return {
        ...s,
        modals: {
          ...s.modals,
          [action.payload]: false,
          // Reset prefill when newStratum modal closes
          ...(action.payload === "newStratum"
            ? { prefillPath: null, prefillName: "" }
            : {}),
        },
      };

    case "ADD_NOTIFICATION":
      return { ...s, notifications: [...s.notifications, action.payload] };
    case "REMOVE_NOTIFICATION":
      return {
        ...s,
        notifications: s.notifications.filter((n) => n.id !== action.payload),
      };

    default:
      return s;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isElectron) return;
    (async () => {
      const config = await window.electronAPI.getConfig();
      const rawSchemes = await window.electronAPI.readSchemeBank();
      const featureBank = await window.electronAPI.readFeatureBank();
      const history = await window.electronAPI.readHistory();

      // Run data migrations
      const migratedBank = migrateFeatureBank(featureBank);

      // Merge built-ins with user schemes (built-ins always at end)
      const builtInIds = new Set(STARTER_SCHEMES.map((s) => s.id));
      const userSchemes = rawSchemes.filter((s) => !builtInIds.has(s.id));
      const schemeBank = [...userSchemes, ...STARTER_SCHEMES];

      let strata = [],
        collections = [];
      if (config.projectRoot) {
        try {
          const scan = await window.electronAPI.scanProject();
          // Scan now returns metadata/tags for Feature Bank usage
          strata = scan.strata || [];
          collections = scan.collections || [];
        } catch (err) {
          console.error("Failed to scan project root:", err);
        }
      }

      dispatch({
        type: "INIT_COMPLETE",
        payload: {
          projectRoot: config.projectRoot,
          setupComplete: config.setupComplete,
          strata,
          collections,
          schemeBank,
          featureBank: migratedBank,
          history,
        },
      });

      if (!config.setupComplete || !config.projectRoot) {
        dispatch({ type: "OPEN_MODAL", payload: { modal: "setupWizard" } });
      }
    })();
  }, [isElectron]);

  // ── Menu actions ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isElectron) return;
    const cleanup = window.electronAPI.onMenuAction(({ action }) => {
      switch (action) {
        case "new-stratum":
          dispatch({ type: "OPEN_MODAL", payload: { modal: "newStratum" } });
          break;
        case "new-collection":
          dispatch({ type: "OPEN_MODAL", payload: { modal: "newCollection" } });
          break;
        case "nav-home":
          dispatch({ type: "NAV", payload: NAV_VIEWS.HOME });
          break;
        case "nav-scheme-bank":
          dispatch({ type: "NAV", payload: NAV_VIEWS.SCHEME_BANK });
          break;
        case "nav-feature-bank":
          dispatch({ type: "NAV", payload: NAV_VIEWS.FEATURE_BANK });
          break;
        case "nav-stats":
          dispatch({ type: "NAV", payload: NAV_VIEWS.STATS });
          break;
        case "nav-history":
          dispatch({ type: "NAV", payload: NAV_VIEWS.HISTORY });
          break;
        case "toggle-theme":
          document.body.classList.toggle("theme-light");
          break;
        case "about":
          dispatch({ type: "OPEN_MODAL", payload: { modal: "about" } });
          break;
        case "nagoya":
          dispatch({ type: "OPEN_MODAL", payload: { modal: "nagoya" } });
          break;
        case "receive-from-mobile":
          dispatch({ type: "OPEN_MODAL", payload: { modal: "transfer" } });
          break;
        default:
          break;
      }
    });
    return cleanup;
  }, [isElectron]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "OPEN_MODAL", payload: { modal: "newStratum" } });
      }
      if (e.key === "N" && e.shiftKey) {
        e.preventDefault();
        if (state.strata.length >= 2)
          dispatch({ type: "OPEN_MODAL", payload: { modal: "newCollection" } });
      }
      if (e.key === "b") {
        e.preventDefault();
        dispatch({ type: "NAV", payload: NAV_VIEWS.SCHEME_BANK });
      }
      if (e.key === "h") {
        e.preventDefault();
        dispatch({ type: "NAV", payload: NAV_VIEWS.HOME });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [state.strata.length]);

  // ── Persist helpers ───────────────────────────────────────────────────────
  const persistSchemeBank = useCallback(
    (schemes) => {
      if (!isElectron) return;
      window.electronAPI
        .writeSchemeBank(schemes.filter((s) => !s.isBuiltIn))
        .catch(console.error);
    },
    [isElectron],
  );

  const persistFeatureBank = useCallback(
    (bank) => {
      if (!isElectron) return;
      window.electronAPI.writeFeatureBank(bank).catch(console.error);
    },
    [isElectron],
  );

  const persistHistory = useCallback(
    (entries) => {
      if (!isElectron) return;
      window.electronAPI.writeHistory(entries).catch(console.error);
    },
    [isElectron],
  );

  // ── Notifications ─────────────────────────────────────────────────────────
  const notify = useCallback((type, message, duration = 4000) => {
    const id = uuidv4();
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: { id, type, message, timestamp: Date.now() },
    });
    setTimeout(
      () => dispatch({ type: "REMOVE_NOTIFICATION", payload: id }),
      duration,
    );
  }, []);

  // ── Setup ─────────────────────────────────────────────────────────────────
  const chooseProjectRoot = useCallback(async () => {
    if (!isElectron) return;
    const root = await window.electronAPI.chooseProjectRoot();
    if (!root) return;
    dispatch({ type: "SET_PROJECT_ROOT", payload: root });
    dispatch({ type: "CLOSE_MODAL", payload: "setupWizard" });
    const scan = await window.electronAPI.scanProject();
    dispatch({ type: "SCAN_COMPLETE", payload: scan });
    notify("success", `Project folder set`);
  }, [isElectron, notify]);

  const rescan = useCallback(async () => {
    if (!isElectron) return;
    const scan = await window.electronAPI.scanProject();
    dispatch({ type: "SCAN_COMPLETE", payload: scan });
  }, [isElectron]);

  // ── Create stratum ────────────────────────────────────────────────────────
  const createStratum = useCallback(
    async ({
      sourceFilePath,
      archiveName,
      metadata,
      provenance,
      tags,
      appliedSchemeId,
    }) => {
      if (!isElectron) {
        notify("warning", "File ops require the desktop app");
        return null;
      }

      const result = await window.electronAPI.createStratum({
        sourceFilePath,
        archiveName,
        metadata: metadata || {},
        provenance: provenance || {},
        tags: tags || [],
        appliedSchemeId: appliedSchemeId || null,
      });

      if (!result.success) {
        notify("error", `Failed: ${result.error}`);
        return null;
      }

      const entry = {
        filePath: result.filePath,
        filename: `${archiveName}.stratum`,
        manifest: result.manifest,
        metadata: metadata || {},
        provenance: provenance || {},
        tags: { feature_tags: tags || [] },
      };
      dispatch({ type: "ADD_STRATUM", payload: entry });

      // Feature Bank: record metadata values, tag categories, and scheme field names
      let newBank = recordMetadataIntoBank(state.featureBank, metadata || {});
      newBank = recordTagsIntoBank(newBank, tags || []);
      const appliedScheme = state.schemeBank.find(
        (s) => s.id === appliedSchemeId,
      );
      if (appliedScheme)
        newBank = recordSchemeFieldNames(newBank, appliedScheme);

      dispatch({ type: "SET_FEATURE_BANK", payload: newBank });
      persistFeatureBank(newBank);

      // History
      const histEntry = createHistoryEntry("stratum_created", {
        archiveName,
        sourceFilePath: sourceFilePath?.split(/[\\/]/).pop(),
        appliedSchemeId,
      });
      const newHistory = [histEntry, ...state.history].slice(0, 500);
      dispatch({ type: "ADD_HISTORY", payload: histEntry });
      persistHistory(newHistory);

      notify("success", `"${archiveName}.stratum" saved to project`);
      return entry;
    },
    [
      isElectron,
      notify,
      state.featureBank,
      state.schemeBank,
      state.history,
      persistFeatureBank,
      persistHistory,
    ],
  );

  // ── Open stratum ──────────────────────────────────────────────────────────
  const openStratum = useCallback(
    async (filePath) => {
      if (!isElectron) return;
      const result = await window.electronAPI.readStratum(filePath);
      if (!result.success) {
        notify("error", `Could not read: ${result.error}`);
        return;
      }
      dispatch({
        type: "OPEN_STRATUM",
        payload: {
          filePath,
          data: {
            manifest: result.manifest,
            metadata: result.metadata || {},
            provenance: result.provenance || {},
            tags: result.tags || {},
          },
        },
      });
    },
    [isElectron, notify],
  );

  // ── Save open stratum ─────────────────────────────────────────────────────
  const saveOpenStratum = useCallback(async () => {
    if (!isElectron || !state.activeStratumFilePath || !state.openStratum)
      return;
    const { metadata, provenance, tags, manifest } = state.openStratum;

    const result = await window.electronAPI.updateStratum(
      state.activeStratumFilePath,
      {
        metadata,
        provenance,
        tags: tags?.feature_tags || [],
        appliedSchemeId: manifest?.applied_scheme_id,
      },
    );

    if (!result.success) {
      notify("error", `Save failed: ${result.error}`);
      return;
    }
    dispatch({ type: "SET_OPEN_STRATUM_CLEAN" });
    // Update the strata list entry so Feature Bank reflects changes immediately
    dispatch({
      type: "UPDATE_STRATA_ENTRY",
      payload: {
        filePath: state.activeStratumFilePath,
        data: {
          metadata: metadata,
          provenance: provenance,
          tags: { feature_tags: tags?.feature_tags || [] },
          manifest: { ...manifest, updated_at: new Date().toISOString() },
        },
      },
    });

    // Feature Bank: record all values + tags on save
    let newBank = recordMetadataIntoBank(state.featureBank, metadata || {});
    newBank = recordTagsIntoBank(newBank, tags?.feature_tags || []);
    const appliedScheme = state.schemeBank.find(
      (s) => s.id === manifest?.applied_scheme_id,
    );
    if (appliedScheme) newBank = recordSchemeFieldNames(newBank, appliedScheme);

    dispatch({ type: "SET_FEATURE_BANK", payload: newBank });
    persistFeatureBank(newBank);

    // Notify once
    notify("success", "Saved");
  }, [
    isElectron,
    state.activeStratumFilePath,
    state.openStratum,
    state.featureBank,
    state.schemeBank,
    notify,
    persistFeatureBank,
  ]);

  // ── Delete stratum ────────────────────────────────────────────────────────
  const deleteStratum = useCallback(
    async (filePath) => {
      if (!isElectron) return;
      const result = await window.electronAPI.deleteStratum(filePath);
      if (!result.success) {
        notify("error", `Delete failed: ${result.error}`);
        return;
      }
      dispatch({ type: "REMOVE_STRATUM", payload: filePath });
      if (state.activeStratumFilePath === filePath)
        dispatch({ type: "CLOSE_STRATUM" });
      notify("success", "Archive deleted");
    },
    [isElectron, state.activeStratumFilePath, notify],
  );

  // ── Create collection ──────────────────────────────────────────────────────
  const createCollection = useCallback(
    async ({ collectionName, stratumPaths, description }) => {
      if (!isElectron) {
        notify("warning", "File ops require the desktop app");
        return;
      }
      const result = await window.electronAPI.createStrata({
        collectionName,
        stratumPaths,
        description: description || "",
      });
      if (!result.success) {
        notify("error", `Failed: ${result.error}`);
        return;
      }
      await rescan();
      notify("success", `"${collectionName}.strata" created`);
    },
    [isElectron, notify, rescan],
  );

  // ── Scheme Bank actions ───────────────────────────────────────────────────
  const addScheme = useCallback(
    (scheme) => {
      const now = new Date().toISOString();
      const s = { ...scheme, created_at: now, updated_at: now };
      dispatch({ type: "ADD_SCHEME", payload: s });
      const updated = [s, ...state.schemeBank.filter((sc) => !sc.isBuiltIn)];
      persistSchemeBank(updated);

      // Record scheme field names in Feature Bank
      let newBank = recordSchemeFieldNames(state.featureBank, s);
      dispatch({ type: "SET_FEATURE_BANK", payload: newBank });
      persistFeatureBank(newBank);

      notify("success", `Scheme "${s.name}" created`);
    },
    [
      state.schemeBank,
      state.featureBank,
      persistSchemeBank,
      persistFeatureBank,
      notify,
    ],
  );

  const updateScheme = useCallback(
    (scheme) => {
      dispatch({ type: "UPDATE_SCHEME", payload: scheme });
      const updated = state.schemeBank.map((s) =>
        s.id === scheme.id ? scheme : s,
      );
      persistSchemeBank(updated);

      // Record field names
      let newBank = recordSchemeFieldNames(state.featureBank, scheme);
      dispatch({ type: "SET_FEATURE_BANK", payload: newBank });
      persistFeatureBank(newBank);

      notify("success", `Scheme "${scheme.name}" updated`);
    },
    [
      state.schemeBank,
      state.featureBank,
      persistSchemeBank,
      persistFeatureBank,
      notify,
    ],
  );

  const deleteScheme = useCallback(
    (id) => {
      dispatch({ type: "DELETE_SCHEME", payload: id });
      persistSchemeBank(state.schemeBank.filter((s) => s.id !== id));
      notify("success", "Scheme deleted");
    },
    [state.schemeBank, persistSchemeBank, notify],
  );

  const importScheme = useCallback(async () => {
    if (!isElectron) return;
    const result = await window.electronAPI.importScheme();
    if (!result.success || !result.scheme) return;
    const s = {
      ...result.scheme,
      id: uuidv4(),
      isBuiltIn: false,
      imported: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Ensure all imported fields have a key
    s.fields = (s.fields || []).map((f, i) => ({
      ...f,
      key: f.key || f.id || `field_${i}`,
      order: typeof f.order === "number" ? f.order : i,
    }));
    addScheme(s);
  }, [isElectron, addScheme]);

  const exportScheme = useCallback(
    async (scheme) => {
      if (!isElectron) return;
      await window.electronAPI.exportScheme(scheme);
    },
    [isElectron],
  );

  // ── Filtered strata ───────────────────────────────────────────────────────
  const filteredStrata = useMemo(() => {
    const q = state.searchQuery.toLowerCase().trim();
    if (!q) return state.strata;
    return state.strata.filter(
      (s) =>
        s.filename?.toLowerCase().includes(q) ||
        s.manifest?.archive_name?.toLowerCase().includes(q) ||
        s.manifest?.source_filename?.toLowerCase().includes(q) ||
        s.manifest?.source_format?.toLowerCase().includes(q),
    );
  }, [state.strata, state.searchQuery]);

  const value = {
    state,
    dispatch,
    isElectron,
    filteredStrata,
    notify,
    chooseProjectRoot,
    rescan,
    createStratum,
    openStratum,
    saveOpenStratum,
    deleteStratum,
    createCollection,
    addScheme,
    updateScheme,
    deleteScheme,
    importScheme,
    exportScheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ── Data migration helper ─────────────────────────────────────────────────────
function migrateFeatureBank(bank) {
  if (!bank) return { fieldValues: {}, categories: [], fieldNames: [] };
  return {
    fieldValues: bank.fieldValues || {},
    categories: bank.categories || [],
    fieldNames: bank.fieldNames || [],
  };
}
