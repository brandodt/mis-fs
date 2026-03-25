'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
import { useDeviceDiscovery } from '@/hooks/useDeviceDiscovery';
import { usePageLeaveWarning } from '@/hooks/usePageLeaveWarning';
import { getOrCreateDeviceId, getOrCreateDeviceName } from '@/lib/deviceId';
import { FileUploadDropzone } from '@/components/FileUploadDropzone';
import { SessionFileList } from '@/components/SessionFileList';
import { DeviceBrowser } from '@/components/DeviceBrowser';
import { RemoteFileBrowser } from '@/components/RemoteFileBrowser';
import { TransferProgress } from '@/components/TransferProgress';
import { DeviceModal } from '@/components/DeviceModal';

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  useDeviceDiscovery();
  usePageLeaveWarning();

  const deviceInfo = useAppStore((s) => s.deviceInfo);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);
  const setIsSettingsModalOpen = useAppStore((s) => s.setIsSettingsModalOpen);

  // Initialize device info from localStorage
  useEffect(() => {
    const deviceId = getOrCreateDeviceId();
    const deviceName = getOrCreateDeviceName();

    if (deviceId && deviceName) {
      setDeviceInfo({
        id: deviceId,
        name: deviceName,
        port: 3000, // Default port
      });
      setIsInitialized(true);
    }
  }, [setDeviceInfo]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              MIS-FS
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
              {deviceInfo.name}
            </p>
          </div>

          <div className="flex gap-2 sm:gap-4 items-center">
            <button
              onClick={toggleTheme}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Toggle dark mode"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Transfer Progress */}
        <TransferProgress />

        {/* Upload Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Upload Files
          </h2>
          <FileUploadDropzone />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Files */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              My Files
            </h2>
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <SessionFileList />
            </div>
          </section>

          {/* Discover Devices */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Devices on Network
            </h2>
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <DeviceBrowser />
            </div>
          </section>
        </div>
      </main>

      {/* Modals */}
      <DeviceModal />
      <RemoteFileBrowser />
    </div>
  );
}
