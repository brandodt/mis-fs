import os from 'os';

/**
 * Get all non-loopback IPv4 addresses on this machine.
 * Next.js's allowedDevOrigins uses a DNS-segment wildcard matcher that cannot
 * match raw IPs with patterns like "192.168.*" — it requires exact strings or
 * proper subdomain wildcards (e.g. "*.example.com"). We resolve the actual IPs
 * at config load time so no manual updates are needed when the IP changes.
 */
function getLocalIPv4s() {
  const addresses = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const localIPs = getLocalIPv4s();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow any device on the local network to access the dev server.
  // Explicitly lists every local IPv4 address detected on this machine.
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '*.local',   // mDNS / Bonjour hostnames
    ...localIPs, // e.g. ['192.168.1.58']
  ],
};

export default nextConfig;
