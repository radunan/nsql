'use client';

import { X } from 'lucide-react';

interface AlertProps {
  message: string;
  onClose: () => void;
}

export default function Alert({ message, onClose }: AlertProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-stone-900/95 to-stone-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6 max-w-md w-full mx-4 animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold text-amber-100">Notification</h3>
          <button
            onClick={onClose}
            className="text-amber-300/70 hover:text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-amber-200/80 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-900/50"
        >
          OK
        </button>
      </div>
    </div>
  );
}
