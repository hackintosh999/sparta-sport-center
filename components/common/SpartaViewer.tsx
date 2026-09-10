import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Download, RotateCw, ZoomIn, ZoomOut, Printer, FileText,
    FileSpreadsheet, FileArchive, ExternalLink, Loader2, AlertCircle,
    RotateCcw, FileCode, Check, Info
} from 'lucide-react';

export interface SpartaViewerFile {
    url: string;
    name?: string;
    size?: number | string;
    type?: string;
    ext?: string;
}

export interface SpartaViewerProps {
    isOpen: boolean;
    onClose: () => void;
    file: SpartaViewerFile | null;
}

type FileCategory = 'image' | 'pdf' | 'office' | 'text' | 'archive' | 'other';

export const SpartaViewer: React.FC<SpartaViewerProps> = ({ isOpen, onClose, file }) => {
    const [rotation, setRotation] = useState<number>(0);
    const [scale, setScale] = useState<number>(1);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [textLoading, setTextLoading] = useState<boolean>(false);
    const [textError, setTextError] = useState<boolean>(false);
    const [isIframeLoaded, setIsIframeLoaded] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [printFit, setPrintFit] = useState<'fit-page' | 'original'>('fit-page');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Reset viewer state when file changes or closes
    useEffect(() => {
        if (isOpen) {
            setRotation(0);
            setScale(1);
            setTextContent(null);
            setTextLoading(false);
            setTextError(false);
            setIsIframeLoaded(false);
            setIsPrintModalOpen(false);
            setPrintOrientation('portrait');
            setPrintFit('fit-page');
        }
    }, [isOpen, file?.url]);

    // Keyboard listener for Escape and shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isPrintModalOpen) {
                    setIsPrintModalOpen(false);
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, isPrintModalOpen]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (!isOpen) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Parse file metadata & category
    const { cleanName, ext, category, badgeText, formattedSize } = useMemo(() => {
        if (!file?.url) {
            return { cleanName: 'Документ', ext: '', category: 'other' as FileCategory, badgeText: 'FILE', formattedSize: '' };
        }

        // Clean name
        let name = file.name || '';
        if (!name || name === 'Вложение' || name === 'file' || name === 'blob' || name === 'image') {
            try {
                const cleanUrl = file.url.split('?')[0].split('#')[0];
                const lastSegment = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
                if (lastSegment) {
                    const decoded = decodeURIComponent(lastSegment);
                    name = decoded.replace(/^\d+[-_]/, '');
                }
            } catch {
                name = 'Документ';
            }
        }
        if (!name) name = 'Документ';

        // Extract extension
        let fileExt = (file.ext || '').toLowerCase();
        if (!fileExt) {
            const cleanUrl = (name || file.url).split('?')[0].split('#')[0];
            const extMatch = cleanUrl.match(/\.([a-z0-9]+)$/i);
            if (extMatch) {
                fileExt = extMatch[1].toLowerCase();
            }
        }

        const mime = (file.type || '').toLowerCase();

        // Categorize
        const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'bmp', 'ico', 'avif'];
        const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'odt', 'ods', 'odp'];
        const textExtensions = ['txt', 'csv', 'log', 'json', 'md', 'xml', 'html', 'js', 'ts', 'css'];
        const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];

        let cat: FileCategory = 'other';
        if (mime.startsWith('image/') || imageExtensions.includes(fileExt)) {
            cat = 'image';
        } else if (fileExt === 'pdf' || mime.includes('pdf')) {
            cat = 'pdf';
        } else if (
            officeExtensions.includes(fileExt) ||
            mime.includes('officedocument') ||
            mime.includes('msword') ||
            mime.includes('ms-excel') ||
            mime.includes('powerpoint')
        ) {
            cat = 'office';
        } else if (mime.startsWith('text/') || textExtensions.includes(fileExt)) {
            cat = 'text';
        } else if (archiveExtensions.includes(fileExt)) {
            cat = 'archive';
        }

        // Format Size
        let sizeStr = '';
        if (typeof file.size === 'number' && file.size > 0) {
            if (file.size >= 1024 * 1024) {
                sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} МБ`;
            } else if (file.size >= 1024) {
                sizeStr = `${Math.round(file.size / 1024)} КБ`;
            } else {
                sizeStr = `${file.size} Б`;
            }
        } else if (typeof file.size === 'string' && file.size) {
            sizeStr = file.size;
        }

        const badge = (fileExt || (cat === 'image' ? 'IMG' : 'FILE')).toUpperCase();

        return {
            cleanName: name,
            ext: fileExt,
            category: cat,
            badgeText: badge,
            formattedSize: sizeStr
        };
    }, [file]);

    // Fetch text file content if category is text
    useEffect(() => {
        if (!isOpen || !file?.url || category !== 'text') return;

        let isMounted = true;
        const controller = new AbortController();
        setTextLoading(true);
        setTextError(false);

        fetch(file.url, { signal: controller.signal })
            .then(async res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(text => {
                if (isMounted) {
                    setTextContent(text);
                    setTextLoading(false);
                }
            })
            .catch(err => {
                if (err.name !== 'AbortError' && isMounted) {
                    setTextError(true);
                    setTextLoading(false);
                }
            });

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [isOpen, file?.url, category]);

    // Direct Download handler (via Blob to avoid new tab)
    const handleDownload = useCallback(async () => {
        if (!file?.url || isDownloading) return;
        setIsDownloading(true);
        try {
            const response = await fetch(file.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = cleanName || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        } catch (err) {
            console.warn('Direct blob download failed, falling back to direct link:', err);
            const link = document.createElement('a');
            link.href = file.url;
            link.download = cleanName || 'document';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } finally {
            setIsDownloading(false);
        }
    }, [file?.url, cleanName, isDownloading]);

    // Direct Print button opens the Print Setup Modal
    const handlePrint = useCallback(() => {
        if (!file?.url) return;
        setIsPrintModalOpen(true);
    }, [file?.url]);

    // Execute Print with selected modal parameters (orientation and scale)
    const executePrint = useCallback(() => {
        if (!file?.url) return;
        setIsPrintModalOpen(false);

        // 1. PDF inside iframe
        if (category === 'pdf') {
            const iframe = iframeRef.current;
            if (iframe && iframe.contentWindow) {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    return;
                } catch (err) {
                    console.warn('Direct PDF iframe print restricted, falling back:', err);
                }
            }
            const printWin = window.open(file.url, '_blank');
            if (printWin) printWin.focus();
            return;
        }

        // 2. Image files (hidden iframe with selected orientation and scaling)
        if (category === 'image') {
            const hiddenFrame = document.createElement('iframe');
            hiddenFrame.style.position = 'fixed';
            hiddenFrame.style.right = '0';
            hiddenFrame.style.bottom = '0';
            hiddenFrame.style.width = '0';
            hiddenFrame.style.height = '0';
            hiddenFrame.style.border = '0';
            hiddenFrame.style.opacity = '0';
            hiddenFrame.style.pointerEvents = 'none';
            document.body.appendChild(hiddenFrame);

            const frameDoc = hiddenFrame.contentWindow?.document;
            if (frameDoc) {
                const imgFitStyle = printFit === 'fit-page'
                    ? 'max-width: 100%; max-height: calc(100vh - 20mm); object-fit: contain;'
                    : 'max-width: 100%; object-fit: cover;';

                frameDoc.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>${cleanName}</title>
                            <style>
                                @page {
                                    size: ${printOrientation};
                                    margin: ${printFit === 'fit-page' ? '10mm' : '0'};
                                }
                                body {
                                    margin: 0;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    min-height: 100vh;
                                    background: #fff;
                                }
                                img {
                                    ${imgFitStyle}
                                }
                            </style>
                        </head>
                        <body>
                            <img src="${file.url}" />
                        </body>
                    </html>
                `);
                frameDoc.close();
                const img = frameDoc.querySelector('img');
                const triggerPrint = () => {
                    try {
                        hiddenFrame.contentWindow?.focus();
                        hiddenFrame.contentWindow?.print();
                    } catch (e) {
                        console.error('Image print error:', e);
                    } finally {
                        setTimeout(() => {
                            if (document.body.contains(hiddenFrame)) {
                                document.body.removeChild(hiddenFrame);
                            }
                        }, 2000);
                    }
                };
                if (img) {
                    if (img.complete) {
                        triggerPrint();
                    } else {
                        img.onload = triggerPrint;
                        img.onerror = triggerPrint;
                    }
                } else {
                    triggerPrint();
                }
            }
            return;
        }

        // 3. Text files (hidden iframe with selected orientation and scaling)
        if (category === 'text' && textContent) {
            const hiddenFrame = document.createElement('iframe');
            hiddenFrame.style.position = 'fixed';
            hiddenFrame.style.right = '0';
            hiddenFrame.style.bottom = '0';
            hiddenFrame.style.width = '0';
            hiddenFrame.style.height = '0';
            hiddenFrame.style.border = '0';
            hiddenFrame.style.opacity = '0';
            hiddenFrame.style.pointerEvents = 'none';
            document.body.appendChild(hiddenFrame);

            const frameDoc = hiddenFrame.contentWindow?.document;
            if (frameDoc) {
                const safeText = textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const fontSize = printFit === 'fit-page' ? '11px' : '13px';
                frameDoc.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>${cleanName}</title>
                            <style>
                                @page {
                                    size: ${printOrientation};
                                    margin: 15mm;
                                }
                                body {
                                    font-family: monospace;
                                    padding: 10px;
                                    color: #111;
                                    background: #fff;
                                    line-height: 1.5;
                                    font-size: ${fontSize};
                                }
                                h3 {
                                    margin-top: 0;
                                    font-size: 16px;
                                    border-bottom: 1px solid #ddd;
                                    padding-bottom: 8px;
                                }
                                pre {
                                    white-space: pre-wrap;
                                    font-size: inherit;
                                    font-family: inherit;
                                    word-break: break-word;
                                }
                            </style>
                        </head>
                        <body>
                            <h3>${cleanName}</h3>
                            <pre>${safeText}</pre>
                        </body>
                    </html>
                `);
                frameDoc.close();
                setTimeout(() => {
                    try {
                        hiddenFrame.contentWindow?.focus();
                        hiddenFrame.contentWindow?.print();
                    } catch (e) {
                        console.error('Text print error:', e);
                    } finally {
                        setTimeout(() => {
                            if (document.body.contains(hiddenFrame)) {
                                document.body.removeChild(hiddenFrame);
                            }
                        }, 2000);
                    }
                }, 300);
            }
            return;
        }

        // 4. Other formats fallback
        window.open(file.url, '_blank');
    }, [file?.url, category, cleanName, textContent, printOrientation, printFit]);

    // Copy text handler
    const handleCopyText = () => {
        if (!textContent) return;
        navigator.clipboard.writeText(textContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen || !file) return null;

    // Badge styling mapping
    const getBadgeStyle = () => {
        switch (ext) {
            case 'pdf':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'xls':
            case 'xlsx':
            case 'csv':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'doc':
            case 'docx':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'ppt':
            case 'pptx':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'zip':
            case 'rar':
            case '7z':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'txt':
            case 'log':
            case 'json':
                return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            default:
                return 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/30';
        }
    };

    // Google Docs Viewer URL for Office documents
    const googleDocsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={onClose}
                className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 select-none preserve-bg"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.88)' }}
            >
                {/* ─── TOP TOOLBAR ─── */}
                <header
                    className="w-full max-w-6xl z-[160] flex items-center justify-between gap-3 p-2.5 sm:p-3.5 bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left File Information */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                        <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[10px] sm:text-xs border shrink-0 ${getBadgeStyle()}`}>
                            {badgeText}
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-white font-bold text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[340px] md:max-w-[500px]" title={cleanName}>
                                {cleanName}
                            </h2>
                            {formattedSize && (
                                <p className="text-white/40 text-[10px] font-mono leading-none mt-0.5">
                                    {formattedSize}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Interactive Tools */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Image Specific Controls: Rotate, Zoom In, Zoom Out, Reset */}
                        {category === 'image' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setRotation(prev => (prev + 90) % 360)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 transition-all active:scale-95 cursor-pointer shadow-xs"
                                    title="Повернуть на 90° (RotateCw)"
                                >
                                    <RotateCw size={17} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScale(prev => Math.min(prev + 0.5, 3))}
                                    disabled={scale >= 3}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer shadow-xs"
                                    title="Приблизить"
                                >
                                    <ZoomIn size={17} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScale(prev => Math.max(prev - 0.5, 1))}
                                    disabled={scale <= 1}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer shadow-xs"
                                    title="Отдалить"
                                >
                                    <ZoomOut size={17} />
                                </button>
                                {(scale !== 1 || rotation !== 0) && (
                                    <button
                                        type="button"
                                        onClick={() => { setScale(1); setRotation(0); }}
                                        className="p-2 rounded-xl bg-sparta-gold/15 hover:bg-sparta-gold/25 text-sparta-gold border border-sparta-gold/30 transition-all active:scale-95 cursor-pointer shadow-xs hidden sm:flex items-center gap-1 text-xs font-semibold"
                                        title="Сбросить масштаб и поворот"
                                    >
                                        <RotateCcw size={15} />
                                        <span>Сброс</span>
                                    </button>
                                )}
                                <div className="w-px h-5 bg-white/15 mx-0.5 hidden sm:block" />
                            </>
                        )}

                        {/* Copy button for text content */}
                        {category === 'text' && textContent && (
                            <button
                                type="button"
                                onClick={handleCopyText}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 transition-all active:scale-95 cursor-pointer shadow-xs flex items-center gap-1"
                                title="Скопировать текст"
                            >
                                {copied ? <Check size={16} className="text-emerald-400" /> : <FileCode size={16} />}
                                <span className="text-xs hidden sm:inline">{copied ? 'Скопировано' : 'Копировать'}</span>
                            </button>
                        )}

                        {/* Direct Print Button */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 transition-all active:scale-95 cursor-pointer shadow-xs"
                            title="Распечатать документ"
                        >
                            <Printer size={17} />
                        </button>

                        {/* Direct Download Button */}
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="p-2 rounded-xl bg-sparta-gold hover:bg-sparta-gold/90 disabled:opacity-60 text-black font-bold transition-all active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5"
                            title="Скачать файл на устройство напрямую"
                        >
                            {isDownloading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
                            <span className="text-xs hidden sm:inline">{isDownloading ? 'Загрузка...' : 'Скачать'}</span>
                        </button>

                        <div className="w-px h-5 bg-white/15 mx-0.5" />

                        {/* Close Modal Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/10 hover:bg-red-500 text-white transition-all active:scale-95 cursor-pointer shadow-xs"
                            title="Закрыть просмотр (Escape)"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                {/* ─── MAIN CONTENT VIEWPORT ─── */}
                <main
                    className="flex-1 w-full max-w-6xl flex items-center justify-center py-3 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 1. IMAGE VIEWER */}
                    {category === 'image' && (
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                            <motion.img
                                key={file.url}
                                src={file.url}
                                alt={cleanName}
                                style={{
                                    transform: `rotate(${rotation}deg) scale(${scale})`,
                                    transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)'
                                }}
                                className="max-h-[78vh] max-w-[90vw] object-contain select-none shadow-2xl rounded-2xl cursor-grab active:cursor-grabbing border border-white/5"
                                draggable={false}
                                onDoubleClick={() => setScale(prev => (prev === 1 ? 2 : 1))}
                            />
                        </div>
                    )}

                    {/* 2. PDF VIEWER */}
                    {category === 'pdf' && (
                        <div className="w-full h-[78vh] bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                            <div className="flex-1 relative bg-[#222]">
                                <iframe
                                    ref={iframeRef}
                                    id="sparta-viewer-frame"
                                    src={`${file.url}#toolbar=0&navpanes=0&view=FitH`}
                                    title={cleanName}
                                    className="w-full h-full border-none"
                                />
                            </div>
                            <div className="p-2.5 sm:p-3 bg-[#111] border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                                <span>PDF-документ Sparta</span>
                                <div className="flex items-center gap-3">
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-sparta-gold flex items-center gap-1 transition-colors"
                                    >
                                        <ExternalLink size={13} />
                                        <span>Открыть в новой вкладке</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. OFFICE DOCUMENTS VIEWER (Word, Excel, PowerPoint) */}
                    {category === 'office' && (
                        <div className="w-full h-[78vh] bg-white rounded-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden">
                            <div className="flex-1 relative bg-slate-50">
                                {!isIframeLoaded && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500 bg-slate-50 z-10">
                                        <Loader2 size={32} className="animate-spin text-sparta-gold" />
                                        <p className="text-xs font-semibold">Загрузка документа через Google Docs Viewer...</p>
                                    </div>
                                )}
                                <iframe
                                    id="sparta-viewer-frame"
                                    src={googleDocsViewerUrl}
                                    title={cleanName}
                                    onLoad={() => setIsIframeLoaded(true)}
                                    className="w-full h-full border-none"
                                />
                            </div>
                            <div className="p-2.5 sm:p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
                                <span className="font-medium text-slate-600">
                                    Документ Microsoft Office / Таблица
                                </span>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        disabled={isDownloading}
                                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-60"
                                    >
                                        {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                        <span>{isDownloading ? 'Загрузка...' : 'Скачать оригинал'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. TEXT FILES VIEWER (txt, csv, log, json) */}
                    {category === 'text' && (
                        <div className="w-full h-[78vh] max-w-4xl bg-[#0d1117] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-300">
                            <div className="p-3 bg-[#161b22] border-b border-white/10 flex items-center justify-between text-xs text-slate-400">
                                <div className="flex items-center gap-2">
                                    <FileText size={15} className="text-sparta-gold" />
                                    <span className="font-mono">{cleanName}</span>
                                </div>
                                {textContent && (
                                    <span className="font-mono text-[11px] text-slate-500">
                                        {textContent.split('\n').length} строк · {textContent.length} символов
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text bg-[#0d1117]">
                                {textLoading && (
                                    <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
                                        <Loader2 size={28} className="animate-spin text-sparta-gold" />
                                        <span>Чтение файла...</span>
                                    </div>
                                )}
                                {textError && (
                                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-12 text-slate-400">
                                        <AlertCircle size={36} className="text-amber-400" />
                                        <p className="max-w-md text-xs">
                                            Прямое чтение файла в браузере заблокировано политикой CORS или файл недоступен.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleDownload}
                                            disabled={isDownloading}
                                            className="px-4 py-2 rounded-xl bg-sparta-gold text-black font-bold text-xs hover:bg-sparta-gold/90 transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-60"
                                        >
                                            {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                            <span>{isDownloading ? 'Загрузка...' : 'Скачать и открыть файл'}</span>
                                        </button>
                                    </div>
                                )}
                                {!textLoading && !textError && textContent && (
                                    <code>{textContent}</code>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 5. ARCHIVES & UNSUPPORTED FORMATS */}
                    {(category === 'archive' || category === 'other') && (
                        <div className="p-6 sm:p-8 max-w-md w-full bg-[#141414] border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95">
                            <div className="w-16 h-16 rounded-2xl bg-sparta-gold/15 text-sparta-gold border border-sparta-gold/30 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                                {category === 'archive' ? <FileArchive size={32} /> : <FileText size={32} />}
                            </div>

                            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border mb-2 ${getBadgeStyle()}`}>
                                {badgeText}
                            </span>

                            <h3 className="text-white font-bold text-base sm:text-lg mb-1 line-clamp-2" title={cleanName}>
                                {cleanName}
                            </h3>

                            {formattedSize && (
                                <p className="text-white/40 text-xs font-mono mb-4">
                                    Размер файла: {formattedSize}
                                </p>
                            )}

                            <p className="text-white/60 text-xs leading-relaxed mb-6">
                                {category === 'archive'
                                    ? 'Архивы (ZIP/RAR) не могут быть распакованы в браузере. Скачайте архив, чтобы извлечь его содержимое.'
                                    : 'Данный формат не поддерживается для прямого предпросмотра в браузере. Вы можете скачать файл на своё устройство.'}
                            </p>

                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="w-full py-3 px-5 rounded-2xl bg-sparta-gold hover:bg-sparta-gold/90 disabled:opacity-60 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                                {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                <span>{isDownloading ? 'Загрузка...' : `Скачать файл (${badgeText})`}</span>
                            </button>
                        </div>
                    )}
                </main>

                {/* ─── FOOTER HINT ─── */}
                <footer className="w-full text-center py-1 text-white/30 text-[10px] uppercase font-mono tracking-widest pointer-events-none">
                    Sparta Viewer • Нажмите Escape или кликните в любое свободное место для закрытия
                </footer>

                {/* ─── PRINT PREVIEW / SETUP MODAL ─── */}
                <AnimatePresence>
                    {isPrintModalOpen && (
                        <div
                            className="fixed inset-0 z-[170] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setIsPrintModalOpen(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                transition={{ duration: 0.15 }}
                                className="bg-[#1a1a1a] border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-md text-white flex flex-col gap-5 select-text"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-sparta-gold/15 text-sparta-gold border border-sparta-gold/30">
                                            <Printer size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base sm:text-lg text-white">Печать документа</h3>
                                            <p className="text-xs text-white/50 truncate max-w-[200px] sm:max-w-[260px]" title={cleanName}>
                                                {cleanName}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPrintModalOpen(false)}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                                        title="Закрыть"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Settings Parameters */}
                                <div className="space-y-4 text-sm">
                                    {/* Page Orientation */}
                                    <div>
                                        <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                            Ориентация страницы
                                        </label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setPrintOrientation('portrait')}
                                                className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                                                    printOrientation === 'portrait'
                                                        ? 'bg-sparta-gold/15 border-sparta-gold text-white shadow-[0_0_15px_rgba(212,175,55,0.15)] font-semibold'
                                                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-5 rounded-[2px] border-2 transition-colors ${
                                                    printOrientation === 'portrait' ? 'border-sparta-gold' : 'border-white/40'
                                                }`} />
                                                <span className="text-xs">Книжная</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPrintOrientation('landscape')}
                                                className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                                                    printOrientation === 'landscape'
                                                        ? 'bg-sparta-gold/15 border-sparta-gold text-white shadow-[0_0_15px_rgba(212,175,55,0.15)] font-semibold'
                                                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className={`w-5 h-3.5 rounded-[2px] border-2 transition-colors ${
                                                    printOrientation === 'landscape' ? 'border-sparta-gold' : 'border-white/40'
                                                }`} />
                                                <span className="text-xs">Альбомная</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scaling Options */}
                                    <div>
                                        <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                            Масштаб
                                        </label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setPrintFit('fit-page')}
                                                className={`p-2.5 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                                                    printFit === 'fit-page'
                                                        ? 'bg-sparta-gold/15 border-sparta-gold text-white shadow-[0_0_15px_rgba(212,175,55,0.15)] font-semibold'
                                                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                                }`}
                                            >
                                                Вписать на лист А4
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPrintFit('original')}
                                                className={`p-2.5 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                                                    printFit === 'original'
                                                        ? 'bg-sparta-gold/15 border-sparta-gold text-white shadow-[0_0_15px_rgba(212,175,55,0.15)] font-semibold'
                                                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                                }`}
                                            >
                                                Оригинал 100%
                                            </button>
                                        </div>
                                    </div>

                                    {/* Print Notice / Hint */}
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs flex items-start gap-2.5">
                                        <Info size={16} className="text-sparta-gold shrink-0 mt-0.5" />
                                        <p className="leading-relaxed">
                                            Нажмите кнопку ниже, чтобы выбрать домашний принтер в системном окне или сохранить документ в PDF.
                                        </p>
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setIsPrintModalOpen(false)}
                                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="button"
                                        onClick={executePrint}
                                        className="px-5 py-2.5 rounded-xl bg-sparta-gold hover:bg-sparta-gold/90 text-black font-bold text-xs transition-all active:scale-95 shadow-md flex items-center gap-2 cursor-pointer"
                                    >
                                        <Printer size={15} />
                                        <span>Открыть системную печать</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpartaViewer;
