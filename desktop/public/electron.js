/* eslint-disable */
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const os = require("os");
const { URL } = require("url");

let AdmZip;
try {
  AdmZip = require("adm-zip");
} catch {
  AdmZip = null;
}

let transferServer = null;
let transferState = null;
// { token, sessionCode, mode, connected, clientFiles: [], desktopFiles: [] }

const isDev = process.env.ELECTRON_IS_DEV === "1";
let mainWindow = null;

// ─── Persistent Config ────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(
  app.getPath("userData"),
  "metastrata-config.json",
);
const SCHEME_BANK_PATH = path.join(app.getPath("userData"), "scheme-bank.json");
const FEATURE_BANK_PATH = path.join(
  app.getPath("userData"),
  "feature-bank.json",
);
const HISTORY_PATH = path.join(app.getPath("userData"), "history.json");

function readJSON(p, def) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return def;
  }
}
function writeJSON(p, d) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(d, null, 2));
    return true;
  } catch {
    return false;
  }
}
function getConfig() {
  return readJSON(CONFIG_PATH, {
    projectRoot: null,
    theme: "dark",
    setupComplete: false,
  });
}
function saveConfig(u) {
  writeJSON(CONFIG_PATH, { ...getConfig(), ...u });
}

function hashFile(fp) {
  try {
    return crypto
      .createHash("sha256")
      .update(fs.readFileSync(fp))
      .digest("hex");
  } catch {
    return null;
  }
}

