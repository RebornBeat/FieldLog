import React from "react";
import { Shield, Github } from "lucide-react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";
import { APP_VERSION } from "../../constants";
import "./Modals.css";

export default function AboutModal() {
  const { state, dispatch } = useApp();
  const open = state.modals.about;
  const close = () => dispatch({ type: "CLOSE_MODAL", payload: "about" });
  return (
    <Modal open={open} onClose={close} title="About MetaStrata" width={400}>
      <div className="about-modal">
        <div className="about-modal__logo">
          <StratumMark />
        </div>
        <h3 className="about-modal__name">MetaStrata</h3>
        <p className="about-modal__version">Version {APP_VERSION}</p>
        <p className="about-modal__tagline">
          Local-first scientific file metadata organizer
        </p>
        <div className="about-modal__facts">
          <div className="about-fact">
            <Shield size={13} /> Your data never leaves your device
          </div>
          <div className="about-fact">
            <Github size={13} /> Open-source — MetaStrata
          </div>
        </div>
        <p className="about-modal__legal">
          MetaStrata is a general-purpose data organization tool. It does not
          collect, transmit, or process file contents. All archives are stored
          exclusively on your device.
        </p>
      </div>
    </Modal>
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
