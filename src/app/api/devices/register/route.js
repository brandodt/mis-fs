import { NextResponse } from 'next/server';
import { getDeviceRegistry } from '@/lib/deviceRegistry';
import { getLocalIP } from '@/lib/getLocalIP';
import { addCORSHeaders, handleCORSPreflight } from '@/lib/cors';

export async function OPTIONS(request) {
  return handleCORSPreflight();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, port } = body;

    if (!id) {
      const response = NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
      return addCORSHeaders(response);
    }

    const registry = getDeviceRegistry();
    const localIP = getLocalIP();

    const device = registry.registerDevice({
      id,
      name,
      ip: localIP,
      port: port || 3000,
    });

    const response = NextResponse.json(device);
    return addCORSHeaders(response);
  } catch (error) {
    console.error('Device registration error:', error);
    const response = NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
    return addCORSHeaders(response);
  }
}
