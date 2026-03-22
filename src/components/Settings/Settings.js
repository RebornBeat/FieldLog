import React, { useState } from "react";
import { FolderOpen, Moon, Sun, RefreshCw } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import { APP_VERSION } from "../../constants";
import "./Settings.css";

export default function Settings() {
  const { state, chooseProjectRoot, rescan, dispatch } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [scanning, setScanning] = useState(false);

  const handleRescan = async () => {
    setScanning(true);
    await rescan();
    setScanning(false);
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
          <section className="settings-section">
            <h3 className="settings-section__title">Project</h3>
            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">Project Root</span>
                <span className="settings-row__value">
                  {state.projectRoot || "Not set"}
                </span>
                <span className="settings-row__hint">
                  All .stratum and .strata files auto-save here
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
                <span className="settings-row__hint">
                  Rescan to pick up files added outside the app
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
                {theme === "dark" ? (
                  <>
                    <Sun size={13} /> Switch to Light
                  </>
                ) : (
                  <>
                    <Moon size={13} /> Switch to Dark
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section__title">About</h3>
            <div className="settings-row settings-row--plain">
              <span className="settings-row__label">MetaStrata</span>
              <span className="settings-row__value">Version {APP_VERSION}</span>
            </div>
            <div className="settings-row settings-row--plain">
              <span className="settings-row__label">License</span>
              <span className="settings-row__value">MIT — MetaStrata</span>
            </div>
            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">
                  Nagoya Protocol Notice
                </span>
                <span className="settings-row__hint">
                  Legal notice about user responsibility for biological data
                </span>
              </div>
              <button
                className="settings-btn"
                onClick={() =>
                  dispatch({ type: "OPEN_MODAL", payload: { modal: "nagoya" } })
                }
              >
                View Notice
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
