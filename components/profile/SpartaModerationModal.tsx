import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    X,
    AlertTriangle,
    CheckCircle2,
    Trash2
} from 'lucide-react';
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    limit
} from 'firebase/firestore';
import { db } from '../../firebase';
import { BaseModal } from '../ui/BaseModal';

export interface SpartaReport {
    id: string;
    targetType: 'story' | 'message' | 'comment';
    targetId: string;
    storyTitle?: string;
    authorId?: string;
    authorName?: string;
    reportedBy: string;
    reportedByName?: string;
    reason: string;
    status: 'pending' | 'resolved' | 'dismissed';
    createdAt?: any;
    previewText?: string;
}

interface SpartaModerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
    currentUserProfile?: any;
}

export const SpartaModerationModal: React.FC<SpartaModerationModalProps> = ({
    isOpen,
    onClose,
    currentUserId,
    currentUserProfile
}) => {
    const [reports, setReports] = useState<SpartaReport[]>([]);
    const [filterStatus, setFilterStatus] = useState<'pending' | 'resolved' | 'all'>('pending');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const q = query(
            collection(db, 'reports'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list: SpartaReport[] = [];
            snapshot.docs.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() } as SpartaReport);
            });
            setReports(list);
        }, (err) => {
            console.error("Reports subscription error:", err);
        });

        return () => unsub();
    }, [isOpen]);

    const filteredReports = reports.filter(r => {
        if (filterStatus === 'all') return true;
        return (r.status || 'pending') === filterStatus;
    });

    const pendingCount = reports.filter(r => (r.status || 'pending') === 'pending').length;

    const showToast = (msg: string) => {
        setActionMessage(msg);
        setTimeout(() => setActionMessage(null), 3000);
    };

    // 1. Delete reported story and resolve report
    const handleDeleteContent = async (report: SpartaReport) => {
        setActionLoading(report.id);
        try {
            if (report.targetType === 'story' && report.targetId) {
                await deleteDoc(doc(db, 'stories', report.targetId));
            }
            await updateDoc(doc(db, 'reports', report.id), {
                status: 'resolved',
                resolvedBy: currentUserId,
                resolvedByName: currentUserProfile?.full_name || 'Модератор',
                resolvedAt: serverTimestamp(),
                actionTaken: 'content_deleted'
            });
            showToast('Контент удален, жалоба закрыта');
        } catch (err) {
            console.error("Error deleting reported content:", err);
            showToast('Ошибка при удалении');
        } finally {
            setActionLoading(null);
        }
    };

    // 2. Dismiss report (False report)
    const handleDismissReport = async (report: SpartaReport) => {
        setActionLoading(report.id);
        try {
            await updateDoc(doc(db, 'reports', report.id), {
                status: 'dismissed',
                dismissedBy: currentUserId,
                dismissedByName: currentUserProfile?.full_name || 'Модератор',
                dismissedAt: serverTimestamp()
            });
            showToast('Жалоба отклонена');
        } catch (err) {
            console.error("Error dismissing report:", err);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-2xl"
            showCloseButton={false}
            noPadding
            glowColor="red"
            zIndex="z-[10000]"
        >
            <div className="relative w-full bg-[#121218] rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                            <Shield size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-russo text-white uppercase">Модерация и безопасность</h3>
                                {pendingCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black">
                                        {pendingCount} новых
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                Жалобы на контент, истории и сообщения
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterStatus('pending')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                filterStatus === 'pending'
                                    ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                                    : 'text-white/50 hover:text-white bg-white/5'
                            }`}
                        >
                            На рассмотрении ({pendingCount})
                        </button>
                        <button
                            onClick={() => setFilterStatus('resolved')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                filterStatus === 'resolved'
                                    ? 'bg-sparta-gold text-black shadow-md shadow-sparta-gold/30'
                                    : 'text-white/50 hover:text-white bg-white/5'
                            }`}
                        >
                            Рассмотренные
                        </button>
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                filterStatus === 'all'
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/50 hover:text-white bg-white/5'
                            }`}
                        >
                            Все жалобы ({reports.length})
                        </button>
                    </div>
                </div>

                {/* Toast */}
                <AnimatePresence>
                    {actionMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2"
                        >
                            <CheckCircle2 size={16} />
                            <span>{actionMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Report List */}
                <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1">
                    {filteredReports.length === 0 ? (
                        <div className="py-16 text-center text-white/30 flex flex-col items-center gap-3">
                            <CheckCircle2 size={42} className="text-emerald-400/50" />
                            <div>
                                <h4 className="text-white font-bold text-sm">Нет активных жалоб</h4>
                                <p className="text-xs text-white/40 mt-0.5">В клубе Sparta чисто и безопасно!</p>
                            </div>
                        </div>
                    ) : (
                        filteredReports.map(report => {
                            const isPending = (report.status || 'pending') === 'pending';
                            return (
                                <div
                                    key={report.id}
                                    className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-2xl p-4 transition-all space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                                                <AlertTriangle size={16} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-white font-bold text-xs">
                                                        Жалоба на историю: «{report.storyTitle || 'Публикация'}»
                                                    </h4>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                                        isPending
                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    }`}>
                                                        {isPending ? 'На рассмотрении' : 'Решено'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-white/40 mt-0.5">
                                                    Автор: <strong className="text-white/70">{report.authorName || 'Пользователь'}</strong> • Отправил: <span className="text-white/60">{report.reportedByName || 'Зритель'}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-[10px] text-white/40 shrink-0 font-medium">
                                            Недавно
                                        </span>
                                    </div>

                                    {/* Reason text */}
                                    <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-white/80">
                                        <span className="text-white/40 font-bold uppercase text-[9px] block mb-1">Причина жалобы:</span>
                                        {report.reason || 'Неподобающий контент или нарушение правил'}
                                    </div>

                                    {/* Action buttons (only for pending) */}
                                    {isPending && (
                                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                                            <button
                                                onClick={() => handleDismissReport(report)}
                                                disabled={actionLoading === report.id}
                                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
                                            >
                                                Отклонить (Ложная)
                                            </button>
                                            <button
                                                onClick={() => handleDeleteContent(report)}
                                                disabled={actionLoading === report.id}
                                                className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-500/20 transition-all cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                                <span>Удалить историю</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </BaseModal>
    );
};

export default SpartaModerationModal;
