import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this operation? This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={!isLoading}
      closeOnBackdrop={!isLoading}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`
            w-14 h-14 rounded-2xl flex items-center justify-center mb-4
            ${isDestructive ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}
          `}
        >
          {isDestructive ? (
            <AlertTriangle className="w-7 h-7" />
          ) : (
            <Info className="w-7 h-7" />
          )}
        </div>

        <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>

        <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-center gap-3 w-full">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>

          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
