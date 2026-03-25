import { NextResponse } from 'next/server';
import { getFileStorage, generateFileId } from '@/lib/fileStorage';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      file: {
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        uploadedAt: fileMetadata.uploadedAt,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
