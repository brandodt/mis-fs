import { useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import toast from 'react-hot-toast';

export function useFileTransfer() {
  const addSessionFile = useAppStore((s) => s.addSessionFile);
  const removeSessionFile = useAppStore((s) => s.removeSessionFile);
  const addActiveTransfer = useAppStore((s) => s.addActiveTransfer);
  const updateActiveTransfer = useAppStore((s) => s.updateActiveTransfer);
  const removeActiveTransfer = useAppStore((s) => s.removeActiveTransfer);

  // Upload file to current device
  const uploadFile = useCallback(async (file) => {
    const transferId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    try {
      addActiveTransfer({
        id: transferId,
        filename: file.name,
        size: file.size,
        progress: 0,
        type: 'upload',
        startTime,
      });

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          updateActiveTransfer(transferId, { progress });
        }
      });

      // Handle completion
      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            addSessionFile(response.file);
            toast.success(`${file.name} uploaded`);
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', '/api/files/upload');
        xhr.send(formData);
      });

      removeActiveTransfer(transferId);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}`);
      removeActiveTransfer(transferId);
    }
  }, [addSessionFile, addActiveTransfer, updateActiveTransfer, removeActiveTransfer]);

  // Download file from another device
  const downloadFileFromDevice = useCallback(async (deviceIp, devicePort, fileId, filename) => {
    const transferId = Math.random().toString(36).substring(7);

    try {
      addActiveTransfer({
        id: transferId,
        filename,
        size: 0,
        progress: 0,
        type: 'download',
        fromDevice: `${deviceIp}:${devicePort}`,
        startTime: Date.now(),
      });

      const url = `http://${deviceIp}:${devicePort}/api/files/${fileId}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();

      // Create download link
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      // Store in session cache
      addSessionFile({
        id: fileId,
        filename,
        size: blob.size,
        mimeType: blob.type,
        uploadedAt: Date.now(),
        fromDevice: `${deviceIp}:${devicePort}`,
      });

      toast.success(`${filename} downloaded`);
      removeActiveTransfer(transferId);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${filename}`);
      removeActiveTransfer(transferId);
    }
  }, [addSessionFile, addActiveTransfer, removeActiveTransfer]);

  // Download file locally (from current device)
  const downloadFileLocally = useCallback(async (fileId, filename) => {
    try {
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${filename} downloaded`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${filename}`);
    }
  }, []);

  // Delete file
  const deleteFile = useCallback(async (fileId) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');

      removeSessionFile(fileId);
      toast.success('File deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  }, [removeSessionFile]);

  return {
    uploadFile,
    downloadFileFromDevice,
    downloadFileLocally,
    deleteFile,
  };
}
