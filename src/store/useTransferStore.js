import { create } from 'zustand';

const useTransferStore = create((set, get) => ({
  // Device info
  deviceId: null,
  deviceName: '',

  // Connected peers
  peers: [],

  // Active transfers
  transfers: [],

  // Transfer history
  history: [],

  // Settings
  settings: {
    encryption: false,
    autoAccept: false,
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
  },

  // Connection status
  isConnected: false,

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),

  setDeviceId: (id) => set({ deviceId: id }),

  setDeviceName: (name) => set({ deviceName: name }),

  addPeer: (peer) => set((state) => ({
    peers: [...state.peers.filter(p => p.id !== peer.id), peer]
  })),

  removePeer: (peerId) => set((state) => ({
    peers: state.peers.filter(p => p.id !== peerId)
  })),

  updatePeer: (peerId, updates) => set((state) => ({
    peers: state.peers.map(p =>
      p.id === peerId ? { ...p, ...updates } : p
    )
  })),

  addTransfer: (transfer) => set((state) => ({
    transfers: [...state.transfers, transfer]
  })),

  updateTransfer: (transferId, updates) => set((state) => ({
    transfers: state.transfers.map(t =>
      t.id === transferId ? { ...t, ...updates } : t
    )
  })),

  removeTransfer: (transferId) => set((state) => ({
    transfers: state.transfers.filter(t => t.id !== transferId)
  })),

  addToHistory: (transfer) => set((state) => ({
    history: [transfer, ...state.history.slice(0, 99)] // Keep last 100
  })),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  clearPeers: () => set({ peers: [] }),

  clearTransfers: () => set({ transfers: [] }),
}));

export default useTransferStore;
