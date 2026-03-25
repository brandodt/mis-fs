/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow other devices on local network to access dev server
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.21',     // Your specific IP
    '*.local',          // mDNS/local hostnames
    '192.168.*',        // All 192.168.x.x addresses
    '10.*',             // All 10.x.x.x addresses
    '172.16.*',         // All 172.16-31.x.x addresses
  ],
};

export default nextConfig;



