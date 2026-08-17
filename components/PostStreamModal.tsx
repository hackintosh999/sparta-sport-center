import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Download, Share2, Trash2, Globe, Film, X, Trophy, Sparkles, Copy, Check } from 'lucide-react';
import { Button } from './UIComponents';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc, getDocs } from 'firebase/firestore';

interface PostStreamModalProps {
    isOpen: boolean;
    onClose: () => void;
    recordedBlob: Blob | null;
    broadcastId: string | null;
    broadcastTitle: string;
    durationSeconds: number;
    scoreSparta?: number;
    scoreOpponent?: number;
    opponentName?: string;
    ageCategory?: string;
}

export const PostStreamModal: React.FC<PostStreamModalProps> = ({
    isOpen,
    onClose,
    recordedBlob,
    broadcastId,
    broadcastTitle,
    durationSeconds,
    scoreSparta = 0,
    scoreOpponent = 0,
    opponentName = 'Соперник',
    ageCategory = '2017-2018'
}) => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const recordedUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : null;

    const formatDuration = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m} мин ${s} сек`;
    };

    const handleDownload = () => {
        if (!recordedBlob) return;
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sparta-match-${broadcastTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePublishToArchive = async () => {
        if (!broadcastId) return;
        setIsPublishing(true);
        try {
            // Update broadcast status to finished in Firestore
            await updateDoc(doc(db, 'broadcasts', broadcastId), {
                status: 'finished',
                isLive: false,
                isScheduled: false,
                endedAt: serverTimestamp(),
                durationSeconds,
                videoUrl: recordedUrl || '', // Local URL or storage link
                scoreSparta,
                scoreOpponent
            });

            // Send notification to parents that recording is available
            const usersSnap = await getDocs(collection(db, 'users'));
            usersSnap.forEach((uDoc) => {
                const uData = uDoc.data();
                const childYear = uData.birthYear || (uData.childBirthYear ? Number(uData.childBirthYear) : null);
                const isMatch = ageCategory === 'all' || !childYear || ageCategory.includes(String(childYear));

                if (isMatch) {
                    addDoc(collection(db, 'notifications'), {
                        userId: uDoc.id,
                        email: uData.email || '',
                        title: `🎬 Запись матча доступна: ${broadcastTitle}`,
                        message: `Запись матча «${broadcastTitle}» опубликована на SPARTA TV в разделе «Архив записей». Приятного просмотра!`,
                        type: 'broadcast_archive',
                        broadcastId,
                        isRead: false,
                        createdAt: serverTimestamp()
                    }).catch(() => {});
                }
            });

            setIsPublished(true);
        } catch (e) {
            console.error('Error publishing recording to archive:', e);
            alert('Ошибка при публикации записи в архив');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCopyShareLink = () => {
        const shareUrl = `${window.location.origin}/broadcasts`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-manrope">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#111] rounded-3xl border border-sparta-gold/30 shadow-[0_0_80px_rgba(255,191,0,0.15)] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 bg-[#161616] border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sparta-gold/10 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold">
                                <Film size={20} />
                            </div>
                            <div>
                                <h3 className="font-russo text-xl text-white uppercase">ЭФИР ЗАВЕРШЁН</h3>
                                <p className="text-xs text-white/50">Длительность: {formatDuration(durationSeconds)}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/40 hover:text-white rounded-xl bg-white/5 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Video Preview */}
                        {recordedUrl && (
                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg">
                                <video
                                    src={recordedUrl}
                                    controls
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Match Result Card */}
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-sparta-gold font-bold uppercase">{ageCategory}</span>
                                <h4 className="font-russo text-base text-white">{broadcastTitle}</h4>
                            </div>
                            <div className="px-3.5 py-1.5 rounded-xl bg-black border border-sparta-gold/40 text-sparta-gold font-russo text-base font-black">
                                {scoreSparta} : {scoreOpponent}
                            </div>
                        </div>

                        {/* Action Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* 1. Publish to Archive */}
                            <button
                                onClick={handlePublishToArchive}
                                disabled={isPublishing || isPublished}
                                className={`p-4 rounded-2xl border transition-all flex items-center gap-3 text-left ${
                                    isPublished
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                        : 'bg-sparta-gold hover:bg-amber-300 text-black border-transparent shadow-[0_0_20px_rgba(255,191,0,0.2)]'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl ${isPublished ? 'bg-emerald-500 text-black' : 'bg-black text-sparta-gold'}`}>
                                    {isPublished ? <CheckCircle2 size={20} /> : <Globe size={20} />}
                                </div>
                                <div>
                                    <div className="font-bold text-xs uppercase">
                                        {isPublished ? 'Опубликовано на сайте' : 'Опубликовать в архив'}
                                    </div>
                                    <div className={`text-[11px] ${isPublished ? 'text-emerald-400/80' : 'text-black/70'}`}>
                                        Доступно родителям в записи
                                    </div>
                                </div>
                            </button>

                            {/* 2. Download File */}
                            <button
                                onClick={handleDownload}
                                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center gap-3 text-left"
                            >
                                <div className="p-2.5 rounded-xl bg-white/10 text-sparta-gold">
                                    <Download size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-xs uppercase">Скачать видеофайл</div>
                                    <div className="text-[11px] text-white/50">Сохранить запись на диск</div>
                                </div>
                            </button>

                            {/* 3. Share link */}
                            <button
                                onClick={handleCopyShareLink}
                                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center gap-3 text-left"
                            >
                                <div className="p-2.5 rounded-xl bg-white/10 text-amber-400">
                                    {copied ? <Check size={20} className="text-emerald-400" /> : <Share2 size={20} />}
                                </div>
                                <div>
                                    <div className="font-bold text-xs uppercase">
                                        {copied ? 'Ссылка скопирована!' : 'Поделиться с родителями'}
                                    </div>
                                    <div className="text-[11px] text-white/50">Отправить в Telegram / WhatsApp</div>
                                </div>
                            </button>

                            {/* 4. Close / Dismiss */}
                            <button
                                onClick={onClose}
                                className="p-4 rounded-2xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-white/60 hover:text-red-400 transition-all flex items-center gap-3 text-left"
                            >
                                <div className="p-2.5 rounded-xl bg-white/10 text-white/60">
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-xs uppercase">Закрыть окно</div>
                                    <div className="text-[11px] text-white/40">Завершить работу со студией</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
