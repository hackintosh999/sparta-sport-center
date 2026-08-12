import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scannerRef.current.render(
            (decodedText) => {
                onScanSuccess(decodedText);
            },
            (error) => {
                if (onScanFailure) onScanFailure(error);
            }
        );

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            }
        };
    }, []);

    return (
        <div className="w-full max-w-md mx-auto overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
            <div id="reader" className="w-full"></div>
            <div className="p-4 bg-white/5 border-t border-white/5 text-center">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                    Поместите QR-код в рамку для сканирования
                </p>
            </div>

            <style>{`
                #reader {
                    border: none !important;
                }
                #reader__scan_region {
                    background: transparent !important;
                }
                #reader__dashboard_section_csr button {
                    background: #d4af37 !important;
                    color: black !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    font-size: 10px !important;
                    padding: 8px 16px !important;
                    border-radius: 12px !important;
                    border: none !important;
                    margin-top: 10px !important;
                    cursor: pointer !important;
                }
                #reader__dashboard_section_csr {
                  padding: 20px !important;
                }
                video {
                    border-radius: 20px !important;
                }
            `}</style>
        </div>
    );
};

export default QRScanner;