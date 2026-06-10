import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { generateTOTPToken } from '../../utils/crypto';
import { QrCode, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface QRCodeDisplayProps {
  courseId: string;
  sessionId: string;
  qrSecret: string;
  isPaused?: boolean;
  onTokenGenerated?: (token: string) => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  courseId,
  sessionId,
  qrSecret,
  isPaused = false,
  onTokenGenerated,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [currentToken, setCurrentToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const updateQRCode = async () => {
    if (isPaused) return;

    try {
      setLoading(true);
      const now = Math.floor(Date.now() / 1000);
      const { token, windowId } = await generateTOTPToken(courseId, sessionId, qrSecret, now);
      
      setCurrentToken(token);
      if (onTokenGenerated) {
        onTokenGenerated(token);
      }

      // Payload contains everything the student needs to submit and validate
      const payload = JSON.stringify({
        courseId,
        sessionId,
        token,
        windowId,
      });

      // Generate base64 QR Code URL
      const url = await QRCode.toDataURL(payload, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e293b', // slate-800
          light: '#ffffff',
        },
      });

      setQrCodeUrl(url);
      setError(null);
    } catch (err: any) {
      console.error('Error generating QR code:', err);
      setError('Could not generate crypto sequence.');
    } finally {
      setLoading(false);
    }
  };

  // Re-run on mount or dependency changes
  useEffect(() => {
    updateQRCode();
    
    // Setup 15s sync interval matching TOTP rotation
    const qrInterval = setInterval(() => {
      updateQRCode();
    }, 15000);

    return () => clearInterval(qrInterval);
  }, [courseId, sessionId, qrSecret, isPaused]);

  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-white border border-slate-200 shadow-lg rounded-2xl relative overflow-hidden" id="qr-code-display-node">
      {/* Visual background ripple if active */}
      {!isPaused && !loading && (
        <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
      )}

      {/* Course Session Badges */}
      <div className="flex flex-col gap-0.5 items-center text-center">
        <span className="text-[10px] tracking-widest font-bold uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-blue-600" />
          <span>CRYPTO ROTATION SYSTEM ACTIVE</span>
        </span>
      </div>

      {/* QR Box with absolute loaders */}
      <div className="w-56 h-56 relative bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-center p-2 shadow-inner select-none">
        {loading && !qrCodeUrl ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <QrCode className="w-12 h-12 animate-pulse" />
            <span className="text-xs font-mono">Securing canal...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-red-500 text-center p-3">
            <ShieldAlert className="w-12 h-12" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        ) : isPaused ? (
          <div className="flex flex-col items-center gap-2 text-slate-400 text-center p-4">
            <QrCode className="w-16 h-16 opacity-40" />
            <span className="text-xs font-semibold uppercase bg-slate-200 text-slate-600 px-3 py-1 rounded-full">
              Session Paused
            </span>
          </div>
        ) : (
          <motion.img
            src={qrCodeUrl}
            alt="Dynamic Scannable Attendance Link"
            className="w-full h-full object-contain rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Safe display token keys */}
      {!isPaused && currentToken && (
        <div className="flex flex-col gap-1 w-full text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Current Dynamic Handshake Key
          </span>
          <code className="text-xs font-mono bg-slate-50 border border-slate-200 text-blue-600 font-bold px-3 py-1.5 rounded-lg select-all shadow-inner block max-w-xs mx-auto truncate">
            {currentToken.substring(0, 16)}...
          </code>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
