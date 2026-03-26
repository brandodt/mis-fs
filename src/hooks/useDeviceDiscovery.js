import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import toast from 'react-hot-toast';
import { getSharedSocket } from './useSocket';

function setupSocketListeners(socket, store) {
  socket.on('devices:updated', (devices) => {
    const currentDeviceId = store.deviceInfo.id;
    const otherDevices = devices.filter((d) => d.id !== currentDeviceId);
    store.setDiscoveredDevices(otherDevices);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    toast.error('Disconnected from server');
  });
}

export function useDeviceDiscovery() {
  const deviceInfo = useAppStore((s) => s.deviceInfo);
  const setDiscoveredDevices = useAppStore((s) => s.setDiscoveredDevices);
  const discoveredDevices = useAppStore((s) => s.discoveredDevices);

  // Register device with Socket.io
  const registerDevice = useCallback(() => {
    const sock = getSharedSocket();
    if (!sock || !deviceInfo.id) return;

    sock.emit('device:register', {
      id: deviceInfo.id,
      name: deviceInfo.name,
      mode: deviceInfo.mode,
    });
  }, [deviceInfo.id, deviceInfo.name, deviceInfo.mode]);

  // Change device mode
  const setDeviceMode = useCallback(
    (mode) => {
      const sock = getSharedSocket();
      if (!sock || !deviceInfo.id) return;

      sock.emit('device:setMode', {
        deviceId: deviceInfo.id,
        mode,
      });

      useAppStore.setState((state) => ({
        deviceInfo: { ...state.deviceInfo, mode },
      }));
    },
    [deviceInfo.id]
  );

  // Initialize Socket.io and register device
  useEffect(() => {
    if (!deviceInfo.id) return;

    const sock = getSharedSocket();

    // Setup listeners once per socket
    if (sock && !sock.hasDeviceDiscoveryListeners) {
      setupSocketListeners(sock, useAppStore.getState());
      sock.hasDeviceDiscoveryListeners = true;
    }

    registerDevice();

    // Re-register immediately on reconnect (the primary reason for a heartbeat).
    // We keep a long fallback interval (5 min) only for edge cases where the
    // socket stays connected but the server restarts without a TCP disconnect.
    sock?.on('reconnect', registerDevice);
    const registerInterval = setInterval(registerDevice, 5 * 60 * 1000);

    return () => {
      clearInterval(registerInterval);
      sock?.off('reconnect', registerDevice);
    };
  }, [deviceInfo.id, registerDevice]);

  return {
    discoveredDevices,
    setDeviceMode,
    registerDevice,
  };
}
