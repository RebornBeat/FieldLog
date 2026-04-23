import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Notifications.css';

const TYPE_CONFIG = {
  success: { icon: CheckCircle, className: 'toast--success' },
  error:   { icon: XCircle,     className: 'toast--error'   },
  warning: { icon: AlertTriangle, className: 'toast--warning' },
  info:    { icon: Info,        className: 'toast--info'    },
};

export default function Notifications() {
  const { state, dispatch } = useApp();

  if (state.notifications.length === 0) return null;

  return (
    <div className="notifications" aria-live="polite" aria-label="Notifications">
      {state.notifications.map((notif) => (
        <Toast
          key={notif.id}
          notif={notif}
          onDismiss={() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: notif.id })}
        />
      ))}
    </div>
  );
}

function Toast({ notif, onDismiss }) {
  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
  const Icon   = config.icon;

  return (
    <div className={`toast ${config.className}`} role="alert">
      <Icon size={14} className="toast__icon" aria-hidden="true" />
      <span className="toast__message">{notif.message}</span>
      <button
        className="toast__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={11} />
      </button>
    </div>
  );
}
