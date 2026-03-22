import React, { useEffect, useRef } from 'react';
import './Modal.css';

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 480,
  className = '',
}) {
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (el) {
      const focusable = el.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length) focusable[0].focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`modal ${className}`}
        ref={dialogRef}
        style={{ width: Math.min(width, window.innerWidth - 48) }}
      >
        {/* Header */}
        <div className="modal__header">
          <div>
            <h2 className="modal__title">{title}</h2>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal__body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
