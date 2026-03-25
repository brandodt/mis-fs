import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Device Info
  deviceInfo: {
    id: null,
    name: 'My Device',
    ip: null,
    port: null,
    lastHeartbeat: null,
  },
  setDeviceInfo: (info) => set((state) => ({
    deviceInfo: { ...state.deviceInfo, ...info }
  })),

  // Discovered Devices
  discoveredDevices: [],
  setDiscoveredDevices: (devices) => set({ discoveredDevices: devices }),
  addDiscoveredDevice: (device) => set((state) => {
    const exists = state.discoveredDevices.find(d => d.id === device.id);
    if (exists) {
      return {
        discoveredDevices: state.discoveredDevices.map(d =>
          d.id === device.id ? device : d
        )
      };
    }
    return {
      discoveredDevices: [...state.discoveredDevices, device]
    };
  }),
  removeDiscoveredDevice: (deviceId) => set((state) => ({
    discoveredDevices: state.discoveredDevices.filter(d => d.id !== deviceId)
  })),

  // Session Files (cached files in current session)
  sessionFiles: [],
  setSessionFiles: (files) => set({ sessionFiles: files }),
  addSessionFile: (file) => set((state) => ({
    sessionFiles: [...state.sessionFiles, file]
  })),
  removeSessionFile: (fileId) => set((state) => ({
    sessionFiles: state.sessionFiles.filter(f => f.id !== fileId)
  })),
  clearSessionFiles: () => set({ sessionFiles: [] }),

  // Active Transfers
  activeTransfers: [],
  addActiveTransfer: (transfer) => set((state) => ({
    activeTransfers: [...state.activeTransfers, transfer]
  })),
  updateActiveTransfer: (transferId, updates) => set((state) => ({
    activeTransfers: state.activeTransfers.map(t =>
      t.id === transferId ? { ...t, ...updates } : t
    )
  })),
  removeActiveTransfer: (transferId) => set((state) => ({
    activeTransfers: state.activeTransfers.filter(t => t.id !== transferId)
  })),
  clearActiveTransfers: () => set({ activeTransfers: [] }),

  // UI State
  selectedRemoteDevice: null,
  setSelectedRemoteDevice: (device) => set({ selectedRemoteDevice: device }),
  isSettingsModalOpen: false,
  setIsSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  isRemoteBrowserOpen: false,
  setIsRemoteBrowserOpen: (open) => set({ isRemoteBrowserOpen: open }),

  // Theme
  isDarkMode: false,
  setIsDarkMode: (dark) => set({ isDarkMode: dark }),

  // Max file size (in MB)
  maxFileSize: 100,
  setMaxFileSize: (size) => set({ maxFileSize: size }),
}));
