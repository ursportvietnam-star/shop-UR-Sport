import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, MoreHorizontal, User, Globe, Image as ImageIcon, QrCode as QrCodeIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (!document.getElementById('qr-reader')) return;
        
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
        
        const screenWidth = window.innerWidth;
        const qrboxSize = screenWidth < 400 ? 250 : 300;

        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: window.innerHeight / window.innerWidth
          },
          (decodedText) => {
            if (scannerRef.current) {
              scannerRef.current.stop().then(() => {
                scannerRef.current?.clear();
                onScanSuccess(decodedText);
                onClose();
              }).catch(console.error);
            }
          },
          (errorMessage) => {
            // ignore scan errors, they happen continuously until a QR code is detected
          }
        ).then(() => {
          setIsScanning(true);
        }).catch((err) => {
          console.error("Camera start failed", err);
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current && isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(console.error);
        }
      };
    } else {
      setIsScanning(false);
    }
  }, [isOpen, onClose, onScanSuccess]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed inset-0 z-[100] bg-zinc-950 text-white flex flex-col"
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-safe pointer-events-auto">
            <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white transition-all active:scale-90">
              <X className="h-5 w-5" />
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-sm font-semibold transition-all active:scale-95">
              <User className="h-4 w-4" />
              Mã QR của tôi
            </button>

            <button className="h-10 w-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white transition-all active:scale-90">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* Camera Container */}
          <div className="relative flex-1 overflow-hidden flex items-center justify-center">
             <div id="qr-reader" className="w-full h-full object-cover"></div>
             
             {/* Overlay Content */}
             <div className="absolute inset-0 flex flex-col items-center pointer-events-none">
                {/* Space to push content above the scanner box */}
                {/* By default Html5Qrcode creates the overlay, we just put absolute text */}
                <div className="absolute top-1/2 -translate-y-[220px] w-full flex flex-col items-center">
                  <h3 className="text-sm font-semibold mb-4 text-white/90 drop-shadow-md">Quét mọi mã QR</h3>
                  <div className="flex items-center gap-6">
                    {/* VietQR */}
                    <div className="flex items-center gap-1 opacity-90 drop-shadow-md">
                        <span className="font-bold text-lg tracking-tighter">VIETQR</span>
                    </div>
                    {/* Website */}
                    <div className="flex items-center gap-1 opacity-90 drop-shadow-md">
                        <Globe className="h-4 w-4" />
                        <span className="font-bold text-lg">website</span>
                    </div>
                    {/* Zalo */}
                    <div className="flex items-center opacity-90 drop-shadow-md">
                        <span className="font-bold text-lg">Zalo</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Bottom Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-around p-6 pb-safe pointer-events-auto bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12">
            <button className="flex flex-col items-center gap-2 transition-all active:scale-90">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5">
                <ImageIcon className="h-5 w-5 text-white/90" />
              </div>
              <span className="text-[11px] font-medium text-white/90">Ảnh có sẵn</span>
            </button>

            <button className="flex flex-col items-center gap-2 transition-all active:scale-90">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5">
                <QrCodeIcon className="h-5 w-5 text-red-400" />
              </div>
              <span className="text-[11px] font-medium text-white/90">QR chuyển khoản</span>
            </button>

            <button className="flex flex-col items-center gap-2 transition-all active:scale-90">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5">
                <Clock className="h-5 w-5 text-white/90" />
              </div>
              <span className="text-[11px] font-medium text-white/90">Gần đây</span>
            </button>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            #qr-reader { border: none !important; }
            #qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
            #qr-reader__dashboard_section_csr { display: none !important; }
            #qr-reader__dashboard_section_swaplink { display: none !important; }
          `}} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
