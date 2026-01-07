'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function Confirm({ message, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-stone-900/95 to-stone-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6 max-w-md w-full mx-4 animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-900/30 border border-amber-700/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-amber-100">Confirm Action</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-amber-300/70 hover:text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-amber-200/80 mb-6 ml-13">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-stone-700/50 border border-amber-900/30 text-amber-100 rounded-xl font-semibold hover:bg-stone-600/50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-900/50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
