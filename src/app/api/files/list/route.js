import { NextResponse } from 'next/server';
import { getFileStorage } from '@/lib/fileStorage';
import { addCORSHeaders, handleCORSPreflight } from '@/lib/cors';

export async function OPTIONS(request) {
  return handleCORSPreflight();
}

export async function GET() {
  try {
    const storage = getFileStorage();
    const files = storage.getAllFileMetadata();

    const response = NextResponse.json({
      files,
      count: files.length,
      totalSize: storage.getStorageSize(),
      timestamp: Date.now(),
    });
    return addCORSHeaders(response);
  } catch (error) {
    console.error('File list error:', error);
    const response = NextResponse.json(
      { error: 'Failed to get file list' },
      { status: 500 }
    );
    return addCORSHeaders(response);
  }
}
