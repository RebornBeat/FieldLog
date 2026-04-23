/* eslint-disable */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  minimize: () => ipcRenderer.send("window:minimize"),
  toggleMaximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  getVersion: () => ipcRenderer.invoke("app:version"),

  // Config
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (u) => ipcRenderer.invoke("config:save", u),
  chooseProjectRoot: () => ipcRenderer.invoke("config:chooseProjectRoot"),

  // Project scanning
  scanProject: () => ipcRenderer.invoke("project:scan"),

  // Stratum CRUD
  createStratum: (a) => ipcRenderer.invoke("stratum:create", a),
  readStratum: (fp) => ipcRenderer.invoke("stratum:read", fp),
  updateStratum: (fp, u) => ipcRenderer.invoke("stratum:update", fp, u),
  deleteStratum: (fp) => ipcRenderer.invoke("stratum:delete", fp),
  extractStratumSource: (fp) => ipcRenderer.invoke("stratum:extractSource", fp),

  // Strata collection
  createStrata: (a) => ipcRenderer.invoke("strata:create", a),

  // Scheme bank persistence
  readSchemeBank: () => ipcRenderer.invoke("schemeBank:read"),
  writeSchemeBank: (d) => ipcRenderer.invoke("schemeBank:write", d),

  // Feature bank persistence
  readFeatureBank: () => ipcRenderer.invoke("featureBank:read"),
  writeFeatureBank: (d) => ipcRenderer.invoke("featureBank:write", d),

  // History
  readHistory: () => ipcRenderer.invoke("history:read"),
  writeHistory: (d) => ipcRenderer.invoke("history:write", d),

  // File dialogs
  openFileDialog: (o) => ipcRenderer.invoke("dialog:openFile", o),
  saveFileDialog: (o) => ipcRenderer.invoke("dialog:saveFile", o),

  // Import / Export
  exportScheme: (s) => ipcRenderer.invoke("export:scheme", s),
  importScheme: () => ipcRenderer.invoke("import:scheme"),
  exportCollectionCsv: (d) => ipcRenderer.invoke("export:collectionCsv", d),

  // Events from main
  onMenuAction: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on("menu:action", h);
    return () => ipcRenderer.off("menu:action", h);
  },
  onWindowStateChange: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on("window:state-change", h);
    return () => ipcRenderer.off("window:state-change", h);
  },

  // Transfer
  startReceive: () => ipcRenderer.invoke("transfer:startReceive"),
  startSend: (args) => ipcRenderer.invoke("transfer:startSend", args),
  stopTransfer: () => ipcRenderer.invoke("transfer:stop"),
  transferStatus: () => ipcRenderer.invoke("transfer:status"),
  onTransferReceived: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on("transfer:received", h);
    return () => ipcRenderer.off("transfer:received", h);
  },
});