// ─── Stratum ZIP Ops ──────────────────────────────────────────────────────────
function createStratumZip({
  sourceFilePath,
  archiveName,
  metadata = {},
  provenance = {},
  tags = [],
  appliedSchemeId = null,
}) {
  if (!AdmZip) throw new Error("adm-zip not installed. Run: npm install");
  const config = getConfig();
  if (!config.projectRoot) throw new Error("No project root configured");
  const sourceFilename = path.basename(sourceFilePath);
  const now = new Date().toISOString();
  const sha256 = hashFile(sourceFilePath);
  const stat = fs.statSync(sourceFilePath);
  const ext = path.extname(sourceFilePath).toLowerCase().slice(1);
  const manifest = {
    metastrata_version: "1.0.0",
    schema_version: 1,
    source_filename: sourceFilename,
    source_format: ext,
    source_sha256: sha256,
    source_size_bytes: stat.size,
    archive_name: archiveName,
    applied_scheme_id: appliedSchemeId,
    created_at: now,
    updated_at: now,
  };
  const zip = new AdmZip();
  zip.addLocalFile(sourceFilePath, "source");
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  zip.addFile("metadata.json", Buffer.from(JSON.stringify(metadata, null, 2)));
  zip.addFile(
    "provenance.json",
    Buffer.from(JSON.stringify(provenance, null, 2)),
  );
  zip.addFile(
    "tags.json",
    Buffer.from(JSON.stringify({ feature_tags: tags }, null, 2)),
  );
  const safeName = archiveName.replace(/[\/\\?%*:|"<>]/g, "_");
  const destPath = path.join(config.projectRoot, `${safeName}.stratum`);
  zip.writeZip(destPath);
  return { success: true, filePath: destPath, manifest };
}

function readStratumZip(filePath) {
  if (!AdmZip) throw new Error("adm-zip not installed");
  const zip = new AdmZip(filePath);
  const parse = (name, def = {}) => {
    const e = zip.getEntry(name);
    if (!e) return def;
    try {
      return JSON.parse(zip.readAsText(e));
    } catch {
      return def;
    }
  };
  return {
    manifest: parse("manifest.json"),
    metadata: parse("metadata.json"),
    provenance: parse("provenance.json"),
    tags: parse("tags.json"),
  };
}

function updateStratumZip(filePath, updates) {
  if (!AdmZip) throw new Error("adm-zip not installed");
  const zip = new AdmZip(filePath);
  const parseEntry = (name, def = {}) => {
    const e = zip.getEntry(name);
    if (!e) return def;
    try {
      return JSON.parse(zip.readAsText(e));
    } catch {
      return def;
    }
  };
  const now = new Date().toISOString();
  if (updates.metadata !== undefined) {
    zip.deleteFile("metadata.json");
    zip.addFile(
      "metadata.json",
      Buffer.from(JSON.stringify(updates.metadata, null, 2)),
    );
  }
  if (updates.provenance !== undefined) {
    zip.deleteFile("provenance.json");
    zip.addFile(
      "provenance.json",
      Buffer.from(JSON.stringify(updates.provenance, null, 2)),
    );
  }
  if (updates.tags !== undefined) {
    zip.deleteFile("tags.json");
    zip.addFile(
      "tags.json",
      Buffer.from(JSON.stringify({ feature_tags: updates.tags }, null, 2)),
    );
  }
  const manifest = parseEntry("manifest.json");
  manifest.updated_at = now;
  if (updates.appliedSchemeId !== undefined)
    manifest.applied_scheme_id = updates.appliedSchemeId;
  zip.deleteFile("manifest.json");
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  zip.writeZip(filePath);
  return { success: true };
}

// ─── Modified Scan for Feature Bank Stats ─────────────────────────────────────
function scanProjectRoot(projectRoot) {
  if (!fs.existsSync(projectRoot)) return { strata: [], collections: [] };
  const files = fs.readdirSync(projectRoot);
  const strata = files
    .filter((f) => f.endsWith(".stratum"))
    .map((f) => {
      const fp = path.join(projectRoot, f);
      try {
        // Read full content for Feature Bank stats
        const content = readStratumZip(fp);
        return {
          filePath: fp,
          filename: f,
          manifest: content.manifest,
          metadata: content.metadata, // Included for relationships
          tags: content.tags, // Included for relationships
          provenance: content.provenance,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const collections = files
    .filter((f) => f.endsWith(".strata"))
    .map((f) => {
      const fp = path.join(projectRoot, f);
      try {
        if (!AdmZip) return { filePath: fp, filename: f, index: {} };
        const zip = new AdmZip(fp);
        const ie = zip.getEntry("collection_index.json");
        const index = ie ? JSON.parse(zip.readAsText(ie)) : {};
        return { filePath: fp, filename: f, index };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return { strata, collections };
}

function createStrataZip({ collectionName, stratumPaths, description = "" }) {
  if (!AdmZip) throw new Error("adm-zip not installed");
  const config = getConfig();
  if (!config.projectRoot) throw new Error("No project root configured");
  const now = new Date().toISOString();
  const zip = new AdmZip();
  const entries = [];
  for (const sp of stratumPaths) {
    zip.addLocalFile(sp);
    try {
      const { manifest } = readStratumZip(sp);
      entries.push({ filename: path.basename(sp), manifest });
    } catch {}
  }
  const index = {
    metastrata_version: "1.0.0",
    collection_name: collectionName,
    description,
    created_at: now,
    updated_at: now,
    entries,
  };
  zip.addFile(
    "collection_index.json",
    Buffer.from(JSON.stringify(index, null, 2)),
  );
  const safeName = collectionName.replace(/[\/\\?%*:|"<>]/g, "_");
  const destPath = path.join(config.projectRoot, `${safeName}.strata`);
  zip.writeZip(destPath);
  return { success: true, filePath: destPath };
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition: { x: 16, y: 12 },
    backgroundColor: "#0A0B0D",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../build/index.html")}`;
  mainWindow.loadURL(startUrl);
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });
  });
  mainWindow.on("maximize", () =>
    mainWindow.webContents.send("window:state-change", { maximized: true }),
  );
  mainWindow.on("unmaximize", () =>
    mainWindow.webContents.send("window:state-change", { maximized: false }),
  );
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const send = (a) => () =>
    mainWindow?.webContents.send("menu:action", { action: a });
  const tmpl = [
    {
      label: "File",
      submenu: [
        {
          label: "New Stratum…",
          accelerator: "CmdOrCtrl+N",
          click: send("new-stratum"),
        },
        {
          label: "New Collection…",
          accelerator: "CmdOrCtrl+Shift+N",
          click: send("new-collection"),
        },
        { type: "separator" },
        { label: "Connect Mobile", click: send("receive-from-mobile") },
        { type: "separator" },
        { label: "Export…", click: send("export") },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Schemes",
      submenu: [
        {
          label: "Scheme Bank",
          accelerator: "CmdOrCtrl+B",
          click: send("nav-scheme-bank"),
        },
        { type: "separator" },
        { label: "New Scheme", click: send("new-scheme") },
        { label: "Import Scheme…", click: send("import-scheme") },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Home", accelerator: "CmdOrCtrl+H", click: send("nav-home") },
        { label: "Feature Bank", click: send("nav-feature-bank") },
        { label: "Statistics", click: send("nav-stats") },
        { label: "History", click: send("nav-history") },
        { type: "separator" },
        {
          label: "Toggle Theme",
          accelerator: "CmdOrCtrl+Shift+T",
          click: send("toggle-theme"),
        },
        { type: "separator" },
        { role: "toggleDevTools" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "About MetaStrata", click: send("about") },
        { label: "Nagoya Protocol Notice", click: send("nagoya") },
        { type: "separator" },
        {
          label: "View on GitHub",
          click: () =>
            shell.openExternal("https://github.com/RebornBeat/Metastrata"),
        },
      ],
    },
  ];
  if (process.platform === "darwin")
    tmpl.unshift({
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  Menu.setApplicationMenu(Menu.buildFromTemplate(tmpl));
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return "127.0.0.1";
}

function generateSessionCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `${String(n).slice(0, 3)}-${String(n).slice(3, 6)}`;
}

function stopTransferServer() {
  if (transferServer) {
    transferServer.close();
    transferServer = null;
    transferState = null;
  }
}

function getDesktopFiles(projectRoot) {
  if (!projectRoot || !fs.existsSync(projectRoot)) return [];
  const files = fs.readdirSync(projectRoot);
  return files
    .filter((f) => f.endsWith(".stratum"))
    .map((f) => {
      const fp = path.join(projectRoot, f);
      try {
        const { manifest } = readStratumZip(fp);
        return {
          filename: f,
          size: manifest.source_size_bytes,
          sha256: manifest.source_sha256,
          updated_at: manifest.updated_at,
          archive_name: manifest.archive_name,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () =>
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(),
);
ipcMain.on("window:close", () => mainWindow?.close());
ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() ?? false);
ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("app:platform", () => process.platform);

ipcMain.handle("config:get", () => getConfig());
ipcMain.handle("config:save", (_, u) => {
  saveConfig(u);
  return true;
});
ipcMain.handle("config:chooseProjectRoot", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Choose MetaStrata Project Folder",
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "Use This Folder",
  });
  if (r.canceled || !r.filePaths?.length) return null;
  const root = r.filePaths[0];
  fs.mkdirSync(root, { recursive: true });
  saveConfig({ projectRoot: root, setupComplete: true });
  return root;
});

ipcMain.handle("schemeBank:read", () => readJSON(SCHEME_BANK_PATH, []));
ipcMain.handle("schemeBank:write", (_, d) => writeJSON(SCHEME_BANK_PATH, d));
ipcMain.handle("featureBank:read", () =>
  readJSON(FEATURE_BANK_PATH, {
    fieldValues: {},
    categories: [],
    fieldNames: [],
  }),
);
ipcMain.handle("featureBank:write", (_, d) => writeJSON(FEATURE_BANK_PATH, d));
ipcMain.handle("history:read", () => readJSON(HISTORY_PATH, []));
ipcMain.handle("history:write", (_, d) => writeJSON(HISTORY_PATH, d));

ipcMain.handle("project:scan", () => {
  const { projectRoot } = getConfig();
  if (!projectRoot) return { strata: [], collections: [] };
  try {
    return scanProjectRoot(projectRoot);
  } catch {
    return { strata: [], collections: [] };
  }
});

ipcMain.handle("stratum:create", (_, args) => {
  try {
    return createStratumZip(args);
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle("stratum:read", (_, fp) => {
  try {
    return { success: true, ...readStratumZip(fp) };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle("stratum:update", (_, fp, u) => {
  try {
    return updateStratumZip(fp, u);
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle("stratum:delete", (_, fp) => {
  try {
    fs.unlinkSync(fp);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle("stratum:extractSource", async (_, sp) => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Extract Source File To…",
    properties: ["openDirectory"],
    buttonLabel: "Extract Here",
  });
  if (r.canceled) return { success: false, canceled: true };
  try {
    const zip = new AdmZip(sp);
    const entries = zip
      .getEntries()
      .filter((e) => e.entryName.startsWith("source/") && !e.isDirectory);
    if (!entries.length) throw new Error("No source file found");
    zip.extractEntryTo(entries[0], r.filePaths[0], false, true);
    return {
      success: true,
      extractedPath: path.join(
        r.filePaths[0],
        path.basename(entries[0].entryName),
      ),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("strata:create", (_, args) => {
  try {
    return createStrataZip(args);
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("dialog:openFile", async (_, opts = {}) =>
  dialog.showOpenDialog(mainWindow, { properties: ["openFile"], ...opts }),
);
ipcMain.handle("dialog:saveFile", async (_, opts = {}) =>
  dialog.showSaveDialog(mainWindow, opts),
);

ipcMain.handle("export:scheme", async (_, scheme) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${scheme.name.replace(/\s+/g, "_")}.metascheme`,
    filters: [{ name: "MetaStrata Scheme", extensions: ["metascheme"] }],
  });
  if (r.canceled) return { success: false, canceled: true };
  try {
    fs.writeFileSync(
      r.filePath,
      JSON.stringify({ metastrata_schema: "scheme_v1", ...scheme }, null, 2),
    );
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("import:scheme", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: "MetaStrata Scheme", extensions: ["metascheme"] }],
    properties: ["openFile"],
  });
  if (r.canceled || !r.filePaths?.length)
    return { success: false, canceled: true };
  try {
    return {
      success: true,
      scheme: JSON.parse(fs.readFileSync(r.filePaths[0], "utf-8")),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("export:collectionCsv", async (_, { strata, filename }) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename || "collection.csv",
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });
  if (r.canceled) return { success: false, canceled: true };
  try {
    fs.writeFileSync(r.filePath, strata);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ─── Enhanced Transfer Session (Unified for Sync) ─────────────────────────────
ipcMain.handle("transfer:startReceive", async () => {
  stopTransferServer();

  const token = require("uuid").v4();
  const sessionCode = generateSessionCode();
  const port = 49200 + Math.floor(Math.random() * 800);
  const ip = getLocalIP();
  const config = getConfig();

  transferState = {
    token,
    sessionCode,
    mode: "receive",
    connected: false,
    clientFiles: [],
    desktopFiles: getDesktopFiles(config.projectRoot),
  };

  transferServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Transfer-Token",
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const reqTok =
      parsedUrl.searchParams.get("token") || req.headers["x-transfer-token"];

    // ── Handshake ─────────────────────────────────────────────────────
    if (req.method === "GET" && req.url.startsWith("/handshake")) {
      if (reqTok !== token) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Invalid token" }));
        return;
      }
      transferState.connected = true;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          app: "MetaStrata",
          version: app.getVersion(),
          device: "Desktop",
          session_code: sessionCode,
          mode: "receive",
          token_valid: true,
          desktop_files: transferState.desktopFiles,
        }),
      );
      return;
    }

    // ── Client sends its file list for sync view ────────────────────────
    if (req.method === "POST" && req.url.startsWith("/client-list")) {
      if (reqTok !== token) {
        res.writeHead(403);
        res.end();
        return;
      }
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          transferState.clientFiles = data.files || [];
          transferState.connected = true;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              desktop_files: transferState.desktopFiles,
            }),
          );
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    // ── Get current lists (Polling) ─────────────────────────────────────
    if (req.method === "GET" && req.url.startsWith("/sync-status")) {
      if (reqTok !== token) {
        res.writeHead(403);
        res.end();
        return;
      }
      res.writeHead(200);
      res.end(
        JSON.stringify({
          connected: transferState.connected,
          clientFiles: transferState.clientFiles,
          desktopFiles: transferState.desktopFiles,
        }),
      );
      return;
    }

    // ── Upload (Receive from Mobile) ──────────────────────────────────────
    if (req.method === "POST" && req.url.startsWith("/upload")) {
      if (reqTok !== token) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Invalid token" }));
        return;
      }

      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const filename = body.filename || `transfer-${Date.now()}.stratum`;
          const fileData = body.data;

          if (!fileData || !config.projectRoot) {
            res.writeHead(400);
            res.end(
              JSON.stringify({ error: "No file data or project root not set" }),
            );
            return;
          }

          const destPath = path.join(config.projectRoot, filename);
          fs.writeFileSync(destPath, Buffer.from(fileData, "base64"));

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, filename }));

          if (mainWindow) {
            mainWindow.webContents.send("transfer:received", {
              filename,
              filePath: destPath,
            });
          }
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // ── Request File (Mobile pulls from Desktop) ────────────────────────
    if (req.method === "GET" && req.url.startsWith("/request-file")) {
      if (reqTok !== token) {
        res.writeHead(403);
        res.end();
        return;
      }

      const reqFilename = parsedUrl.searchParams.get("filename");
      if (!reqFilename) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "No filename provided" }));
        return;
      }

      try {
        const filePath = path.join(config.projectRoot, reqFilename);
        if (!fs.existsSync(filePath)) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "File not found" }));
          return;
        }

        const data = fs.readFileSync(filePath);
        const base64Data = data.toString("base64");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ filename: reqFilename, data: base64Data }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve, reject) => {
    transferServer.listen(port, "0.0.0.0", () => resolve());
    transferServer.on("error", reject);
  });

  setTimeout(stopTransferServer, 5 * 60 * 1000);

  return {
    success: true,
    ip,
    port,
    token,
    sessionCode,
    qrData: `metastrata://transfer?ip=${ip}&port=${port}&token=${token}&mode=receive`,
  };
});

// Retaining startSend for compatibility, but logic is unified
ipcMain.handle("transfer:startSend", async (_e, { filePath }) => {
  // We just start a session like Receive, Mobile can pull the specific file if it exists
  // or we just let the session show all files.
  return await ipcMain.invoke("transfer:startReceive");
});

ipcMain.handle("transfer:stop", () => {
  stopTransferServer();
  return { success: true };
});

ipcMain.handle("transfer:status", () => ({
  active: !!transferServer,
  state: transferState,
}));

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  buildMenu();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
