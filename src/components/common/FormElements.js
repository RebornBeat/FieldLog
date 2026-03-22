import React, { useState } from 'react';
import './FormElements.css';

// ─── Input ────────────────────────────────────────────────────────────────────

export function Input({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  disabled,
  required,
  error,
  hint,
  icon: Icon,
  className = '',
  ...rest
}) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label">
          {label}
          {required && <span className="field__required">*</span>}
        </label>
      )}
      <div className={`field__input-wrap ${Icon ? 'field__input-wrap--icon' : ''} ${error ? 'field__input-wrap--error' : ''}`}>
        {Icon && <Icon size={14} className="field__input-icon" />}
        <input
          type={type}
          className="field__input"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          {...rest}
        />
      </div>
      {error && <span className="field__error">{error}</span>}
      {hint && !error && <span className="field__hint">{hint}</span>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export function Textarea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  required,
  error,
  hint,
  rows = 4,
  className = '',
  ...rest
}) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label">
          {label}
          {required && <span className="field__required">*</span>}
        </label>
      )}
      <div className={`field__input-wrap ${error ? 'field__input-wrap--error' : ''}`}>
        <textarea
          className="field__input field__textarea"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          {...rest}
        />
      </div>
      {error && <span className="field__error">{error}</span>}
      {hint && !error && <span className="field__hint">{hint}</span>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function Select({
  label,
  value,
  onChange,
  options = [],
  disabled,
  required,
  error,
  hint,
  placeholder = 'Select…',
  className = '',
}) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label">
          {label}
          {required && <span className="field__required">*</span>}
        </label>
      )}
      <div className={`field__input-wrap field__select-wrap ${error ? 'field__input-wrap--error' : ''}`}>
        <select
          className="field__input field__select"
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
        <svg className="field__select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {error && <span className="field__error">{error}</span>}
      {hint && !error && <span className="field__hint">{hint}</span>}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({ label, checked, onChange, disabled, hint }) {
  return (
    <div className="field field--toggle">
      <div className="toggle-row">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={`toggle ${checked ? 'toggle--on' : ''}`}
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
        >
          <span className="toggle__thumb" />
        </button>
        {label && <span className="toggle__label">{label}</span>}
      </div>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

// ─── TagsInput ────────────────────────────────────────────────────────────────

export function TagsInput({ label, value = [], onChange, placeholder = 'Type and press Enter…', disabled }) {
  const [inputVal, setInputVal] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setInputVal('');
  };

  const removeTag = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    }
    if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      <div className="tags-input">
        {value.map((tag, i) => (
          <span key={i} className="tags-input__tag">
            {tag}
            {!disabled && (
              <button
                type="button"
                className="tags-input__remove"
                onClick={() => removeTag(i)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            type="text"
            className="tags-input__input"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(inputVal)}
            placeholder={value.length === 0 ? placeholder : ''}
          />
        )}
      </div>
    </div>
  );
}
