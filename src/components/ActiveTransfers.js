'use client';

import { useAppStore } from '@/store/appStore';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { X } from 'lucide-react';

export default function ActiveTransfers() {
  const activeTransfers = useAppStore((s) => s.activeTransfers);
  const { cancelTransfer } = useFileTransfer();

  if (activeTransfers.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-48px)] space-y-3 z-50">
      {activeTransfers.map((transfer) => (
        <div
          key={transfer.id}
          className="bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-lg"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">
                {transfer.filename}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {transfer.type === 'send' && 'Sending to'}
                {transfer.type === 'receive' && 'Receiving from'}
                {transfer.type === 'download' && 'Downloading'}{' '}
                {transfer.recipient || transfer.sender}
              </p>
            </div>
            {transfer.canCancel && (
              <button
                onClick={() => cancelTransfer(transfer.id)}
                className="ml-3 p-1 hover:bg-slate-700 rounded transition-colors"
                title="Cancel transfer"
              >
                <X size={16} className="text-slate-400 hover:text-slate-200" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-200 ${
                transfer.status === 'error'
                  ? 'bg-red-500'
                  : transfer.status === 'completed'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${transfer.progress}%` }}
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 capitalize">
              {transfer.status === 'encoding' && '⚙️ Encoding...'}
              {transfer.status === 'sending' && '📤 Sending...'}
              {transfer.status === 'receiving' && '📥 Receiving...'}
              {transfer.status === 'completed' && '✓ Completed'}
              {transfer.status === 'error' && '✗ Error'}
              {transfer.status === 'preparing' && '🔄 Preparing...'}
              {transfer.status === 'downloading' && '⬇️ Downloading...'}
            </span>
            <span className="text-xs text-slate-500">
              {transfer.progress}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
