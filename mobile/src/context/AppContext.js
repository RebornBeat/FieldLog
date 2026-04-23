import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { v4 as uuidv4 } from "uuid";
import { STARTER_SCHEMES } from "../constants/starterSchemes";
import { STORAGE_KEYS } from "../constants";
import { scanCollectionDir } from "../utils/stratumFormat";
import {
  recordMetadataIntoBank,
  recordTagsIntoBank,
  recordSchemeFieldNames,
} from "../utils/featureBank";

// ─── Default collection directory ────────────────────────────────────────────
const DEFAULT_COLLECTION_DIR = `${FileSystem.documentDirectory}MetaStrata/`;

// ─── Initial state ────────────────────────────────────────────────────────────
const INIT = {
  collectionDir: DEFAULT_COLLECTION_DIR,
  setupComplete: false,

  strata: [], // [{ fileUri, filename, manifest }]
  loadingStrata: false,

  // Currently open stratum for editing
  openStratumUri: null,
  openStratum: null, // { manifest, metadata, provenance, tags, isDirty }

  schemeBank: [],
  featureBank: { fieldValues: {}, categories: [], fieldNames: [] },
  history: [],

  searchQuery: "",
  notifications: [],
  booted: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(s, a) {
  switch (a.type) {
    case "BOOT_COMPLETE":
      return { ...s, ...a.payload, booted: true };

    case "SET_COLLECTION_DIR":
      return { ...s, collectionDir: a.payload, setupComplete: true };

    case "SET_LOADING_STRATA":
      return { ...s, loadingStrata: a.payload };

    case "SET_STRATA":
      return { ...s, strata: a.payload, loadingStrata: false };

    case "ADD_STRATUM":
      return { ...s, strata: [a.payload, ...s.strata] };

    case "REMOVE_STRATUM":
      return { ...s, strata: s.strata.filter((x) => x.fileUri !== a.payload) };

    case "OPEN_STRATUM":
      return {
        ...s,
        openStratumUri: a.payload.fileUri,
        openStratum: { ...a.payload.data, isDirty: false },
      };

    case "CLOSE_STRATUM":
      return { ...s, openStratumUri: null, openStratum: null };

    case "UPDATE_META":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          metadata: { ...s.openStratum.metadata, ...a.payload },
          isDirty: true,
        },
      };

    case "UPDATE_PROV":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          provenance: { ...s.openStratum.provenance, ...a.payload },
          isDirty: true,
        },
      };

    case "UPDATE_TAGS":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          tags: { feature_tags: a.payload },
          isDirty: true,
        },
      };

    case "UPDATE_MANIFEST":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          manifest: { ...s.openStratum.manifest, ...a.payload },
        },
      };

    case "SEED_METADATA":
      if (!s.openStratum) return s;
      return {
        ...s,
        openStratum: {
          ...s.openStratum,
          metadata: { ...a.payload, ...s.openStratum.metadata },
          isDirty: true,
        },
      };

    case "STRATUM_SAVED":
      return {
        ...s,
        openStratum: s.openStratum
          ? { ...s.openStratum, isDirty: false }
          : null,
      };

    case "SET_SCHEME_BANK":
      return { ...s, schemeBank: a.payload };
    case "ADD_SCHEME":
      return { ...s, schemeBank: [a.payload, ...s.schemeBank] };
    case "UPDATE_SCHEME":
      return {
        ...s,
        schemeBank: s.schemeBank.map((sc) =>
          sc.id === a.payload.id ? { ...sc, ...a.payload } : sc,
        ),
      };
    case "DELETE_SCHEME":
      return {
        ...s,
        schemeBank: s.schemeBank.filter((sc) => sc.id !== a.payload),
      };

    case "SET_FEATURE_BANK":
      return { ...s, featureBank: a.payload };
    case "SET_HISTORY":
      return { ...s, history: a.payload };
    case "ADD_HISTORY":
      return { ...s, history: [a.payload, ...s.history].slice(0, 500) };

    case "SET_SEARCH":
      return { ...s, searchQuery: a.payload };
    case "ADD_NOTIF":
      return { ...s, notifications: [...s.notifications, a.payload] };
    case "REMOVE_NOTIF":
      return {
        ...s,
        notifications: s.notifications.filter((n) => n.id !== a.payload),
      };

    default:
      return s;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT);

  // ── Boot: load everything from AsyncStorage ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [rawSettings, rawSchemes, rawFeatureBank, rawHistory] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
            AsyncStorage.getItem(STORAGE_KEYS.SCHEME_BANK),
            AsyncStorage.getItem(STORAGE_KEYS.FEATURE_BANK),
            AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
          ]);

        const settings = rawSettings ? JSON.parse(rawSettings) : {};
        const userSchemes = rawSchemes ? JSON.parse(rawSchemes) : [];
        const featureBank = rawFeatureBank
          ? JSON.parse(rawFeatureBank)
          : { fieldValues: {}, categories: [], fieldNames: [] };
        const history = rawHistory ? JSON.parse(rawHistory) : [];

        const builtInIds = new Set(STARTER_SCHEMES.map((s) => s.id));
        const schemeBank = [
          ...userSchemes.filter((s) => !builtInIds.has(s.id)),
          ...STARTER_SCHEMES,
        ];

        const collectionDir = settings.collectionDir || DEFAULT_COLLECTION_DIR;

        // Ensure collection directory exists
        const dirInfo = await FileSystem.getInfoAsync(collectionDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(collectionDir, {
            intermediates: true,
          });
        }

        dispatch({
          type: "BOOT_COMPLETE",
          payload: {
            collectionDir,
            setupComplete: !!settings.collectionDir,
            schemeBank,
            featureBank,
            history,
          },
        });

        // Scan collection
        const strata = await scanCollectionDir(collectionDir);
        dispatch({ type: "SET_STRATA", payload: strata });
      } catch (err) {
        console.error("Boot error:", err);
        dispatch({ type: "BOOT_COMPLETE", payload: {} });
      }
    })();
  }, []);

  // ── Persist helpers ───────────────────────────────────────────────────────
  const persistSchemeBank = useCallback((schemes) => {
    AsyncStorage.setItem(
      STORAGE_KEYS.SCHEME_BANK,
      JSON.stringify(schemes.filter((s) => !s.isBuiltIn)),
    ).catch(console.error);
  }, []);

  const persistFeatureBank = useCallback((bank) => {
    AsyncStorage.setItem(STORAGE_KEYS.FEATURE_BANK, JSON.stringify(bank)).catch(
      console.error,
    );
  }, []);

  const persistHistory = useCallback((entries) => {
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(entries)).catch(
      console.error,
    );
  }, []);

  const persistSettings = useCallback((settings) => {
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)).catch(
      console.error,
    );
  }, []);

  // ── Notifications ─────────────────────────────────────────────────────────
  const notify = useCallback((type, message, duration = 3500) => {
    const id = uuidv4();
    dispatch({
      type: "ADD_NOTIF",
      payload: { id, type, message, timestamp: Date.now() },
    });
    setTimeout(() => dispatch({ type: "REMOVE_NOTIF", payload: id }), duration);
  }, []);

  // ── Rescan collection ─────────────────────────────────────────────────────
  const rescan = useCallback(async () => {
    dispatch({ type: "SET_LOADING_STRATA", payload: true });
    const strata = await scanCollectionDir(state.collectionDir);
    dispatch({ type: "SET_STRATA", payload: strata });
  }, [state.collectionDir]);

  // ── Open stratum ──────────────────────────────────────────────────────────
  const openStratum = useCallback(
    async (fileUri) => {
      const { readStratum } = await import("../utils/stratumFormat");
      const result = await readStratum(fileUri);
      if (!result.success) {
        notify("error", `Could not open: ${result.error}`);
        return false;
      }
      dispatch({
        type: "OPEN_STRATUM",
        payload: {
          fileUri,
          data: {
            manifest: result.manifest || {},
            metadata: result.metadata || {},
            provenance: result.provenance || {},
            tags: result.tags || { feature_tags: [] },
          },
        },
      });
      return true;
    },
    [notify],
  );

  // ── Save open stratum ─────────────────────────────────────────────────────
  const saveOpenStratum = useCallback(async () => {
    if (!state.openStratumUri || !state.openStratum) return false;
    const { updateStratum } = await import("../utils/stratumFormat");
    const { metadata, provenance, tags, manifest } = state.openStratum;

    const result = await updateStratum(state.openStratumUri, {
      metadata,
      provenance,
      tags: tags?.feature_tags || [],
      appliedSchemeId: manifest?.applied_scheme_id,
    });

    if (!result.success) {
      notify("error", `Save failed: ${result.error}`);
      return false;
    }
    dispatch({ type: "STRATUM_SAVED" });

    // Update feature bank
    let bank = recordMetadataIntoBank(state.featureBank, metadata || {});
    bank = recordTagsIntoBank(bank, tags?.feature_tags || []);
    const sc = state.schemeBank.find(
      (s) => s.id === manifest?.applied_scheme_id,
    );
    if (sc) bank = recordSchemeFieldNames(bank, sc);
    dispatch({ type: "SET_FEATURE_BANK", payload: bank });
    persistFeatureBank(bank);

    // Update the strata list entry
    await rescan();
    return true;
  }, [
    state.openStratumUri,
    state.openStratum,
    state.featureBank,
    state.schemeBank,
    notify,
    persistFeatureBank,
    rescan,
  ]);

  // ── Create stratum from a picked file ────────────────────────────────────
  const createStratum = useCallback(
    async ({
      sourceFileUri,
      archiveName,
      metadata,
      provenance,
      tags,
      appliedSchemeId,
    }) => {
      const { createStratum: create } = await import("../utils/stratumFormat");
      const result = await create({
        sourceFileUri,
        archiveName,
        collectionDir: state.collectionDir,
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
        fileUri: result.fileUri,
        filename: `${archiveName}.stratum`,
        manifest: result.manifest,
      };
      dispatch({ type: "ADD_STRATUM", payload: entry });

      // Feature bank
      let bank = recordMetadataIntoBank(state.featureBank, metadata || {});
      bank = recordTagsIntoBank(bank, tags || []);
      const sc = state.schemeBank.find((s) => s.id === appliedSchemeId);
      if (sc) bank = recordSchemeFieldNames(bank, sc);
      dispatch({ type: "SET_FEATURE_BANK", payload: bank });
      persistFeatureBank(bank);

      // History
      const histEntry = {
        id: uuidv4(),
        type: "stratum_created",
        timestamp: new Date().toISOString(),
        archiveName,
        sourceFilename: sourceFileUri.split("/").pop(),
        appliedSchemeId,
      };
      dispatch({ type: "ADD_HISTORY", payload: histEntry });
      persistHistory([histEntry, ...state.history].slice(0, 500));

      notify("success", `"${archiveName}.stratum" saved`);
      return entry;
    },
    [
      state.collectionDir,
      state.featureBank,
      state.schemeBank,
      state.history,
      notify,
      persistFeatureBank,
      persistHistory,
    ],
  );

  // ── Delete stratum ────────────────────────────────────────────────────────
  const deleteStratum = useCallback(
    async (fileUri) => {
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        dispatch({ type: "REMOVE_STRATUM", payload: fileUri });
        if (state.openStratumUri === fileUri)
          dispatch({ type: "CLOSE_STRATUM" });
        notify("success", "Archive deleted");
      } catch (err) {
        notify("error", `Delete failed: ${err.message}`);
      }
    },
    [state.openStratumUri, notify],
  );

  // ── Import a stratum from an external URI (share/open-with) ──────────────
  const importStratum = useCallback(
    async (externalUri) => {
      const { importStratumFromUri } = await import("../utils/stratumFormat");
      const result = await importStratumFromUri(externalUri);
      if (!result.success) {
        notify("error", `Could not import: ${result.error}`);
        return;
      }

      // Copy to collection dir
      const filename =
        externalUri.split("/").pop() || `import-${Date.now()}.stratum`;
      const destUri = `${state.collectionDir}${filename}`;
      try {
        await FileSystem.copyAsync({ from: externalUri, to: destUri });
      } catch {
        // File might already be in cache — try readStratumAsBase64 and write
        const { readStratumAsBase64 } = await import("../utils/stratumFormat");
        const b64 = await readStratumAsBase64(externalUri);
        if (!b64.success) {
          notify("error", "Import failed");
          return;
        }
        await FileSystem.writeAsStringAsync(destUri, b64.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      await rescan();
      notify("success", `"${filename}" imported`);
    },
    [state.collectionDir, notify, rescan],
  );

  // ── Scheme actions ────────────────────────────────────────────────────────
  const addScheme = useCallback(
    (scheme) => {
      const s = {
        ...scheme,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      dispatch({ type: "ADD_SCHEME", payload: s });
      const newBank = recordSchemeFieldNames(state.featureBank, s);
      dispatch({ type: "SET_FEATURE_BANK", payload: newBank });
      persistFeatureBank(newBank);
      persistSchemeBank([s, ...state.schemeBank.filter((sc) => !sc.isBuiltIn)]);
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
      const newBank = recordSchemeFieldNames(state.featureBank, scheme);
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

  // ── Handle scheme change on open stratum ──────────────────────────────────
  const applySchemeToOpenStratum = useCallback(
    (schemeId) => {
      dispatch({
        type: "UPDATE_MANIFEST",
        payload: { applied_scheme_id: schemeId || null },
      });
      if (schemeId) {
        const sc = state.schemeBank.find((s) => s.id === schemeId);
        if (sc && sc.fields.length) {
          const seed = {};
          const currentMeta = state.openStratum?.metadata || {};
          sc.fields.forEach((f) => {
            if (f.key && !(f.key in currentMeta)) {
              seed[f.key] = f.type === "tags" ? [] : "";
            }
          });
          if (Object.keys(seed).length)
            dispatch({ type: "SEED_METADATA_FIELDS", payload: seed });
        }
      }
    },
    [state.schemeBank, state.openStratum?.metadata],
  );

  // ── Set collection directory ──────────────────────────────────────────────
  const setCollectionDir = useCallback(
    async (dir) => {
      const dirUri = dir.endsWith("/") ? dir : `${dir}/`;
      const info = await FileSystem.getInfoAsync(dirUri);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
      }
      dispatch({ type: "SET_COLLECTION_DIR", payload: dirUri });
      persistSettings({ collectionDir: dirUri });
      const strata = await scanCollectionDir(dirUri);
      dispatch({ type: "SET_STRATA", payload: strata });
      notify("success", "Collection folder updated");
    },
    [persistSettings, notify],
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
    filteredStrata,
    notify,
    rescan,
    openStratum,
    saveOpenStratum,
    createStratum,
    deleteStratum,
    importStratum,
    addScheme,
    updateScheme,
    deleteScheme,
    applySchemeToOpenStratum,
    setCollectionDir,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
