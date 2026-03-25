import { NextResponse } from 'next/server';
import { getFileStorage } from '@/lib/fileStorage';

export async function GET(request, { params }) {
  try {
    const fileId = await Promise.resolve(params.fileId);
    const storage = getFileStorage();
    const buffer = storage.getFileBuffer(fileId);

    if (!buffer) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const metadata = storage.getFileMetadata(fileId);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': metadata.mimeType,
        'Content-Disposition': `attachment; filename="${metadata.filename}"`,
        'Content-Length': metadata.size,
      },
    });
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const fileId = await Promise.resolve(params.fileId);
    const storage = getFileStorage();
    const success = storage.deleteFile(fileId);

    if (!success) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted',
    });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
