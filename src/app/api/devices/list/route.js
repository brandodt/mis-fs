import { NextResponse } from 'next/server';
import { getDeviceRegistry } from '@/lib/deviceRegistry';
import { addCORSHeaders, handleCORSPreflight } from '@/lib/cors';

export async function OPTIONS(request) {
  return handleCORSPreflight();
}

export async function GET() {
  try {
    const registry = getDeviceRegistry();
    const devices = registry.getOnlineDevices();

    const response = NextResponse.json({
      devices,
      count: devices.length,
      timestamp: Date.now(),
    });
    return addCORSHeaders(response);
  } catch (error) {
    console.error('Device list error:', error);
    const response = NextResponse.json(
      { error: 'Failed to get device list' },
      { status: 500 }
    );
    return addCORSHeaders(response);
  }
}
