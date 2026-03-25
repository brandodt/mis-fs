import { NextResponse } from 'next/server';
import { getDeviceRegistry } from '@/lib/deviceRegistry';

export async function GET() {
  try {
    const registry = getDeviceRegistry();
    const devices = registry.getOnlineDevices();

    return NextResponse.json({
      devices,
      count: devices.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Device list error:', error);
    return NextResponse.json(
      { error: 'Failed to get device list' },
      { status: 500 }
    );
  }
}
