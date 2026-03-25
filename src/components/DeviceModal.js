'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { saveDeviceName } from '@/lib/deviceId';

export function DeviceModal() {
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const deviceInfo = useAppStore((s) => s.deviceInfo);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);
  const isOpen = useAppStore((s) => s.isSettingsModalOpen);
  const setIsOpen = useAppStore((s) => s.setIsSettingsModalOpen);
  const maxFileSize = useAppStore((s) => s.maxFileSize);
  const setMaxFileSize = useAppStore((s) => s.setMaxFileSize);
  const clearSessionFiles = useAppStore((s) => s.clearSessionFiles);

  useEffect(() => {
    setDeviceNameInput(deviceInfo.name || '');
  }, [deviceInfo.name, isOpen]);

  const handleSaveName = () => {
    if (deviceNameInput.trim()) {
      setDeviceInfo({ name: deviceNameInput.trim() });
      saveDeviceName(deviceNameInput.trim());
    }
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceInfo.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Device Settings
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Device Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Device Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={deviceNameInput}
              onChange={(e) => setDeviceNameInput(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={handleSaveName}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>

        {/* Device ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Device ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={deviceInfo.id || ''}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 bg-gray-50"
            />
            <button
              onClick={handleCopyDeviceId}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Device IP */}
        {deviceInfo.ip && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Local IP
            </label>
            <input
              type="text"
              value={`${deviceInfo.ip}:${deviceInfo.port || 3000}`}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 bg-gray-50"
            />
          </div>
        )}

        {/* Max File Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max File Size (MB)
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(parseInt(e.target.value) || 100)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Clear Session Files */}
        <div>
          <button
            onClick={clearSessionFiles}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Session Files
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
