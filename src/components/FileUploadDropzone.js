'use client';

import { useRef, useState } from 'react';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { useAppStore } from '@/store/appStore';
import toast from 'react-hot-toast';

export function FileUploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const { uploadFile } = useFileTransfer();
  const maxFileSize = useAppStore((s) => s.maxFileSize);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    handleFiles(files);
  };

  const handleFiles = (files) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${maxFileSize}MB limit`);
        continue;
      }

      uploadFile(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="space-y-2">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-14-12l6 6m0 0l-6 6m6-6H8"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Max file size: {maxFileSize}MB
        </p>
      </div>
    </div>
  );
}
