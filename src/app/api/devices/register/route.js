import { NextResponse } from 'next/server';
import { getDeviceRegistry } from '@/lib/deviceRegistry';
import { getLocalIP } from '@/lib/getLocalIP';

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, port } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const registry = getDeviceRegistry();
    const localIP = getLocalIP();

    const device = registry.registerDevice({
      id,
      name,
      ip: localIP,
      port: port || 3000,
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error('Device registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
  }
}
