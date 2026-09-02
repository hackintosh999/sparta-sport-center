import React, { useState } from 'react';
import { X, Plus, Trash2, Send, BarChart2, RotateCcw } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { BaseModal } from '../ui/BaseModal';

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
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            showCloseButton={false}
            glowColor="blue"
            zIndex="z-[150]"
        >
            <div className="relative p-2">
                <button
                    onClick={onClose}
                    aria-label="Закрыть"
                    className="absolute top-2 right-2 p-2 text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold border border-sparta-gold/20 shrink-0">
                        <BarChart2 size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-russo text-white uppercase">Создать опрос</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Обратная связь от группы</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Ваш вопрос</label>
                        <textarea
                            required
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="О чем вы хотите спросить?"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all resize-none h-24 font-bold tracking-tight"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Варианты ответов</label>
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        required={index < 2}
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        placeholder={`Вариант ${index + 1}`}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-sparta-gold/50 outline-none transition-all font-bold tracking-tight"
                                    />
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(index)}
                                            className="p-2.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex-shrink-0 cursor-pointer"
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
                                className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 hover:text-sparta-gold hover:border-sparta-gold/40 hover:bg-sparta-gold/5 transition-all text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Plus size={14} /> Добавить вариант
                            </button>
                        )}
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-2xl bg-white/5 text-white/60 font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] py-3.5 rounded-2xl bg-sparta-gold text-black font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? <RotateCcw size={18} className="animate-spin" /> : <><Send size={16} /> Опубликовать</>}
                        </button>
                    </div>
                </form>
            </div>
        </BaseModal>
    );
};

export default CreatePollModal;