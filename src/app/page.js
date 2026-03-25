'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
import { useDeviceDiscovery } from '@/hooks/useDeviceDiscovery';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { generateDeviceName, formatFileSize } from '@/lib/deviceUtils';
import { DeviceModal } from '@/components/DeviceModal';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import {
  Send,
  Inbox,
  Settings,
  Moon,
  Sun,
  Upload,
  FileIcon,
  Download,
  X,
  AlertCircle,
  CheckCircle,
  Radio,
  Loader,
} from 'lucide-react';

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { discoveredDevices, setDeviceMode } = useDeviceDiscovery();
  const { selectFilesToSend, sendFiles, downloadReceivedFile, removeReceivedFile, cancelTransfer } =
    useFileTransfer();
  const fileInputRef = useRef(null);
  const modeButtonsRef = useRef(null);

  const deviceInfo = useAppStore((s) => s.deviceInfo);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);
  const setIsSettingsModalOpen = useAppStore((s) => s.setIsSettingsModalOpen);
  const mode = useAppStore((s) => s.deviceInfo.mode);
  const filesToSend = useAppStore((s) => s.filesToSend);
  const filesReceived = useAppStore((s) => s.filesReceived);
  const activeTransfers = useAppStore((s) => s.activeTransfers);
  const removeFileToSend = useAppStore((s) => s.removeFileToSend);

  // Initialize device info
  useEffect(() => {
    const deviceId = getOrCreateDeviceId();
    const deviceName = generateDeviceName();

    if (deviceId && deviceName) {
      setDeviceInfo({
        id: deviceId,
        name: deviceName,
        mode: 'receive',
      });
      setIsInitialized(true);
    }
  }, [setDeviceInfo]);

  // Animate mode buttons
  useEffect(() => {
    if (modeButtonsRef.current) {
      gsap.fromTo(
        modeButtonsRef.current.children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, [mode]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Radio className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  const toggleMode = () => {
    const newMode = mode === 'receive' ? 'send' : 'receive';
    setDeviceMode(newMode);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await selectFilesToSend(files);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MIS-FS
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Local Network File Sharing
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Active Transfers */}
      {activeTransfers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Active Transfers
            </h3>
            <div className="space-y-4">
              {activeTransfers.map((transfer) => (
                <div key={transfer.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {transfer.type === 'send' && (
                        <Send className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      {transfer.type === 'receive' && (
                        <Inbox className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {transfer.type === 'download' && (
                        <Download className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {transfer.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {transfer.status === 'encoding' && '⚙️ Encoding...'}
                          {transfer.status === 'sending' && '📤 Sending...'}
                          {transfer.status === 'receiving' && '📥 Receiving...'}
                          {transfer.status === 'completed' && '✓ Completed'}
                          {transfer.status === 'error' && '✗ Error'}
                          {transfer.status === 'preparing' && '🔄 Preparing...'}
                          {transfer.status === 'downloading' && '⬇️ Downloading...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {transfer.progress}%
                      </span>
                      {transfer.canCancel && (
                        <button
                          onClick={() => cancelTransfer(transfer.id)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Cancel transfer"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        transfer.type === 'send'
                          ? 'bg-blue-500'
                          : transfer.type === 'download'
                          ? 'bg-purple-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${transfer.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode Toggle Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 py-8 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto">
          {/* Device Name Display */}
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Your Device
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              {deviceInfo.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              ID: {deviceInfo.id?.slice(0, 12)}...
            </p>
          </div>

          {/* Mode Buttons */}
          <div className="flex gap-4 justify-center" ref={modeButtonsRef}>
            <button
              onClick={toggleMode}
              disabled={filesToSend.length > 0 && mode === 'send'}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                mode === 'send'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Send className="w-5 h-5" />
              SEND
            </button>
            <button
              onClick={toggleMode}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                mode === 'receive'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
              }`}
            >
              <Inbox className="w-5 h-5" />
              RECEIVE
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {mode === 'send' ? (
          // SEND MODE
          <div className="space-y-8">
            {/* File Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                <Upload className="w-6 h-6 text-blue-500" />
                Select Files
              </h2>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
              >
                <FileIcon className="w-12 h-12 text-blue-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Click to select files
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  or drag and drop files here
                </p>
              </button>
            </div>

            {/* Selected Files */}
            {filesToSend.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  Selected Files ({filesToSend.length})
                </h2>

                <div className="space-y-2 mb-6">
                  {filesToSend.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <FileIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {f.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(f.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFileToSend(f.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0 ml-2"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>

                {discoveredDevices.length === 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-800 dark:text-yellow-200">
                      No devices found. Make sure other devices are in "Receive" mode.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      Send to:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {discoveredDevices.map((device) => (
                        <button
                          key={device.id}
                          onClick={() => sendFiles(device.id)}
                          className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 font-semibold flex items-center justify-center gap-2 hover:scale-105 truncate"
                        >
                          <Send className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Send to {device.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {discoveredDevices.length > 0 && filesToSend.length === 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-green-800 dark:text-green-200 text-lg font-semibold">
                  {discoveredDevices.length} device(s) ready to receive
                </p>
                <p className="text-green-700 dark:text-green-300 mt-2">
                  Select files above to start sharing
                </p>
              </div>
            )}
          </div>
        ) : (
          // RECEIVE MODE
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-10 text-center border border-green-200 dark:border-green-800">
              <Inbox className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                Ready to Receive
              </h2>
              <p className="text-green-700 dark:text-green-200">
                Your device is open and waiting for files from other devices on your network
              </p>
            </div>

            {filesReceived.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
                <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                  No files received yet
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  Files from other devices will appear here
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                  <Download className="w-6 h-6 text-blue-500" />
                  Received Files ({filesReceived.length})
                </h2>

                <div className="space-y-3">
                  {filesReceived.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <FileIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {formatFileSize(file.size)} from {file.receivedFrom}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() =>
                            downloadReceivedFile(file.id, file.filename, file.data)
                          }
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeReceivedFile(file.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <DeviceModal />
    </div>
  );
}

