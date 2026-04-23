import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { NAGOYA_NOTICE } from '../../constants';
import './Modals.css';

export default function NagoyaModal() {
  const { state, dispatch } = useApp();
  const open  = state.modals.nagoya;
  const close = () => dispatch({ type:'CLOSE_MODAL', payload:'nagoya' });
  return (
    <Modal open={open} onClose={close} title="Nagoya Protocol Notice" subtitle="User responsibility for biological data compliance" width={540}
      footer={<Button variant="primary" onClick={close}>I Understand</Button>}
    >
      <div className="nagoya-body">
        <pre className="nagoya-text">{NAGOYA_NOTICE}</pre>
      </div>
    </Modal>
  );
}
