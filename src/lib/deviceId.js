// Generate a unique device ID (UUID v4)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get device ID from localStorage, or create one if it doesn't exist
export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') {
    // Server-side, return null
    return null;
  }

  const key = 'mis-fs-device-id';
  let deviceId = localStorage.getItem(key);

  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(key, deviceId);
  }

  return deviceId;
}

// Get device name from localStorage, or use default
export function getOrCreateDeviceName() {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = 'mis-fs-device-name';
  let deviceName = localStorage.getItem(key);

  if (!deviceName) {
    // Default name based on browser/device
    const browserName = getBrowserName();
    deviceName = `${browserName} Device`;
    localStorage.setItem(key, deviceName);
  }

  return deviceName;
}

// Save device name to localStorage
export function saveDeviceName(name) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mis-fs-device-name', name);
  }
}

// Get browser name for default device naming
function getBrowserName() {
  if (typeof window === 'undefined') return 'Unknown';

  const userAgent = navigator.userAgent;

  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edge')) return 'Edge';

  return 'Browser';
}
