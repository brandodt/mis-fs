'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import toast from 'react-hot-toast';

export function RemoteFileBrowser() {
  const [remoteFiles, setRemoteFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const selectedDevice = useAppStore((s) => s.selectedRemoteDevice);
  const isOpen = useAppStore((s) => s.isRemoteBrowserOpen);
  const setIsOpen = useAppStore((s) => s.setIsRemoteBrowserOpen);
  const { downloadFileFromDevice } = useFileTransfer();

  // Fetch files from remote device
  useEffect(() => {
    if (!isOpen || !selectedDevice) return;

    const fetchRemoteFiles = async () => {
      setIsLoading(true);
      try {
        const url = `http://${selectedDevice.ip}:${selectedDevice.port}/api/files/list`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch files');

        const data = await response.json();
        setRemoteFiles(data.files);
      } catch (error) {
        console.error('Error fetching remote files:', error);
        toast.error('Failed to load remote files');
        setRemoteFiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    const interval = setInterval(fetchRemoteFiles, 5000); // Refresh every 5s
    fetchRemoteFiles();
    return () => clearInterval(interval);
  }, [isOpen, selectedDevice]);

  if (!isOpen || !selectedDevice) return null;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {selectedDevice.name}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : remoteFiles.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No files available
            </div>
          ) : (
            <div className="space-y-2">
              {remoteFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded flex justify-between items-center"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.filename}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      downloadFileFromDevice(
                        selectedDevice.ip,
                        selectedDevice.port,
                        file.id,
                        file.filename
                      )
                    }
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
