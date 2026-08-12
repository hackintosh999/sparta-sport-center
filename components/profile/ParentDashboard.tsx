import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, ChevronRight, Calendar,
    TrendingUp, Activity, MessageSquare, User,
    Trash2, AlertTriangle, Loader2, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getChildrenProfiles } from '../../services/userService';
import StatsSection from './StatsSection';
import AttendanceSection from './AttendanceSection';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Button } from '../UIComponents';
import { LinkChildModal } from './LinkChildModal';
import { unlinkChildFromParent } from '../../utils/studentLinking';

interface ParentDashboardProps {
    user: any;
    userProfile: any;
    onTabChange?: (tab: string) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ user, userProfile, onTabChange }) => {
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);


    useEffect(() => {
        const uniqueChildIds: string[] = Array.from(new Set(userProfile?.childrenIds || []));
        if (uniqueChildIds.length === 0) {
            setChildren([]);
            setLoading(false);
            return;
        }

        const unsubscribes: (() => void)[] = [];
        const childrenMap: { [id: string]: any } = {};

        uniqueChildIds.forEach((childId: string) => {
            const unsub = onSnapshot(doc(db, 'users', childId), (docSnap) => {
                if (docSnap.exists()) {
                    childrenMap[childId] = { id: docSnap.id, ...docSnap.data() };
                }
                const updatedChildren = Object.values(childrenMap);
                setChildren(updatedChildren);
                if (updatedChildren.length > 0) {
                    setSelectedChildId(prev => (prev && childrenMap[prev]) ? prev : updatedChildren[0].id);
                }
                setLoading(false);
            });
            unsubscribes.push(unsub);
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [userProfile?.childrenIds]);

    const activeChild = children.find(c => c.id === selectedChildId);

    const handleConfirmUnlink = async () => {
        if (!activeChild || !user?.uid) return;
        setIsUnlinking(true);
        try {
            const res = await unlinkChildFromParent(user.uid, activeChild.id);
            if (res.success) {
                setIsUnlinkModalOpen(false);
                const remaining = children.filter(c => c.id !== activeChild.id);
                if (remaining.length > 0) {
                    setSelectedChildId(remaining[0].id);
                } else {
                    setSelectedChildId(null);
                }
            }
        } catch (e) {
            console.error('Error unlinking child:', e);
        } finally {
            setIsUnlinking(false);
        }
    };


    if (loading) return <div className="flex items-center justify-center p-20 text-white/40">Загрузка семьи...</div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Family Selector */}
            <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                {children.map(child => (
                    <button
                        key={child.id}
                        onClick={() => setSelectedChildId(child.id)}
                        className={`group relative flex items-center gap-2.5 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-[2rem] border transition-all duration-500 ${selectedChildId === child.id ? 'bg-sparta-gold border-sparta-gold shadow-xl shadow-sparta-gold/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors ${selectedChildId === child.id ? 'bg-black/10 text-black' : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
                            <User size={18} />
                        </div>
                        <div className="text-left">
                            <p className={`text-[9px] sm:text-[10px] uppercase font-black tracking-widest ${selectedChildId === child.id ? 'text-black/50' : 'text-white/30'}`}>Спортсмен</p>
                            <p className={`text-xs sm:text-sm font-russo uppercase ${selectedChildId === child.id ? 'text-black' : 'text-white'}`}>{child.childName || child.childFirstName}</p>
                        </div>
                    </button>
                ))}

                <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="flex items-center gap-2.5 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-[2rem] border border-dashed border-white/20 hover:border-sparta-gold/50 hover:bg-sparta-gold/5 text-white/40 hover:text-sparta-gold transition-all group"
                >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/5 group-hover:bg-sparta-gold/10 flex items-center justify-center">
                        <Plus size={18} />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Привязать ребенка</span>
                </button>
            </div>

            {children.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-16 md:p-20 flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-sparta-gold/10 text-sparta-gold rounded-full flex items-center justify-center mb-6 sm:mb-8">
                        <Users size={36} />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-russo text-white mb-3 sm:mb-4 uppercase tracking-wider">Добро пожаловать в Спарту!</h3>
                    <p className="text-white/40 max-w-md text-sm sm:text-lg leading-relaxed mb-8 sm:mb-10 font-medium">
                        Укажите данные ребенка, чтобы привязать его к группе
                    </p>
                    <Button
                        onClick={() => setIsLinkModalOpen(true)}
                        className="px-6 py-4 sm:px-10 sm:py-5 text-xs sm:text-sm tracking-[0.2em]"
                    >
                        ПРИВЯЗАТЬ РЕБЕНКА
                    </Button>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {activeChild && (
                        <motion.div
                            key={activeChild.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6 sm:space-y-10"
                        >
                            {/* Child Quick Status Header */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                <div className="md:col-span-2 bg-gradient-to-br from-sparta-gold/20 to-transparent border border-sparta-gold/30 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 md:p-10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                                    <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6 sm:gap-8">
                                        <div className="flex items-center gap-4 sm:gap-6">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-sparta-gold rounded-2xl sm:rounded-[2rem] flex items-center justify-center text-black shadow-2xl shadow-sparta-gold/20 shrink-0">
                                                <User className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-russo text-white uppercase tracking-tighter mb-2">{activeChild.childName || activeChild.childFirstName}</h2>
                                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/10 rounded-full text-[9px] sm:text-[10px] font-black text-white/60 uppercase tracking-widest border border-white/10">
                                                        {activeChild.childAge} лет
                                                    </span>
                                                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-green-500/10 rounded-full text-[9px] sm:text-[10px] font-black text-green-500 uppercase tracking-widest border border-green-500/20 flex items-center gap-1.5">
                                                        <Activity size={12} />
                                                        Активен
                                                    </span>
                                                    <button
                                                        onClick={() => setIsUnlinkModalOpen(true)}
                                                        className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-red-500/20 flex items-center gap-1.5 transition-all"
                                                        title="Отвязать ребенка"
                                                    >
                                                        <Trash2 size={12} />
                                                        Отвязать
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center sm:text-right border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0">
                                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Текущий абонемент</p>
                                            <p className="text-lg sm:text-xl font-russo text-sparta-gold uppercase">{activeChild.subscription?.title || 'Без абонемента'}</p>
                                            <p className="text-xs text-white/40 font-bold mt-1">
                                                {activeChild.subscription?.expiresAt ? `До ${new Date(activeChild.subscription.expiresAt.seconds * 1000).toLocaleDateString()}` : 'Нет данных'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onTabChange?.('messages_unified')}
                                    className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold">
                                            <MessageSquare size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-0.5">Коммуникация</p>
                                            <span className="text-base font-russo text-white uppercase tracking-wider group-hover:text-sparta-gold transition-colors">Чат с тренером</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-white/20 group-hover:text-sparta-gold transition-colors" />
                                </button>
                            </div>

                            {/* Detailed Stats */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 ml-4">
                                    <TrendingUp size={20} className="text-sparta-gold" />
                                    <h3 className="text-2xl font-russo text-white uppercase tracking-wider">Успехи и динамика</h3>
                                </div>
                                <StatsSection
                                    userProfile={activeChild}
                                    orders={[]}
                                    requests={[]}
                                    isParentView={true}
                                />
                            </div>

                            {/* Attendance Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 ml-4">
                                    <Calendar size={20} className="text-sparta-gold" />
                                    <h3 className="text-2xl font-russo text-white uppercase tracking-wider">Посещаемость</h3>
                                </div>
                                <AttendanceSection userProfile={activeChild} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            <LinkChildModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                parentId={user.uid}
                parentName={userProfile?.parentName || userProfile?.displayName || user?.displayName || 'Родитель'}
                onSuccess={() => {
                    // Force refresh profile via context or local state if needed
                }}
            />

            {/* Unlink Child Confirmation Modal */}
            <AnimatePresence>
                {isUnlinkModalOpen && activeChild && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsUnlinkModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#0a0a0a] border border-red-500/20 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="relative z-10 space-y-6">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <button onClick={() => setIsUnlinkModalOpen(false)} className="p-2 text-white/30 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-russo text-white uppercase tracking-wider mb-2">Отвязать ребёнка</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">
                                        Вы действительно хотите отвязать профиль <span className="font-bold text-white uppercase">{activeChild.childName || activeChild.childFirstName}</span>? Вы потеряете доступ к его дневнику и статистике.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <button
                                        onClick={() => setIsUnlinkModalOpen(false)}
                                        disabled={isUnlinking}
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleConfirmUnlink}
                                        disabled={isUnlinking}
                                        className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-russo rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isUnlinking ? <Loader2 size={16} className="animate-spin" /> : 'Отвязать'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};