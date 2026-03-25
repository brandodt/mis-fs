'use client';

import { useAppStore } from '@/store/appStore';

export function TransferProgress() {
  const activeTransfers = useAppStore((s) => s.activeTransfers);

  if (activeTransfers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {activeTransfers.map((transfer) => (
        <div
          key={transfer.id}
          className="p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                {transfer.type === 'upload' ? '⬆️' : '⬇️'} {transfer.filename}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {transfer.progress}%
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${transfer.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
