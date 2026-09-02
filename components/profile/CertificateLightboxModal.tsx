import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SpartanUnifiedAchievement } from '../../hooks/useStudentAchievements';
import { BaseModal } from '../ui/BaseModal';

interface CertificateLightboxModalProps {
    isOpen: boolean;
    onClose: () => void;
    certificate: SpartanUnifiedAchievement | null;
    studentName?: string;
}

export const CertificateLightboxModal: React.FC<CertificateLightboxModalProps> = ({
    isOpen,
    onClose,
    certificate,
    studentName = 'Чемпион Спарты'
}) => {
    const certRef = useRef<HTMLDivElement>(null);

    if (!certificate) return null;

    const formattedDate = certificate.unlockedAt
        ? (() => {
            try {
                const ts = typeof certificate.unlockedAt === 'number'
                    ? certificate.unlockedAt
                    : Date.parse(certificate.unlockedAt as string);
                if (isNaN(ts)) return 'В этом сезоне';
                return format(new Date(ts), 'd MMMM yyyy', { locale: ru });
            } catch {
                return 'В этом сезоне';
            }
        })()
        : 'В этом сезоне';

    const handleDownload = () => {
        // Trigger browser print or save
        window.print();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-2xl"
            customCard
            showCloseButton={false}
            glowColor="amber"
            zIndex="z-[350]"
        >
            <div className="relative w-full flex flex-col items-center space-y-4">
                {/* Top Action Bar */}
                <div className="w-full flex items-center justify-between px-2 text-white">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📜</span>
                        <span className="font-russo text-sm uppercase tracking-wider text-sparta-gold">
                            Официальный клубный диплом SPARTA
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="px-3.5 py-2 rounded-xl bg-sparta-gold hover:bg-yellow-400 text-black font-russo text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-sparta-gold/20 cursor-pointer font-black"
                        >
                            <Download size={14} />
                            <span>📥 Скачать грамоту</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Закрыть"
                            className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* DIPLOMA SHEET */}
                <div
                    ref={certRef}
                    className="w-full aspect-[1/1.38] sm:aspect-[1/1.35] bg-[#0f0e0c] border-4 border-sparta-gold rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden shadow-[0_0_60px_rgba(212,175,55,0.25)] flex flex-col justify-between"
                >
                    {/* Decorative Inner Golden Borders */}
                    <div className="absolute inset-3 border-2 border-sparta-gold/40 rounded-2xl pointer-events-none" />
                    <div className="absolute inset-4 border border-sparta-gold/20 rounded-xl pointer-events-none" />

                    {/* Background Watermark Crest */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                        <span className="text-[220px]">🛡️</span>
                    </div>

                    {/* Top: Academy Crest & Header */}
                    <div className="relative z-10 space-y-2 pt-2">
                        <div className="w-16 h-16 rounded-full border-2 border-sparta-gold/60 mx-auto flex items-center justify-center bg-black/60 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                            <span className="text-3xl">⚽</span>
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="font-russo text-xs sm:text-sm text-sparta-gold uppercase tracking-[0.25em]">
                                Футбольная Академия SPARTA
                            </h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">
                                Сертификат спортивных достижений
                            </p>
                        </div>
                    </div>

                    {/* Middle: Title & Awardee */}
                    <div className="relative z-10 space-y-4 my-auto py-4">
                        <div>
                            <span className="text-xs uppercase tracking-[0.3em] text-white/50 font-bold block mb-1">
                                Награждается
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-russo text-white tracking-wide border-b-2 border-sparta-gold/40 pb-2 inline-block px-6">
                                {studentName}
                            </h2>
                        </div>

                        <div className="space-y-2 max-w-md mx-auto">
                            <h4 className="text-lg sm:text-xl font-russo text-amber-300 uppercase tracking-wide">
                                «{certificate.title}»
                            </h4>
                            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans px-4">
                                {certificate.description}
                            </p>
                        </div>
                    </div>

                    {/* Bottom: Coach Seal & Signature */}
                    <div className="relative z-10 pt-4 border-t border-sparta-gold/30 flex items-end justify-between px-2 sm:px-6">
                        <div className="text-left space-y-1">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                                Дата вручения
                            </span>
                            <span className="text-xs font-bold text-white/90">
                                {formattedDate}
                            </span>
                        </div>

                        {/* Official Sparta Gold Stamp */}
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-sparta-gold/80 flex flex-col items-center justify-center text-center p-1 rotate-[-12deg] bg-amber-500/10 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                            <span className="text-[8px] font-black text-sparta-gold uppercase tracking-tighter">
                                SPARTA CLUB
                            </span>
                            <span className="text-sm">★</span>
                            <span className="text-[7px] font-bold text-amber-300 uppercase tracking-tighter">
                                ЗАВЕРЕНО
                            </span>
                        </div>

                        <div className="text-right space-y-1">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                                Главный тренер
                            </span>
                            <span className="text-xs font-bold text-amber-300">
                                {certificate.confirmedByCoach}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default CertificateLightboxModal;
