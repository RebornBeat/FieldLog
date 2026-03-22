import React from 'react';
import './Button.css';

/**
 * Button variants: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
 * Sizes: 'sm' | 'md' | 'lg'
 */
export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  title,
  onClick,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    loading ? 'btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {Icon && !loading && <Icon size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15} className="btn__icon btn__icon--left" />}
      {children && <span className="btn__label">{children}</span>}
      {IconRight && <IconRight size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15} className="btn__icon btn__icon--right" />}
    </button>
  );
}

/**
 * Icon-only button (no label).
 */
export function IconButton({ icon: Icon, size = 'md', variant = 'ghost', title, onClick, disabled, className = '' }) {
  const classes = [
    'btn',
    'btn--icon-only',
    `btn--${variant}`,
    `btn--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <Icon size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15} />
    </button>
  );
}
