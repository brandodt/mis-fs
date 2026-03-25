import { NextResponse } from 'next/server';
import { getFileStorage, generateFileId } from '@/lib/fileStorage';
import { addCORSHeaders, handleCORSPreflight } from '@/lib/cors';

export async function OPTIONS(request) {
  return handleCORSPreflight();
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      const response = NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
      return addCORSHeaders(response);
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const bufferObj = Buffer.from(buffer);

    // Generate file ID
    const fileId = generateFileId();

    // Store file
    const storage = getFileStorage();
    const fileMetadata = storage.storeFile(
      fileId,
      file.name,
      bufferObj,
      file.type
    );

    const response = NextResponse.json({
      success: true,
      file: {
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        uploadedAt: fileMetadata.uploadedAt,
      },
    });
    return addCORSHeaders(response);
  } catch (error) {
    console.error('File upload error:', error);
    const response = NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
    return addCORSHeaders(response);
  }
}
