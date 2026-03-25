import { NextResponse } from 'next/server';
import { getFileStorage } from '@/lib/fileStorage';

export async function GET() {
  try {
    const storage = getFileStorage();
    const files = storage.getAllFileMetadata();

    return NextResponse.json({
      files,
      count: files.length,
      totalSize: storage.getStorageSize(),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('File list error:', error);
    return NextResponse.json(
      { error: 'Failed to get file list' },
      { status: 500 }
    );
  }
}
