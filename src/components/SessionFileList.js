'use client';

import { useAppStore } from '@/store/appStore';
import { useFileTransfer } from '@/hooks/useFileTransfer';

export function SharedFilesList() {
  const sessionFiles = useAppStore((s) => s.sessionFiles);
  const { downloadFileLocally, deleteFile } = useFileTransfer();

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (sessionFiles.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p>No files shared yet</p>
        <p className="text-xs mt-1">Drag files above or click to select</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessionFiles.map((file) => (
        <div key={file.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{file.filename}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
            </p>
          </div>
          <div className="flex gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => downloadFileLocally(file.id, file.filename)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition whitespace-nowrap"
            >
              Download
            </button>
            <button
              onClick={() => deleteFile(file.id)}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition whitespace-nowrap"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Keep old export for backwards compatibility
export const SessionFileList = SharedFilesList;
