import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  Flashlight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Keyboard,
  SwitchCamera,
} from 'lucide-react';
import { parseDocQevriloQrPayload } from '../../utils/qrCodeParser';

export default function UnlockQrScannerModal({ isOpen, onClose, onScanSuccess, onFallbackManual }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastScanAttemptRef = useRef(0);
  const scannedLockRef = useRef(false);

  const [permissionState, setPermissionState] = useState('requesting'); // 'requesting' | 'active' | 'success' | 'denied' | 'unavailable' | 'in_use' | 'unsupported' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [scanWarning, setScanWarning] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedPreview, setScannedPreview] = useState('');

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (_) {}
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose?.();
  }, [stopCamera, onClose]);

  const startCamera = useCallback(
    async (deviceIdOverride = '') => {
      stopCamera();
      scannedLockRef.current = false;
      setPermissionState('requesting');
      setErrorMessage('');
      setScanWarning('');
      setScannedPreview('');

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setPermissionState('unsupported');
        setErrorMessage('Camera access requires HTTPS (or localhost). Please open DocQevrilo over HTTPS.');
        return;
      }

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        setPermissionState('unsupported');
        setErrorMessage('This browser does not support camera access via MediaDevices API. Use manual code entry instead.');
        return;
      }

      const primaryConstraints = {
        audio: false,
        video: deviceIdOverride
          ? { deviceId: { exact: deviceIdOverride }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (err) {
        if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          } catch (fallbackErr) {
            err = fallbackErr;
          }
        }
        if (!stream) {
          const name = err?.name || '';
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            setPermissionState('denied');
            setErrorMessage('Camera permission was denied. Allow camera access in your browser settings and retry.');
          } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            setPermissionState('unavailable');
            setErrorMessage('No camera was detected on this device.');
          } else if (name === 'NotReadableError' || name === 'TrackStartError') {
            setPermissionState('in_use');
            setErrorMessage('Camera is already in use by another application or browser tab.');
          } else {
            setPermissionState('error');
            setErrorMessage(err?.message || 'Unable to start camera preview.');
          }
          return;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (_) {}
      }

      // Inspect torch capability & active deviceId
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings?.() || {};
        if (settings.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
        const caps = videoTrack.getCapabilities?.() || {};
        setTorchSupported(Boolean(caps.torch));
      }

      // Enumerate available cameras (labels are populated now that permission is granted)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevices);
      } catch (_) {}

      setPermissionState('active');

      // Start local QR decoding loop (pure in-browser, never sends frames to server)
      const scanFrame = (timestamp) => {
        if (scannedLockRef.current || !streamRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState >= 2 && video.videoWidth > 0 && timestamp - lastScanAttemptRef.current >= 140) {
          lastScanAttemptRef.current = timestamp;
          const maxDim = 640;
          const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
          const w = Math.max(1, Math.floor(video.videoWidth * scale));
          const h = Math.max(1, Math.floor(video.videoHeight * scale));
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const decoded = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
            if (decoded?.data) {
              const parsed = parseDocQevriloQrPayload(decoded.data);
              if (parsed.ok) {
                scannedLockRef.current = true;
                setPermissionState('success');
                setScannedPreview(parsed.code);
                setScanWarning('');
                stopCamera();
                setTimeout(() => {
                  onScanSuccess?.(parsed);
                }, 320);
                return;
              } else {
                setScanWarning(parsed.error || 'Unsupported QR code detected.');
              }
            }
          }
        }

        rafRef.current = requestAnimationFrame(scanFrame);
      };

      rafRef.current = requestAnimationFrame(scanFrame);
    },
    [stopCamera, onScanSuccess]
  );

  useEffect(() => {
    if (isOpen) {
      startCamera('');
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (_) {
      setTorchSupported(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="QR Code Scanner"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0B0B0D]/95 border border-[#27272A] shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Scan Unlock QR Code</h3>
              <p className="text-[11px] text-zinc-400">Processed locally in your browser</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                permissionState === 'active'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : permissionState === 'success'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                  : permissionState === 'requesting'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  : 'bg-red-950/60 border-red-500/40 text-red-300'
              }`}
            >
              {permissionState === 'requesting' && 'Requesting Camera'}
              {permissionState === 'active' && 'Camera Active'}
              {permissionState === 'success' && 'QR Detected'}
              {permissionState === 'denied' && 'Permission Denied'}
              {permissionState === 'unavailable' && 'No Camera'}
              {permissionState === 'in_use' && 'Camera Busy'}
              {permissionState === 'unsupported' && 'Unsupported'}
              {permissionState === 'error' && 'Camera Error'}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport / Status Area */}
        <div className="p-5 space-y-4">
          <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${permissionState === 'active' ? 'opacity-100' : 'opacity-20'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning Reticle */}
            {permissionState === 'active' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-52 h-52 relative">
                  <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-[#E11D2E] rounded-tl-xl" />
                  <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-[#E11D2E] rounded-tr-xl" />
                  <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-[#E11D2E] rounded-bl-xl" />
                  <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-[#E11D2E] rounded-br-xl" />
                  <div className="absolute inset-x-3 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#E11D2E] to-transparent animate-pulse" />
                </div>
              </div>
            )}

            {/* Requesting State */}
            {permissionState === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-zinc-950/80 text-center px-5">
                <RefreshCw className="w-7 h-7 text-[#E11D2E] animate-spin" />
                <p className="text-xs font-semibold text-white">Requesting camera permission...</p>
                <p className="text-[11px] text-zinc-400">Allow camera access in your browser prompt.</p>
              </div>
            )}

            {/* Success State */}
            {permissionState === 'success' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-emerald-950/85 text-center px-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="text-sm font-bold text-white">QR Code Scanned!</p>
                <p className="text-xs font-mono text-emerald-200 bg-black/40 px-3 py-1 rounded-lg border border-emerald-500/30">
                  {scannedPreview}
                </p>
              </div>
            )}

            {/* Error States */}
            {['denied', 'unavailable', 'in_use', 'unsupported', 'error'].includes(permissionState) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 text-center px-5">
                <AlertCircle className="w-8 h-8 text-[#E11D2E]" />
                <p className="text-xs font-semibold text-white">{errorMessage}</p>
                {permissionState === 'denied' && (
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Click the lock/camera icon in your browser address bar → set <strong>Camera</strong> to <strong>Allow</strong>, then click Retry.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Scan Instruction or Invalid QR Warning */}
          {scanWarning ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-700/40 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{scanWarning}</span>
            </div>
          ) : (
            <p className="text-center text-xs text-zinc-400">
              Point your camera at a DocQevrilo Share QR code or Transfer ID QR code.
            </p>
          )}

          {/* Controls: Camera Selector & Flashlight */}
          {(cameras.length > 1 || torchSupported) && (
            <div className="flex items-center gap-2">
              {cameras.length > 1 && (
                <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                  <SwitchCamera className="w-4 h-4 text-zinc-400 shrink-0" />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      startCamera(e.target.value);
                    }}
                    className="w-full bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                    aria-label="Select camera"
                  >
                    {cameras.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId} className="bg-zinc-900 text-white">
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    torchOn
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Flashlight className="w-3.5 h-3.5" />
                  <span>{torchOn ? 'Light On' : 'Flashlight'}</span>
                </button>
              )}
            </div>
          )}

          {/* Privacy & Manual Fallback Footer */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Zero video sent to server</span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onFallbackManual?.();
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Enter Manually</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
