import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Input, Textarea } from '../common/FormElements';
import './Modals.css';

export default function NewCollectionModal() {
  const { state, dispatch, createCollection } = useApp();
  const open = state.modals.newCollection;
  const [name, setName]             = useState('');
  const [desc, setDesc]             = useState('');
  const [selected, setSelected]     = useState([]);
  const [nameErr, setNameErr]       = useState('');
  const [creating, setCreating]     = useState(false);

  const { strata } = state;

  const close = () => { dispatch({ type:'CLOSE_MODAL', payload:'newCollection' }); setName(''); setDesc(''); setSelected([]); setNameErr(''); setCreating(false); };

  const toggle = (fp) => setSelected(prev => prev.includes(fp) ? prev.filter(x=>x!==fp) : [...prev, fp]);

  const handleCreate = async () => {
    if (!name.trim()) { setNameErr('Collection name is required'); return; }
    if (selected.length < 2) { setNameErr('Select at least 2 .stratum archives'); return; }
    setCreating(true);
    await createCollection({ collectionName: name.trim(), stratumPaths: selected, description: desc.trim() });
    close();
  };

  if (strata.length < 2) {
    return (
      <Modal open={open} onClose={close} title="New Collection" width={420}>
        <div className="modal-notice">
          <p>You need at least 2 <code>.stratum</code> archives in your project to create a collection. Create more archives first.</p>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',paddingTop:8}}>
          <Button variant="secondary" onClick={close}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="New Collection" subtitle="Bundle .stratum archives into a .strata collection" width={500}
      footer={<>
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={handleCreate} loading={creating} disabled={selected.length < 2}>Create .strata</Button>
      </>}
    >
      <Input label="Collection Name" value={name} onChange={e=>{setName(e.target.value);setNameErr('');}} placeholder="e.g. Field Season 2025" error={nameErr} required autoFocus />
      <Textarea label="Description (optional)" value={desc} onChange={e=>setDesc(e.target.value)} rows={2} />

      <div className="field">
        <label className="field__label">Select Archives ({selected.length} selected — min 2)</label>
        <div className="collection-stratum-list">
          {strata.map(s => {
            const nm = s.manifest?.archive_name || s.filename?.replace('.stratum','');
            const checked = selected.includes(s.filePath);
            return (
              <label key={s.filePath} className={`csl-item ${checked?'csl-item--checked':''}`}>
                <input type="checkbox" className="csl-checkbox" checked={checked} onChange={()=>toggle(s.filePath)} />
                <div className="csl-item__info">
                  <span className="csl-item__fmt">{(s.manifest?.source_format||'?').toUpperCase()}</span>
                  <span className="csl-item__name">{nm}</span>
                  <span className="csl-item__file">{s.manifest?.source_filename}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
