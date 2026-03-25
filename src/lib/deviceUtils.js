// Generate unique device names based on browser and random identifier

const DEVICE_ADJECTIVES = [
  'Swift', 'Bright', 'Quick', 'Smart', 'Sleek', 'Bold', 'Keen', 'Vivid',
  'Rapid', 'Clever', 'Nimble', 'Sharp', 'Steady', 'Cool', 'Fresh', 'Smooth'
];

const DEVICE_NOUNS = [
  'Phoenix', 'Falcon', 'Tiger', 'Eagle', 'Wolf', 'Atom', 'Nova', 'Spark',
  'Storm', 'Nexus', 'Pulse', 'Prism', 'Forge', 'Wave', 'Zen', 'Blaze'
];

export function getBrowserName() {
  if (typeof navigator === 'undefined') return 'Device';

  const ua = navigator.userAgent;

  if (ua.includes('Chrome') && !ua.includes('Chromium')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android';

  return 'Device';
}

export function generateDeviceName() {
  const browser = getBrowserName();
  const adjective = DEVICE_ADJECTIVES[Math.floor(Math.random() * DEVICE_ADJECTIVES.length)];
  const noun = DEVICE_NOUNS[Math.floor(Math.random() * DEVICE_NOUNS.length)];

  return `${browser} - ${adjective} ${noun}`;
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
