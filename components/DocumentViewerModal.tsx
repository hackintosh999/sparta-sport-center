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
            <div className="relative w-full bg-[#0a0a0a] rounded-3xl overflow-hidden flex flex-col max-h-[88vh]">
                <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-russo text-white uppercase tracking-wider line-clamp-1">{title}</h3>
                            <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">Официальный документ</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0 cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto custom-scrollbar w-full">
                    <div className="w-full h-[60vh] rounded-2xl overflow-hidden border border-white/10 bg-white shadow-inner relative">
                        <iframe
                            src={`${pdfUrl}#view=FitH&toolbar=0`}
                            className="absolute inset-0 w-full h-full border-none"
                            title={title}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-center shrink-0">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest font-black text-center">
                        Sparta Sports Center • Legal Framework
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default DocumentViewerModal;