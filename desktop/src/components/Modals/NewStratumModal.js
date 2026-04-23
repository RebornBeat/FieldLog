import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, BookOpen, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { suggestArchiveName, detectFormat, getSchemeSuggestionsForFormat } from '../../utils/formatDetector';
import { emptyMetadata, emptyProvenance } from '../../utils/archiveFormat';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Input, Textarea } from '../common/FormElements';
import './Modals.css';

export default function NewStratumModal() {
  const { state, dispatch, createStratum } = useApp();
  const { modals, schemeBank, featureBank, history } = state;
  const open        = modals.newStratum;
  const prefillPath = modals.prefillPath || null;
  const prefillName = modals.prefillName || '';

  const [sourceFilePath, setSourceFilePath] = useState('');
  const [sourceFilename, setSourceFilename] = useState('');
  const [archiveName, setArchiveName]       = useState('');
  const [description, setDescription]       = useState('');
  const [selectedSchemeId, setSelectedScheme] = useState('');
  const [nameErr, setNameErr]               = useState('');
  const [sourceErr, setSourceErr]           = useState('');
  const [creating, setCreating]             = useState(false);
  const dropRef = useRef(null);

  const detectedFormat = sourceFilename ? detectFormat(sourceFilename) : null;
  const schemeSuggestions = detectedFormat
    ? getSchemeSuggestionsForFormat(detectedFormat.ext, schemeBank, history)
    : [];

  // Apply prefill from drag-drop or menu
  useEffect(() => {
    if (open && prefillPath) {
      setSourceFilePath(prefillPath);
      setSourceFilename(prefillName);
      setArchiveName(suggestArchiveName(prefillName));
    }
  }, [open, prefillPath, prefillName]);

  // Auto-suggest scheme when format detected and no scheme selected
  useEffect(() => {
    if (schemeSuggestions.length > 0 && !selectedSchemeId) {
      setSelectedScheme(schemeSuggestions[0].id);
    }
  }, [detectedFormat?.ext]);

  const reset = () => {
    setSourceFilePath(''); setSourceFilename(''); setArchiveName('');
    setDescription(''); setSelectedScheme(''); setNameErr(''); setSourceErr(''); setCreating(false);
  };

  const close = () => {
    dispatch({ type:'CLOSE_MODAL', payload:'newStratum' });
    reset();
  };

  const browseFile = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFileDialog({ properties:['openFile'] });
    if (result.canceled || !result.filePaths?.length) return;
    const fp = result.filePaths[0];
    const fn = fp.split(/[\\/]/).pop();
    setSourceFilePath(fp);
    setSourceFilename(fn);
    if (!archiveName) setArchiveName(suggestArchiveName(fn));
    setSourceErr('');
  };

  // Drag onto modal
  const handleModalDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const file = files[0];
    setSourceFilePath(file.path);
    setSourceFilename(file.name);
    if (!archiveName) setArchiveName(suggestArchiveName(file.name));
    setSourceErr('');
  };

  const handleCreate = async () => {
    if (!sourceFilePath) { setSourceErr('Select a source file'); return; }
    if (!archiveName.trim()) { setNameErr('Archive name is required'); return; }
    setCreating(true);
    const sc = schemeBank.find(s => s.id === selectedSchemeId) || null;
    const metadata   = emptyMetadata(sc);
    const provenance = emptyProvenance();
    await createStratum({ sourceFilePath, archiveName:archiveName.trim(), metadata, provenance, tags:[], appliedSchemeId: selectedSchemeId || null });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New Stratum"
      subtitle="Wrap a source file with metadata — saved automatically to your project"
      width={500}
      footer={<>
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={handleCreate} loading={creating}>Create .stratum</Button>
      </>}
    >
      {/* File picker */}
      <div
        className={`file-drop-zone ${sourceFilePath?'file-drop-zone--filled':''}`}
        ref={dropRef}
        onDragOver={e=>e.preventDefault()}
        onDrop={handleModalDrop}
        onClick={browseFile}
      >
        {!sourceFilePath ? (
          <>
            <Upload size={22} className="fdz__icon" />
            <p className="fdz__label">Drop file here, or <span className="fdz__link">browse</span></p>
            <p className="fdz__hint">Any file type accepted — untouched inside the archive</p>
          </>
        ) : (
          <>
            <FileText size={18} className="fdz__icon fdz__icon--ok" />
            <div className="fdz__file-info">
              <span className="fdz__filename">{sourceFilename}</span>
              {detectedFormat && <span className="fdz__format">{detectedFormat.label} · {detectedFormat.group}</span>}
            </div>
            <button className="fdz__clear" onClick={e=>{e.stopPropagation();setSourceFilePath('');setSourceFilename('');}} aria-label="Remove file"><X size={12}/></button>
          </>
        )}
      </div>
      {sourceErr && <p className="field__error">{sourceErr}</p>}

      <Input
        label="Archive Name"
        value={archiveName}
        onChange={e=>{setArchiveName(e.target.value);setNameErr('');}}
        placeholder="e.g. SRR12345 MinION run"
        error={nameErr}
        required
        autoFocus={!prefillPath}
      />

      <Textarea
        label="Description (optional)"
        value={description}
        onChange={e=>setDescription(e.target.value)}
        placeholder="What is this file?"
        rows={2}
      />

      {/* Scheme selection */}
      <div className="field">
        <label className="field__label">
          <BookOpen size={12} style={{display:'inline',marginRight:5,verticalAlign:'middle'}}/>
          Apply Scheme (optional)
        </label>

        {schemeSuggestions.length > 0 && (
          <div className="scheme-suggestions">
            <p className="scheme-suggestions__label">Suggested for {detectedFormat?.label}:</p>
            {schemeSuggestions.slice(0,3).map(sc => (
              <button
                key={sc.id}
                className={`scheme-suggestion-btn ${selectedSchemeId===sc.id?'scheme-suggestion-btn--selected':''}`}
                onClick={() => setSelectedScheme(selectedSchemeId===sc.id?'':sc.id)}
              >
                <span>{sc.name}</span>
                <span className="scheme-suggestion-btn__used">{sc.usageCount}×</span>
              </button>
            ))}
          </div>
        )}

        <select
          className="field__input field__select"
          value={selectedSchemeId}
          onChange={e=>setSelectedScheme(e.target.value)}
        >
          <option value="">— No scheme —</option>
          {schemeBank.map(sc => (
            <option key={sc.id} value={sc.id}>{sc.name}{sc.isBuiltIn?' ★':''}</option>
          ))}
        </select>
      </div>

      <div className="modal-notice">
        <p>The source file will be copied (not moved) into the <code>.stratum</code> archive. The original remains at its current location. The archive is auto-saved to your project folder.</p>
      </div>
    </Modal>
  );
}
