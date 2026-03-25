import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import toast from 'react-hot-toast';

export function useDeviceDiscovery() {
  const deviceInfo = useAppStore((s) => s.deviceInfo);
  const setDiscoveredDevices = useAppStore((s) => s.setDiscoveredDevices);
  const discoveredDevices = useAppStore((s) => s.discoveredDevices);

  // Register this device
  const registerDevice = useCallback(async () => {
    if (!deviceInfo.id || !deviceInfo.port) return;

    try {
      const response = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deviceInfo.id,
          name: deviceInfo.name,
          port: deviceInfo.port,
        }),
      });

      if (!response.ok) throw new Error('Failed to register device');
      const data = await response.json();

      useAppStore.setState({
        deviceInfo: {
          ...deviceInfo,
          ip: data.ip,
          lastHeartbeat: data.lastHeartbeat,
        },
      });
    } catch (error) {
      console.error('Device registration error:', error);
    }
  }, [deviceInfo]);

  // Fetch device list
  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch('/api/devices/list');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();

      // Filter out current device
      const otherDevices = data.devices.filter(d => d.id !== deviceInfo.id);
      setDiscoveredDevices(otherDevices);
    } catch (error) {
      console.error('Device discovery error:', error);
    }
  }, [deviceInfo.id, setDiscoveredDevices]);

  // Setup polling: register every 30 seconds, discover every 10 seconds
  useEffect(() => {
    if (!deviceInfo.id) return;

    // Initial register
    registerDevice();

    // Register heartbeat every 30 seconds
    const registerInterval = setInterval(registerDevice, 30 * 1000);

    // Discover every 10 seconds
    fetchDevices();
    const discoverInterval = setInterval(fetchDevices, 10 * 1000);

    return () => {
      clearInterval(registerInterval);
      clearInterval(discoverInterval);
    };
  }, [deviceInfo.id, registerDevice, fetchDevices]);

  return {
    discoveredDevices,
    fetchDevices,
    registerDevice,
  };
}
