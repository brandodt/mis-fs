import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Device Info
  deviceInfo: {
    id: null,
    name: 'My Device',
    mode: 'receive', // 'send' or 'receive'
  },
  setDeviceInfo: (info) => set((state) => ({
    deviceInfo: { ...state.deviceInfo, ...info }
  })),

  setMode: (mode) => set((state) => ({
    deviceInfo: { ...state.deviceInfo, mode }
  })),

  // Discovered Devices
  discoveredDevices: [],
  setDiscoveredDevices: (devices) => set({ discoveredDevices: devices }),

  // Files to send (selected by user)
  filesToSend: [],
  addFileToSend: (file) => set((state) => ({
    filesToSend: [...state.filesToSend, file]
  })),
  removeFileToSend: (fileId) => set((state) => ({
    filesToSend: state.filesToSend.filter(f => f.id !== fileId)
  })),
  clearFilesToSend: () => set({ filesToSend: [] }),

  // Files received (from other devices)
  filesReceived: [],
  addReceivedFile: (file) => set((state) => ({
    filesReceived: [...state.filesReceived, file]
  })),
  removeReceivedFile: (fileId) => set((state) => ({
    filesReceived: state.filesReceived.filter(f => f.id !== fileId)
  })),
  clearReceivedFiles: () => set({ filesReceived: [] }),

  // Active transfers
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
  cancelTransfer: (transferId) => set((state) => ({
    activeTransfers: state.activeTransfers.filter(t => t.id !== transferId)
  })),

  // UI State
  isDarkMode: false,
  setIsDarkMode: (dark) => set({ isDarkMode: dark }),

  isSettingsModalOpen: false,
  setIsSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),

  selectedRecipient: null,
  setSelectedRecipient: (device) => set({ selectedRecipient: device }),
}));
