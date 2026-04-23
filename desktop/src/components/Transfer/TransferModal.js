import React, { useState, useEffect, useCallback } from "react";
import {
  Send,
  Download,
  QrCode,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";
import Button from "../common/Button";
import "./TransferModal.css";

export default function TransferModal() {
  const { state, dispatch, notify } = useApp();
  const open = state.modals.transfer;

  const [mode, setMode] = useState(null); // 'show_qr' | 'connected' | 'loading' | null
  const [transferState, setTransferState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Selection State
  const [selectedDesktopFiles, setSelectedDesktopFiles] = useState([]);
  const [selectedClientFiles, setSelectedClientFiles] = useState([]);

  const reset = () => {
    setMode(null);
    setTransferState(null);
    setError("");
    setLoading(false);
    setSelectedDesktopFiles([]);
    setSelectedClientFiles([]);
    if (window.electronAPI?.stopTransfer) {
      window.electronAPI.stopTransfer();
    }
  };

  const close = () => {
    dispatch({ type: "CLOSE_MODAL", payload: "transfer" });
    reset();
  };

  // Listen for received files (Upload from Mobile)
  useEffect(() => {
    if (!window.electronAPI?.onTransferReceived) return;
    const cleanup = window.electronAPI.onTransferReceived(
      ({ filename, filePath }) => {
        notify("success", `Received "${filename}"`);
        // Optional: Auto-refresh list or just keep UI as is
      },
    );
    return cleanup;
  }, [notify]);

  // Start Unified Session
  const startSession = async () => {
    setLoading(true);
    setError("");
    try {
      // We reuse startReceive as it initializes the server
      const result = await window.electronAPI.startReceive();
      if (!result.success)
        throw new Error(result.error || "Failed to start session");

      setTransferState(result);
      // MOD 1: Set mode to show_qr instead of connected immediately
      setMode("show_qr");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Poll for Mobile file list and connection status
  const pollSyncStatus = useCallback(async () => {
    if (!transferState?.ip || !transferState?.token) return;
    try {
      const resp = await fetch(
        `http://${transferState.ip}:${transferState.port}/sync-status?token=${transferState.token}`,
      );
      if (resp.ok) {
        const data = await resp.json();
        setTransferState((prev) => ({
          ...prev,
          clientFiles: data.clientFiles || [],
          connected: data.connected || false, // Ensure connected status updates
        }));
      }
    } catch (e) {
      console.error("Poll error", e);
    }
  }, [transferState]);

  // Polling Effect
  useEffect(() => {
    // Run polling if we are showing QR (waiting for connection) or connected
    if (!transferState?.ip || (mode !== "show_qr" && mode !== "connected"))
      return;

    // Initial fetch
    pollSyncStatus();
    const interval = setInterval(pollSyncStatus, 3000);
    return () => clearInterval(interval);
  }, [mode, transferState, pollSyncStatus]);

  // MOD 3: Auto-transition from QR to Connected when mobile connects
  useEffect(() => {
    if (mode === "show_qr" && transferState?.connected) {
      setMode("connected");
    }
  }, [transferState?.connected, mode]);

  // Actions
  const handleSendSelected = () => {
    if (selectedDesktopFiles.length === 0) return;
    notify(
      "info",
      `${selectedDesktopFiles.length} files marked. Mobile should "Receive Selected".`,
    );
    // In this architecture, Mobile pulls. Desktop just keeps them selected/available.
  };

  const handleReceiveSelected = () => {
    if (selectedClientFiles.length === 0) return;
    notify(
      "info",
      `Waiting for Mobile to send ${selectedClientFiles.length} files...`,
    );
    // Mobile will POST to /upload. We wait.
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={close} title="Transfer & Sync" width={600}>
      {!mode ? (
        <div className="transfer-mode-select">
          <p className="transfer-intro">
            Start a local session. Connect your mobile device by scanning the QR
            code.
          </p>

          <button
            className="transfer-mode-card"
            onClick={startSession}
            disabled={loading}
          >
            <QrCode
              size={22}
              className="transfer-mode-icon transfer-mode-icon--green"
            />
            <div className="transfer-mode-info">
              <span className="transfer-mode-title">Start Session</span>
              <span className="transfer-mode-desc">
                Show QR code for mobile to connect and sync.
              </span>
            </div>
          </button>

          {error && <p className="transfer-error">{error}</p>}
        </div>
      ) : mode === "show_qr" && transferState ? (
        // MOD 2: New Render Block for QR Code
        <div className="transfer-qr-display" style={{ textAlign: "center" }}>
          <div
            style={{
              margin: "20px auto",
              width: 180,
              height: 180,
              border: "1px solid var(--border-dim)",
              borderRadius: "var(--r-lg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Placeholder for actual QR Image logic if using a library, otherwise just show code */}
            <QrCode size={140} strokeWidth={1} color="var(--text-faint)" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Session Code
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 24,
                fontWeight: "700",
                color: "var(--text-bright)",
                letterSpacing: 2,
              }}
            >
              {transferState.sessionCode}
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 20,
            }}
          >
            Scan this code with MetaStrata Mobile to connect.
          </p>
          <Button variant="secondary" onClick={reset}>
            Cancel
          </Button>
        </div>
      ) : mode === "connected" && transferState ? (
        <div className="transfer-sync-view">
          <div className="sync-header">
            <CheckCircle size={16} color="var(--success-bright)" />
            <span>Connected</span>
            <span className="sync-code">{transferState.sessionCode}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={pollSyncStatus}
              title="Refresh List"
            >
              <RefreshCw size={14} />
            </Button>
          </div>

          <div className="sync-lists">
            {/* Desktop Files Column */}
            <div className="sync-column">
              <div className="sync-col-header">
                <span>Desktop ({transferState.desktopFiles?.length})</span>
                <Button
                  size="sm"
                  onClick={handleSendSelected}
                  disabled={selectedDesktopFiles.length === 0}
                >
                  Send Selected
                </Button>
              </div>
              <div className="sync-list">
                {transferState.desktopFiles?.map((f) => {
                  const isOnClient = transferState.clientFiles?.some(
                    (cf) => cf.filename === f.filename,
                  );
                  const isSynced =
                    isOnClient &&
                    transferState.clientFiles?.find(
                      (cf) => cf.filename === f.filename,
                    )?.sha256 === f.sha256;
                  return (
                    <div key={f.filename} className="sync-item">
                      <input
                        type="checkbox"
                        checked={selectedDesktopFiles.includes(f.filename)}
                        onChange={() => {
                          setSelectedDesktopFiles((prev) =>
                            prev.includes(f.filename)
                              ? prev.filter((x) => x !== f.filename)
                              : [...prev, f.filename],
                          );
                        }}
                      />
                      <div className="sync-item-info">
                        <span className="sync-item-name">
                          {f.archive_name || f.filename}
                        </span>
                        <span className="sync-item-meta">
                          {isSynced
                            ? "Synced"
                            : isOnClient
                              ? "Conflict"
                              : "New"}
                        </span>
                      </div>
                      {isSynced && (
                        <CheckCircle
                          size={12}
                          className="sync-status-icon sync-status-ok"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Files Column */}
            <div className="sync-column">
              <div className="sync-col-header">
                <span>
                  Mobile ({transferState.clientFiles?.length || "..."})
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleReceiveSelected}
                  disabled={selectedClientFiles.length === 0}
                >
                  Receive Selected
                </Button>
              </div>
              <div className="sync-list">
                {(transferState.clientFiles || []).map((f) => (
                  <div key={f.filename} className="sync-item">
                    <input
                      type="checkbox"
                      checked={selectedClientFiles.includes(f.filename)}
                      onChange={() => {
                        setSelectedClientFiles((prev) =>
                          prev.includes(f.filename)
                            ? prev.filter((x) => x !== f.filename)
                            : [...prev, f.filename],
                        );
                      }}
                    />
                    <div className="sync-item-info">
                      <span className="sync-item-name">{f.filename}</span>
                      <span className="sync-item-meta">
                        {f.size ? `${(f.size / 1024).toFixed(0)}KB` : ""}
                      </span>
                    </div>
                  </div>
                ))}
                {!transferState.clientFiles?.length && (
                  <div className="sync-empty">Waiting for mobile...</div>
                )}
              </div>
            </div>
          </div>

          <div className="transfer-instruction">
            Select files to transfer. Mobile must initiate "Receive" or "Send"
            from its app.
          </div>
        </div>
      ) : (
        <div className="transfer-qr-display">
          <div className="transfer-loading">
            <RefreshCw size={24} className="spin-animation" />
            <p>Starting Session...</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
