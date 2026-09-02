import React, { memo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    MessageSquare,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import CoachChat from '../CoachChat';
import { db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ChatParticipant {
    id: string;
    name?: string;
    childName?: string;
}

interface MessagesTabProps {
    selectedStudentForChat: ChatParticipant | null;
    setSelectedStudentForChat: (student: ChatParticipant | null) => void;
    handleContactParent: (person: ChatParticipant) => void;
    activeChats: ChatParticipant[];
    user: any;
    userProfile: any;
}

const MessagesTab: React.FC<MessagesTabProps> = ({
    selectedStudentForChat,
    setSelectedStudentForChat,
    handleContactParent,
    activeChats,
    user,
    userProfile
}) => {
    const [searchParams] = useSearchParams();
    const directChatId = searchParams.get('chatId');

    useEffect(() => {
        if (!directChatId) return;

        // 1. Check in activeChats
        const found = activeChats.find(c => c.id === directChatId);
        if (found) {
            setSelectedStudentForChat(found);
            return;
        }

        // 2. Fetch directly from Firestore
        const fetchChat = async () => {
            try {
                const snap = await getDoc(doc(db, 'chats', directChatId));
                if (snap.exists()) {
                    const data = snap.data();
                    const otherId = data.participants?.find((p: string) => p !== user?.uid);
                    const otherName = (data.participantNames && otherId && data.participantNames[otherId]) || data.childName || data.name || 'Родитель';
                    setSelectedStudentForChat({
                        id: otherId || directChatId,
                        name: otherName,
                        childName: data.childName
                    });
                }
            } catch (err) {
                console.error("Error fetching chat in MessagesTab:", err);
            }
        };

        fetchChat();
    }, [directChatId, activeChats, user?.uid, setSelectedStudentForChat]);
    return (
        <div className="space-y-6">
            {selectedStudentForChat ? (
                <div className="space-y-6">
                    <button
                        onClick={() => setSelectedStudentForChat(null)}
                        className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        <ArrowLeft size={14} /> Назад к списку
                    </button>
                    <CoachChat
                        user={user}
                        userProfile={userProfile}
                        otherUser={selectedStudentForChat}
                        isCoachViewing={true}
                    />
                </div>
            ) : (
                <div className="bg-card glass-panel border border-main rounded-[2.5rem] p-8 min-h-[600px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-russo text-white uppercase">Сообщения</h3>
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">
                                У вас {activeChats.length} активных диалогов
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {activeChats.length > 0 ? (
                            activeChats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => handleContactParent(chat)}
                                    className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:border-sparta-gold/30 transition-all cursor-pointer flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-field flex items-center justify-center font-russo text-white/20">
                                            {(chat.name || chat.childName || 'Ч').charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-sparta-gold transition-colors">{chat.name || chat.childName}</h4>
                                            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Перейти к диалогу</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-white/10 group-hover:text-sparta-gold transition-colors" />
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                                <MessageSquare size={48} className="mx-auto text-white/5 mb-4" />
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                                    Нет активных диалогов. Начните общение из списка учеников или заявок.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(MessagesTab);