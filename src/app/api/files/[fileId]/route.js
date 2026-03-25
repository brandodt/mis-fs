import { NextResponse } from 'next/server';
import { getFileStorage } from '@/lib/fileStorage';
import { addCORSHeaders, handleCORSPreflight } from '@/lib/cors';

export async function OPTIONS(request) {
  return handleCORSPreflight();
}

export async function GET(request, { params }) {
  try {
    const fileId = await Promise.resolve(params.fileId);
    const storage = getFileStorage();
    const buffer = storage.getFileBuffer(fileId);

    if (!buffer) {
      const response = NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
      return addCORSHeaders(response);
    }

    const metadata = storage.getFileMetadata(fileId);

    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': metadata.mimeType,
        'Content-Disposition': `attachment; filename="${metadata.filename}"`,
        'Content-Length': metadata.size,
      },
    });
    return addCORSHeaders(response);
  } catch (error) {
    console.error('File download error:', error);
    const response = NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
    return addCORSHeaders(response);
  }
}

export async function DELETE(request, { params }) {
  try {
    const fileId = await Promise.resolve(params.fileId);
    const storage = getFileStorage();
    const success = storage.deleteFile(fileId);

    if (!success) {
      const response = NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
      return addCORSHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: 'File deleted',
    });
    return addCORSHeaders(response);
  } catch (error) {
    console.error('File delete error:', error);
    const response = NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
    return addCORSHeaders(response);
  }
}
