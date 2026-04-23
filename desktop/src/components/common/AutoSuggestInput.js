import React, { useState, useRef, useEffect } from 'react';
import './AutoSuggestInput.css';

export default function AutoSuggestInput({
  label, value, onChange, suggestions = [],
  placeholder, required, onKeyDown, className = '',
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  const showSuggestions = focused && suggestions.length > 0;

  useEffect(() => {
    if (!showSuggestions) setOpen(false);
    else setOpen(true);
  }, [showSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={`autosuggest ${className}`} ref={wrapRef}>
      {label && (
        <label className="field__label">
          {label}{required && <span className="field__required">*</span>}
        </label>
      )}
      <div className="autosuggest__wrap">
        <input
          type="text"
          className="field__input autosuggest__input"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
        {open && (
          <ul className="autosuggest__dropdown">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="autosuggest__item"
                onMouseDown={() => handleSelect(s)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
