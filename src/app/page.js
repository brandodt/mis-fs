'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
import { useDeviceDiscovery } from '@/hooks/useDeviceDiscovery';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { generateDeviceName, formatFileSize } from '@/lib/deviceUtils';
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
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

const TRANSFER_SPEED_INTERVAL = 1000; // Update every 1 second

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [transferSpeeds, setTransferSpeeds] = useState({});
  const [radarActive, setRadarActive] = useState({});
  const { isDarkMode, toggleTheme } = useTheme();
  const { discoveredDevices, setDeviceMode } = useDeviceDiscovery();
  const { selectFilesToSend, sendFiles, downloadReceivedFile, removeReceivedFile, cancelTransfer } =
    useFileTransfer();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const radarRef = useRef(null);
  const transferSpeedsRef = useRef({});

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

  // Calculate transfer speeds
  useEffect(() => {
    const interval = setInterval(() => {
      const speeds = {};
      const now = Date.now();

      activeTransfers.forEach((transfer) => {
        const startTime = transfer.startTime;
        const elapsedSeconds = (now - startTime) / 1000;

        if (elapsedSeconds > 0 && transfer.size) {
          const bytesTransferred = (transfer.progress / 100) * transfer.size;
          const speedBytesPerSec = bytesTransferred / elapsedSeconds;
          const speedKbps = speedBytesPerSec / 1024;

          speeds[transfer.id] = speedKbps.toFixed(1);
        }
      });

      setTransferSpeeds(speeds);
    }, TRANSFER_SPEED_INTERVAL);

    return () => clearInterval(interval);
  }, [activeTransfers]);

  // Animate radar pulse
  useEffect(() => {
    if (radarRef.current && discoveredDevices.length > 0) {
      gsap.to(radarRef.current, {
        duration: 2,
        repeat: -1,
        opacity: 0.5,
        ease: 'sine.inOut',
      });
    }
  }, [discoveredDevices.length]);

  // Animate theme toggle
  const handleThemeToggle = () => {
    const button = document.querySelector('[data-theme-button]');
    if (button) {
      gsap.to(button, {
        rotation: 180,
        duration: 0.5,
        ease: 'back.out',
      });
    }
    toggleTheme();
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-3 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing</p>
        </div>
      </div>
    );
  }

  const toggleMode = () => {
    const newMode = mode === 'receive' ? 'send' : 'receive';
    gsap.to('[data-mode-toggle]', {
      scale: 0.95,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
    });
    setDeviceMode(newMode);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await selectFilesToSend(files);
      // Reset file input so the same file can be selected again
      e.target.value = '';
      gsap.to('[data-file-input]', {
        scale: 1.05,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
      });
    }
  };

  const handleSendFiles = (deviceId) => {
    setSelectedRecipient(deviceId);
    const radarElement = document.querySelector(`[data-device-bubble="${deviceId}"]`);
    if (radarElement) {
      gsap.to(radarElement, {
        scale: 1.2,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
      });
    }

    // Send files and clear state after sending
    sendFiles(deviceId);

    // Reset selected recipient after a brief delay
    setTimeout(() => {
      setSelectedRecipient(null);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300" ref={containerRef}>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">MIS-FS</h1>
          </div>

          {/* Current device name badge */}
          {deviceInfo.name && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 max-w-[180px] truncate">
                {deviceInfo.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              data-theme-button
              onClick={handleThemeToggle}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-yellow-500" />
              ) : (
                <Moon className="w-4 h-4 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </nav>

      {/* Active Transfers */}
      {activeTransfers.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Transfers
            </h3>
            <div className="space-y-3">
              {activeTransfers.map((transfer) => {
                const speed = transferSpeeds[transfer.id] || '0.0';
                const statusText = {
                  preparing: 'Preparing',
                  encoding: 'Encoding',
                  sending: 'Sending',
                  receiving: 'Receiving',
                  completed: 'Completed',
                  error: 'Error',
                  downloading: 'Downloading',
                }[transfer.status] || transfer.status;

                return (
                  <div key={transfer.id} className="bg-white dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {transfer.type === 'send' && (
                          <ArrowUpRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                        {transfer.type === 'receive' && (
                          <ArrowDownLeft className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {transfer.filename}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {transfer.type === 'send' && transfer.to && `To: ${transfer.to}`}
                            {transfer.type === 'receive' && transfer.sender && `From: ${transfer.sender}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {transfer.progress}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {speed} KB/s
                          </p>
                        </div>
                        {transfer.canCancel && (
                          <button
                            onClick={() => cancelTransfer(transfer.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${transfer.type === 'send'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600'
                          }`}
                        style={{ width: `${transfer.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {mode === 'send' ? (
          <div className="space-y-10">
            {/* File Selection */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
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
                data-file-input
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer group"
              >
                <FileIcon className="w-12 h-12 text-gray-400 mx-auto mb-4 group-hover:text-blue-500 transition-colors" />
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Select files to share
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  or drag and drop
                </p>
              </button>
            </div>

            {/* Selected Files */}
            {filesToSend.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  Files ({filesToSend.length})
                </h2>

                <div className="space-y-2 mb-8">
                  {filesToSend.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-white dark:bg-gray-700/50 rounded-lg flex justify-between items-center"
                    >
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {f.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(f.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFileToSend(f.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors flex-shrink-0 ml-2"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>

                {discoveredDevices.length === 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      No devices in receive mode. Switch other devices to receive mode.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      Send to device:
                    </p>

                    {/* Device Card List */}
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {discoveredDevices.map((device) => (
                        <button
                          key={device.id}
                          id={`device-send-${device.id}`}
                          data-device-bubble={device.id}
                          onClick={() => handleSendFiles(device.id)}
                          className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-700/50 rounded-xl border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 group text-left"
                        >
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white font-bold text-lg select-none">
                              {device.name.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Name & status */}
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                              {device.name}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                              Ready to receive
                            </p>
                          </div>

                          {/* Send button */}
                          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-500 group-hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors">
                            <Send className="w-3.5 h-3.5" />
                            Send
                          </div>
                        </button>
                      ))}
                    </div>

                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
                      {discoveredDevices.length} device{discoveredDevices.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                )}
              </div>
            )}

            {discoveredDevices.length > 0 && filesToSend.length === 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-10 text-center border border-blue-200 dark:border-blue-800">
                <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <p className="text-blue-900 dark:text-blue-100 text-lg font-semibold">
                  {discoveredDevices.length} device ready
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-2 text-sm">
                  Select files to start sharing
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Receive Status */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-12 text-center border border-green-200 dark:border-green-800">
              <Inbox className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                Ready to Receive
              </h2>
              {/* Your device name — share this so senders can identify you */}
              {deviceInfo.name && (
                <div className="inline-flex items-center gap-2.5 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700 rounded-full px-5 py-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-bold text-green-800 dark:text-green-200 tracking-wide">
                    {deviceInfo.name}
                  </span>
                </div>
              )}
              <p className="text-green-700 dark:text-green-200 max-w-md mx-auto text-sm">
                Tell the sender to look for <strong className="font-semibold">{deviceInfo.name}</strong> and click Send
              </p>
            </div>

            {/* Received Files */}
            {filesReceived.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
                <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                  Waiting for files
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  Files will appear here when shared
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <Download className="w-6 h-6 text-blue-500" />
                  Received ({filesReceived.length})
                </h2>

                <div className="space-y-2">
                  {filesReceived.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 bg-white dark:bg-gray-700/50 rounded-lg flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)} • From: {file.receivedFrom}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => downloadReceivedFile(file.id, file.filename, file.data)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => removeReceivedFile(file.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-red-500" />
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

      {/* Mode Toggle - Floating */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg border border-gray-200 dark:border-gray-700">
        <button
          data-mode-toggle
          onClick={toggleMode}
          disabled={filesToSend.length > 0 && mode === 'send'}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all duration-300 ${mode === 'send'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          <Send className="w-4 h-4" />
          Send
        </button>
        <button
          onClick={toggleMode}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all duration-300 ${mode === 'receive'
            ? 'bg-green-500 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          <Inbox className="w-4 h-4" />
          Receive
        </button>
      </div>
    </div>
  );
}
