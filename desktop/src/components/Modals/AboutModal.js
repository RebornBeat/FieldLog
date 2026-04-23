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
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect
        x="4"
        y="6"
        width="40"
        height="9"
        rx="3"
        fill="var(--accent)"
        opacity="1"
      />
      <rect
        x="4"
        y="18"
        width="40"
        height="7"
        rx="3"
        fill="var(--accent-dim)"
        opacity="0.75"
      />
      <rect
        x="4"
        y="28"
        width="40"
        height="6"
        rx="3"
        fill="var(--accent-dim)"
        opacity="0.50"
      />
      <rect
        x="4"
        y="37"
        width="40"
        height="4"
        rx="2"
        fill="var(--accent-dim)"
        opacity="0.30"
      />
      <rect
        x="4"
        y="44"
        width="40"
        height="2"
        rx="1"
        fill="var(--accent-dim)"
        opacity="0.15"
      />
    </svg>
  );
}
