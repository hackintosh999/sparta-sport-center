import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Send, BarChart2, RotateCcw } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

interface CreatePollModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId?: string;
    chatId?: string;
    isUnifiedChat?: boolean;
    user: any;
    userProfile: any;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({ isOpen, onClose, groupId, chatId, isUnifiedChat, user, userProfile }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validOptions = options.filter(opt => opt.trim() !== '');
        if (!question.trim() || validOptions.length < 2 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // 1. Create poll document
            const pollRef = await addDoc(collection(db, 'group_polls'), {
                groupId: groupId || null,
                chatId: chatId || null,
                isUnifiedChat: !!isUnifiedChat,
                creatorId: user.uid,
                creatorName: userProfile?.full_name || userProfile?.childName || user.email || 'Пользователь',
                question: question.trim(),
                options: validOptions.map(text => ({ text, votes: [] })),
                createdAt: serverTimestamp(),
                closed: false
            });

            // 2. Send poll message to correct collection
            const messageData = {
                text: `📊 Опрос: ${question.trim()}`,
                senderId: user.uid,
                senderName: userProfile?.full_name || userProfile?.childName || user.email || 'Пользователь',
                senderAvatar: userProfile?.photoURL || null,
                timestamp: serverTimestamp(),
                type: 'poll',
                pollId: pollRef.id,
                senderRole: userProfile?.role || 'user',
                senderVerification: userProfile?.verification || null
            };

            if (isUnifiedChat && chatId) {
                await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

                // Update chat metadata
                const chatRef = doc(db, 'chats', chatId);
                await updateDoc(chatRef, {
                    lastMessage: `📊 Опрос: ${question.trim()}`,
                    lastMessageAt: serverTimestamp(),
                    lastMessageBy: user.uid
                });
            } else if (groupId) {
                await addDoc(collection(db, 'group_messages'), {
                    ...messageData,
                    groupId
                });
            }

            onClose();
            setQuestion('');
            setOptions(['', '']);
        } catch (error) {
            console.error("Error creating poll:", error);
            alert("Ошибка при создании опроса");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-lg bg-[#111] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
                >
                    <div className="relative p-8">
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold border border-sparta-gold/20">
                                <BarChart2 size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-russo text-white uppercase">Создать опрос</h3>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Обратная связь от группы</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Ваш вопрос</label>
                                <textarea
                                    required
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="О чем вы хотите спросить?"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all resize-none h-24 uppercase font-bold tracking-tight"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Варианты ответов</label>
                                <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-2">
                                    {options.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                required={index < 2}
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                                placeholder={`Вариант ${index + 1}`}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-sparta-gold/50 outline-none transition-all uppercase font-bold tracking-tight"
                                            />
                                            {options.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOption(index)}
                                                    className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all flex-shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {options.length < 10 && (
                                    <button
                                        type="button"
                                        onClick={handleAddOption}
                                        className="w-full py-3 rounded-xl border border-dashed border-white/10 text-white/20 hover:text-sparta-gold hover:border-sparta-gold/30 hover:bg-sparta-gold/5 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} /> Добавить вариант
                                    </button>
                                )}
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] py-4 rounded-2xl bg-sparta-gold text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <RotateCcw size={18} className="animate-spin" /> : <><Send size={18} /> Опубликовать</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreatePollModal;