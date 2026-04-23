import React, { useState } from "react";
import {
  FolderOpen,
  Moon,
  Sun,
  RefreshCw,
  Smartphone,
  Wifi,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import { APP_VERSION } from "../../constants";
import "./Settings.css";

export default function Settings() {
  const { state, chooseProjectRoot, rescan, dispatch, notify } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [scanning, setScanning] = useState(false);

  const handleRescan = async () => {
    setScanning(true);
    await rescan();
    setScanning(false);
  };

  const handleClearFeatureBank = () => {
    if (
      !window.confirm(
        "Clear all Feature Bank history? Your archives are not affected.",
      )
    )
      return;
    const empty = { fieldValues: {}, categories: [], fieldNames: [] };
    dispatch({ type: "SET_FEATURE_BANK", payload: empty });
    if (window.electronAPI) window.electronAPI.writeFeatureBank(empty);
    notify("success", "Feature Bank cleared");
  };

  const handleClearHistory = () => {
    if (!window.confirm("Clear all action history?")) return;
    dispatch({ type: "SET_HISTORY", payload: [] });
    if (window.electronAPI) window.electronAPI.writeHistory([]);
    notify("success", "History cleared");
  };

  const openTransferModal = () => {
    dispatch({ type: "OPEN_MODAL", payload: { modal: "transfer" } });
  };

  return (
    <div className="view-page">
      <div className="view-page__header">
        <div>
          <h1 className="view-page__title">Settings</h1>
          <p className="view-page__subtitle">
            Project and application preferences
          </p>
        </div>
      </div>

      <div className="view-page__body">
        <div className="settings-sections">
          {/* Transfer Section - ADD THIS */}
          <section className="settings-section">
            <h3 className="settings-section__title">Transfer</h3>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">
                  Device-to-Device Transfer
                </span>
                <span className="settings-row__value">
                  Send or receive .stratum files between your computer and phone
                </span>
              </div>
              <button className="settings-btn" onClick={openTransferModal}>
                <Wifi size={13} /> Open Transfer
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">How it works</span>
                <span className="settings-row__hint">
                  Both devices must be on the same WiFi. Files transfer directly
                  — no cloud or internet required.
                </span>
              </div>
            </div>
          </section>

          {/* Collection Section */}
          <section className="settings-section">
            <h3 className="settings-section__title">Collection</h3>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">Project Root</span>
                <span className="settings-row__value">
                  {state.projectRoot || "Not set"}
                </span>
              </div>
              <button className="settings-btn" onClick={chooseProjectRoot}>
                <FolderOpen size={13} /> Change Folder
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">Archives</span>
                <span className="settings-row__value">
                  {state.strata.length} .stratum · {state.collections.length}{" "}
                  .strata
                </span>
              </div>
              <button
                className="settings-btn"
                onClick={handleRescan}
                disabled={scanning}
              >
                <RefreshCw size={13} /> {scanning ? "Scanning…" : "Rescan"}
              </button>
            </div>
          </section>

          {/* Data Section */}
          <section className="settings-section">
            <h3 className="settings-section__title">Data</h3>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">Action History</span>
                <span className="settings-row__value">
                  {state.history.length} events
                </span>
              </div>
              <button
                className="settings-btn settings-btn--danger"
                onClick={handleClearHistory}
              >
                Clear
              </button>
            </div>
          </section>

          {/* Appearance */}
          <section className="settings-section">
            <h3 className="settings-section__title">Appearance</h3>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">Theme</span>
                <span className="settings-row__value">
                  {theme === "dark" ? "Dark" : "Light"}
                </span>
              </div>
              <button className="settings-btn" onClick={toggleTheme}>
                {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                {theme === "dark" ? " Light" : " Dark"}
              </button>
            </div>
          </section>

          {/* About */}
          <section className="settings-section">
            <h3 className="settings-section__title">About</h3>

            <div className="settings-row settings-row--plain">
              <span className="settings-row__label">MetaStrata</span>
              <span className="settings-row__value">Version {APP_VERSION}</span>
            </div>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">
                  Nagoya Protocol Notice
                </span>
                <span className="settings-row__hint">
                  Legal notice about user responsibility
                </span>
              </div>
              <button
                className="settings-btn"
                onClick={() =>
                  dispatch({ type: "OPEN_MODAL", payload: { modal: "nagoya" } })
                }
              >
                View
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
