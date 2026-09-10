import React from 'react';
import { X, FileText } from 'lucide-react';
import { BaseModal } from './ui/BaseModal';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    title: string;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ isOpen, onClose, pdfUrl, title }) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-3xl"
            showCloseButton={false}
            noPadding
            glowColor="amber"
            zIndex="z-[110]"
        >
            <div className="relative w-full bg-[#0a0a0a] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh]">
                <div className="p-4 sm:p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0">
                            <FileText size={18} className="sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg md:text-xl font-russo text-white uppercase tracking-wider truncate">{title}</h3>
                            <p className="text-white/40 text-[9px] sm:text-[10px] uppercase font-black tracking-widest mt-0.5 sm:mt-1">Официальный документ</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0 cursor-pointer ml-2"
                    >
                        <X size={18} className="sm:w-6 sm:h-6" />
                    </button>
                </div>

                <div className="p-3 sm:p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar w-full">
                    <div className="w-full h-[50vh] sm:h-[60vh] rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-white shadow-inner relative">
                        <iframe
                            src={`${pdfUrl}#view=FitH&toolbar=0`}
                            className="absolute inset-0 w-full h-full border-none"
                            title={title}
                        />
                    </div>
                </div>

                <div className="p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-center shrink-0">
                    <p className="text-white/30 text-[9px] sm:text-[10px] uppercase tracking-widest font-black text-center">
                        Sparta Sports Center • Legal Framework
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default DocumentViewerModal;