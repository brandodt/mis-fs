// In-memory device registry
// This stores devices and their heartbeat status

const HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

class DeviceRegistry {
  constructor() {
    this.devices = new Map();
    this.cleanupInterval = null;
    this.startCleanupTimer();
  }

  // Register or update a device
  registerDevice(device) {
    const { id, name, ip, port } = device;

    if (!id || !ip) {
      throw new Error('Device must have id and ip');
    }

    const now = Date.now();
    this.devices.set(id, {
      id,
      name: name || 'Unknown Device',
      ip,
      port: port || 3000,
      lastHeartbeat: now,
      registeredAt: this.devices.has(id) ? this.devices.get(id).registeredAt : now,
    });

    return this.devices.get(id);
  }

  // Get a single device
  getDevice(id) {
    return this.devices.get(id);
  }

  // Get all online devices (filter out inactive ones)
  getOnlineDevices() {
    const now = Date.now();
    const onlineDevices = [];

    for (const device of this.devices.values()) {
      const timeSinceHeartbeat = now - device.lastHeartbeat;
      if (timeSinceHeartbeat < HEARTBEAT_TIMEOUT) {
        onlineDevices.push(device);
      }
    }

    return onlineDevices;
  }

  // Remove inactive devices
  removeInactiveDevices() {
    const now = Date.now();
    const inactiveDevices = [];

    for (const [id, device] of this.devices.entries()) {
      const timeSinceHeartbeat = now - device.lastHeartbeat;
      if (timeSinceHeartbeat >= HEARTBEAT_TIMEOUT) {
        this.devices.delete(id);
        inactiveDevices.push(id);
      }
    }

    return inactiveDevices;
  }

  // Clear all devices
  clear() {
    this.devices.clear();
  }

  // Start cleanup timer to remove inactive devices every minute
  startCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.removeInactiveDevices();
    }, 60 * 1000); // Every minute
  }

  // Stop cleanup timer
  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
let registryInstance = null;

export function getDeviceRegistry() {
  if (!registryInstance) {
    registryInstance = new DeviceRegistry();
  }
  return registryInstance;
}
