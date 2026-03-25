// In-memory file storage for session-based file caching
// Files are stored as Buffer objects in memory, not on disk

class FileStorage {
  constructor() {
    this.files = new Map();
  }

  // Store a file buffer
  storeFile(fileId, filename, buffer, mimeType) {
    const now = Date.now();
    this.files.set(fileId, {
      id: fileId,
      filename,
      size: buffer.length,
      mimeType: mimeType || 'application/octet-stream',
      buffer, // Keep the actual buffer
      uploadedAt: now,
    });

    return this.files.get(fileId);
  }

  // Get file metadata (without buffer)
  getFileMetadata(fileId) {
    const file = this.files.get(fileId);
    if (!file) return null;

    return {
      id: file.id,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
    };
  }

  // Get file buffer for download
  getFileBuffer(fileId) {
    const file = this.files.get(fileId);
    return file ? file.buffer : null;
  }

  // Get all file metadata (without buffers)
  getAllFileMetadata() {
    const files = [];
    for (const file of this.files.values()) {
      files.push({
        id: file.id,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
      });
    }
    return files;
  }

  // Delete a file
  deleteFile(fileId) {
    return this.files.delete(fileId);
  }

  // Clear all files
  clear() {
    this.files.clear();
  }

  // Get storage size in bytes
  getStorageSize() {
    let total = 0;
    for (const file of this.files.values()) {
      total += file.size;
    }
    return total;
  }

  // Get file count
  getFileCount() {
    return this.files.size;
  }
}

// Singleton instance per device
let storageInstance = null;

export function getFileStorage() {
  if (!storageInstance) {
    storageInstance = new FileStorage();
  }
  return storageInstance;
}

// Generate a random file ID
export function generateFileId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
