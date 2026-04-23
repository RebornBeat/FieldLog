import React from "react";
import { FolderOpen, Shield, Archive } from "lucide-react";
import { useApp } from "../../context/AppContext";
import "./Modals.css";

export default function SetupWizard() {
  const { state, dispatch, chooseProjectRoot } = useApp();
  const open = state.modals.setupWizard;
  if (!open) return null;

  return (
    <div className="setup-overlay">
      <div className="setup-wizard">
        <div className="setup-wizard__logo">
          <StratumMark />
        </div>
        <h1 className="setup-wizard__title">Welcome to MetaStrata</h1>
        <p className="setup-wizard__sub">
          Local-first scientific file metadata organizer. Before you begin,
          choose a project folder where all your <code>.stratum</code> archives
          will be stored automatically.
        </p>

        <div className="setup-points">
          <div className="setup-point">
            <Archive size={16} className="setup-point__icon" />
            <div>
              <strong>All archives auto-save here</strong>
              <p>
                No "Save As" dialogs. Every .stratum you create goes straight
                into this folder.
              </p>
            </div>
          </div>
          <div className="setup-point">
            <FolderOpen size={16} className="setup-point__icon" />
            <div>
              <strong>Self-aware collection</strong>
              <p>
                MetaStrata scans this folder on launch and stays aware of every
                archive you have.
              </p>
            </div>
          </div>
          <div className="setup-point">
            <Shield size={16} className="setup-point__icon" />
            <div>
              <strong>Your data, your device</strong>
              <p>
                Nothing is transmitted. Files never leave your machine. Ever.
              </p>
            </div>
          </div>
        </div>

        <button className="setup-wizard__cta" onClick={chooseProjectRoot}>
          <FolderOpen size={16} />
          Choose Project Folder
        </button>

        <button
          className="setup-wizard__skip"
          onClick={() =>
            dispatch({ type: "CLOSE_MODAL", payload: "setupWizard" })
          }
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function StratumMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="2" width="14" height="3" rx="1" fill="var(--accent)" />
      <rect
        x="1"
        y="6.5"
        width="14"
        height="2.5"
        rx="1"
        fill="var(--accent-dim)"
        opacity="0.75"
      />
      <rect
        x="1"
        y="10.5"
        width="14"
        height="2.5"
        rx="1"
        fill="var(--accent-dim)"
        opacity="0.45"
      />
      <rect
        x="1"
        y="14"
        width="14"
        height="1"
        rx="0.5"
        fill="var(--accent-dim)"
        opacity="0.25"
      />
    </svg>
  );
}
