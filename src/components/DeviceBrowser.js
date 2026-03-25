'use client';

import { useAppStore } from '@/store/appStore';

export function DeviceBrowser() {
  const discoveredDevices = useAppStore((s) => s.discoveredDevices);
  const setSelectedRemoteDevice = useAppStore((s) => s.setSelectedRemoteDevice);
  const setIsRemoteBrowserOpen = useAppStore((s) => s.setIsRemoteBrowserOpen);

  const handleSelectDevice = (device) => {
    setSelectedRemoteDevice(device);
    setIsRemoteBrowserOpen(true);
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (discoveredDevices.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p>No devices discovered yet</p>
        <p className="text-sm">Make sure other devices are also connected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {discoveredDevices.map((device) => (
        <button
          key={device.id}
          onClick={() => handleSelectDevice(device)}
          className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{device.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {device.ip}:{device.port}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                Online
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {formatTime(device.lastHeartbeat)}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
