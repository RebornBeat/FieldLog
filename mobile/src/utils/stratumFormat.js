import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { APP_VERSION } from '../constants';

// ─── Read a .stratum file from a local URI ────────────────────────────────────
export async function readStratum(fileUri) {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = new JSZip();
    await zip.loadAsync(base64, { base64: true });

    const parseEntry = async (name, def = {}) => {
      const entry = zip.file(name);
      if (!entry) return def;
      const text = await entry.async('string');
      try { return JSON.parse(text); } catch { return def; }
    };

    const manifest   = await parseEntry('manifest.json',   {});
    const metadata   = await parseEntry('metadata.json',   {});
    const provenance = await parseEntry('provenance.json', {});
    const tags       = await parseEntry('tags.json',       { feature_tags: [] });

    return { success: true, manifest, metadata, provenance, tags };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Create a new .stratum file ───────────────────────────────────────────────
// sourceFileUri: local URI of the source file
// Returns the URI of the created .stratum file in the collection directory
export async function createStratum({
  sourceFileUri,
  archiveName,
  collectionDir,
  metadata = {},
  provenance = {},
  tags = [],
  appliedSchemeId = null,
}) {
  try {
    const sourceFilename = sourceFileUri.split('/').pop();
    const ext            = sourceFilename.split('.').pop()?.toLowerCase() || '';
    const now            = new Date().toISOString();

    // Read source file as base64
    const sourceBase64 = await FileSystem.readAsStringAsync(sourceFileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // SHA-256 hash is not natively available in RN without a native module.
    // We store a placeholder — desktop will re-hash if the file goes through desktop.
    const sha256 = `mobile-created-${uuidv4().slice(0, 8)}`;

    const fileInfo = await FileSystem.getInfoAsync(sourceFileUri, { size: true });
    const fileSize = fileInfo.size || 0;

    const manifest = {
      metastrata_version: APP_VERSION,
      schema_version:     1,
      source_filename:    sourceFilename,
      source_format:      ext,
      source_sha256:      sha256,
      source_size_bytes:  fileSize,
      archive_name:       archiveName,
      applied_scheme_id:  appliedSchemeId,
      created_at:         now,
      updated_at:         now,
      created_on:         'mobile',
    };

    const zip = new JSZip();
    const sourceFolder = zip.folder('source');
    sourceFolder.file(sourceFilename, sourceBase64, { base64: true });

    zip.file('manifest.json',   JSON.stringify(manifest, null, 2));
    zip.file('metadata.json',   JSON.stringify(metadata, null, 2));
    zip.file('provenance.json', JSON.stringify(provenance, null, 2));
    zip.file('tags.json',       JSON.stringify({ feature_tags: tags }, null, 2));

    const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

    const safeArchiveName = archiveName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
    const destUri         = `${collectionDir}${safeArchiveName}.stratum`;

    await FileSystem.writeAsStringAsync(destUri, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { success: true, fileUri: destUri, manifest };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Update metadata/provenance/tags inside a .stratum ────────────────────────
export async function updateStratum(fileUri, updates) {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = new JSZip();
    await zip.loadAsync(base64, { base64: true });

    const parseEntry = async (name, def = {}) => {
      const e = zip.file(name);
      if (!e) return def;
      const t = await e.async('string');
      try { return JSON.parse(t); } catch { return def; }
    };

    const now      = new Date().toISOString();
    const manifest = await parseEntry('manifest.json', {});
    manifest.updated_at = now;
    if (updates.appliedSchemeId !== undefined) {
      manifest.applied_scheme_id = updates.appliedSchemeId;
    }

    if (updates.metadata   !== undefined) { zip.file('metadata.json',   JSON.stringify(updates.metadata, null, 2)); }
    if (updates.provenance !== undefined) { zip.file('provenance.json', JSON.stringify(updates.provenance, null, 2)); }
    if (updates.tags       !== undefined) { zip.file('tags.json',       JSON.stringify({ feature_tags: updates.tags }, null, 2)); }
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
    await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Extract source file from .stratum to a destination directory ─────────────
export async function extractStratumSource(fileUri, destDir) {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = new JSZip();
    await zip.loadAsync(base64, { base64: true });

    const sourceFiles = [];
    zip.forEach((relativePath, zipEntry) => {
      if (relativePath.startsWith('source/') && !zipEntry.dir) {
        sourceFiles.push({ path: relativePath, entry: zipEntry });
      }
    });

    if (!sourceFiles.length) throw new Error('No source file found in archive');

    const { path: relPath, entry } = sourceFiles[0];
    const filename   = relPath.split('/').pop();
    const fileBase64 = await entry.async('base64');
    const destUri    = `${destDir}${filename}`;

    await FileSystem.writeAsStringAsync(destUri, fileBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { success: true, fileUri: destUri, filename };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Scan a directory for .stratum files ─────────────────────────────────────
export async function scanCollectionDir(dirUri) {
  try {
    const contents = await FileSystem.readDirectoryAsync(dirUri);
    const stratumFiles = contents.filter(f => f.endsWith('.stratum'));
    const strata = [];

    for (const filename of stratumFiles) {
      const fileUri = `${dirUri}${filename}`;
      try {
        const result = await readStratum(fileUri);
        if (result.success) {
          strata.push({ fileUri, filename, manifest: result.manifest });
        }
      } catch { /* skip unreadable files */ }
    }

    return strata.sort((a, b) => {
      const ta = a.manifest?.updated_at || a.manifest?.created_at || '';
      const tb = b.manifest?.updated_at || b.manifest?.created_at || '';
      return tb.localeCompare(ta);
    });
  } catch (err) {
    return [];
  }
}

// ─── Read stratum from a picked document (copies to cache first) ──────────────
export async function importStratumFromUri(externalUri) {
  try {
    // Copy to cache directory so we can read it
    const filename = externalUri.split('/').pop() || `import-${Date.now()}.stratum`;
    const cacheUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.copyAsync({ from: externalUri, to: cacheUri });
    return await readStratum(cacheUri);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Copy a .stratum from a transfer (base64 payload) to collection dir ───────
export async function saveTransferredStratum(base64Data, filename, collectionDir) {
  try {
    const safeFilename = filename.endsWith('.stratum') ? filename : `${filename}.stratum`;
    const destUri      = `${collectionDir}${safeFilename}`;
    await FileSystem.writeAsStringAsync(destUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { success: true, fileUri: destUri };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Read a .stratum file as base64 (for sending via transfer) ───────────────
export async function readStratumAsBase64(fileUri) {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { success: true, base64 };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function emptyMetadata(scheme) {
  const data = {};
  (scheme?.fields || []).forEach(f => {
    if (f.key) data[f.key] = f.type === 'tags' ? [] : '';
  });
  return data;
}

export function emptyProvenance() {
  return {
    collection_date: '', collection_location: '', gps_lat: '', gps_lon: '',
    collection_method: '', equipment: '', collector: '', notes: '',
  };
}

export function suggestArchiveName(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ').trim();
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)    return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
}
