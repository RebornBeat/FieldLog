import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import './Modals.css';

export default function ConfirmModal() {
  const { state, dispatch } = useApp();
  return null; // Confirm actions use window.confirm() inline for simplicity
}
