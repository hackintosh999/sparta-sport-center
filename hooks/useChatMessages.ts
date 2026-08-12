import { useState, useEffect, useRef, useMemo } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../lib/supabase';
import { safeLocalStorage } from '../utils/storage';

export interface ChatUser {
    uid: string;
    email?: string | null;
    full_name?: string | null;
    childName?: string | null;
    role?: string | null;
    photoURL?: string | null;
    verification?: any;
}

export interface UseChatMessagesOptions {
    user: ChatUser;
    userProfile?: any;
    groupId?: string | null;
    chatId?: string | null;
    isUnifiedChat?: boolean;
    userPrefs?: any;
}

export function useChatMessages({
    user,
    userProfile,
    groupId,
    chatId,
    isUnifiedChat = false,
    userPrefs
}: UseChatMessagesOptions) {
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const deletedMsgIdsRef = useRef<Set<string>>(new Set());
    const storageKey = useMemo(() => {
        return `sparta_deleted_msgs_${chatId || groupId || 'global'}`;
    }, [chatId, groupId]);

    // Load initial deleted IDs from localStorage
    useEffect(() => {
        try {
            const stored = JSON.parse(safeLocalStorage.getItem(storageKey) || '[]');
            if (Array.isArray(stored)) {
                stored.forEach((id: string) => deletedMsgIdsRef.current.add(id));
            }
        } catch (e) {}
    }, [storageKey]);

    // Real-time Firestore Subscription
    useEffect(() => {
        if (!groupId && !chatId) return;

        setIsLoading(true);
        let messagesRef: any;
        let q: any;

        if (isUnifiedChat && chatId) {
            messagesRef = collection(db, 'chats', chatId, 'messages');
            q = query(messagesRef);
        } else if (groupId) {
            messagesRef = collection(db, 'group_messages');
            q = query(messagesRef, where('groupId', '==', groupId));
        } else {
            return;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let loadedMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id, // Always use real Firestore doc.id to guarantee accurate deletion
                    __source: isUnifiedChat && chatId ? 'unified' : 'legacy',
                    __chatId: chatId
                };
            }) as any[];

            // Sync persistent deleted IDs from localStorage
            try {
                const stored = JSON.parse(safeLocalStorage.getItem(storageKey) || '[]');
                if (Array.isArray(stored)) {
                    stored.forEach((id: string) => deletedMsgIdsRef.current.add(id));
                }
            } catch (e) {}

            // Filter soft-deleted and locally deleted messages
            loadedMessages = loadedMessages.filter(
                m => !m.isDeleted && !deletedMsgIdsRef.current.has(m.id)
            );

            // Filter out cleared messages if lastClearedAt is set
            if (userPrefs?.lastClearedAt) {
                const clearTime =
                    userPrefs.lastClearedAt.toMillis?.() ||
                    userPrefs.lastClearedAt.seconds * 1000 ||
                    0;
                loadedMessages = loadedMessages.filter(m => {
                    if (!m.timestamp) return true;
                    const msgTime =
                        m.timestamp.toMillis?.() || m.timestamp.seconds * 1000 || 0;
                    return msgTime > clearTime;
                });
            }

            const getMsgTime = (m: any) => {
                if (m.timestamp?.toMillis) return m.timestamp.toMillis();
                if (typeof m.timestamp?.seconds === 'number') return m.timestamp.seconds * 1000;
                if (m.createdAt?.toMillis) return m.createdAt.toMillis();
                if (typeof m.createdAt?.seconds === 'number') return m.createdAt.seconds * 1000;
                if (m.localTimestamp) return m.localTimestamp;
                return Date.now();
            };

            loadedMessages.sort((a, b) => getMsgTime(a) - getMsgTime(b));

            setMessages((prev: any[]) => {
                const pendingLocal = prev.filter((m: any) =>
                    typeof m.id === 'string' && (m.id.startsWith('local-') || m.id.startsWith('voice-'))
                );
                const unconfirmedPending = pendingLocal.filter((p: any) =>
                    !loadedMessages.some((l: any) =>
                        (l.id === p.id) ||
                        (l.text && l.text === p.text && l.senderId === p.senderId && Math.abs(getMsgTime(l) - getMsgTime(p)) < 15000)
                    )
                );
                const combined = [...loadedMessages, ...unconfirmedPending];
                combined.sort((a, b) => getMsgTime(a) - getMsgTime(b));
                return combined;
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [groupId, chatId, isUnifiedChat, userPrefs, storageKey]);

    // Send Text Message
    const sendTextMessage = async (text: string, replyTo?: any) => {
        if (!text.trim()) return;

        setIsSending(true);
        const senderName =
            userProfile?.full_name || userProfile?.childName || user.email || 'Пользователь';

        const msgPayload: any = {
            text: text.trim(),
            senderId: user.uid,
            senderName,
            senderRole: userProfile?.role || 'user',
            senderVerification: userProfile?.verification || null,
            senderAvatar: userProfile?.photoURL || null,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
            readBy: [user.uid],
            groupId: groupId || null,
            mediaUrl: null,
            mediaType: null,
            replyToId: replyTo?.id || null,
            replyToText: replyTo?.text || null,
            replyToSender: replyTo?.senderName || null,
            reactions: {}
        };

        try {
            const targetCol =
                isUnifiedChat && chatId
                    ? collection(db, 'chats', chatId, 'messages')
                    : collection(db, 'group_messages');

            await addDoc(targetCol, msgPayload);

            if (isUnifiedChat && chatId) {
                await updateDoc(doc(db, 'chats', chatId), {
                    lastMessage: text.trim(),
                    lastMessageAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastMessageBy: user.uid,
                    [`readBy.${user.uid}`]: serverTimestamp()
                }).catch(() => {});
            }
        } catch (err) {
            console.warn('Error sending text message, placing in local state:', err);
            setMessages(prev => [...prev, { ...msgPayload, id: `local-${Date.now()}` }]);
        } finally {
            setIsSending(false);
        }
    };

    // Send Media Files (Images, Videos, Documents)
    const sendMediaMessages = async (files: File[]) => {
        if (files.length === 0) return;

        setIsSending(true);
        setIsUploading(true);
        setUploadProgress(10);

        const senderName =
            userProfile?.full_name || userProfile?.childName || user.email || 'Пользователь';

        try {
            let count = 0;
            for (const file of files) {
                const stepProgress = 10 + (count / files.length) * 80;
                setUploadProgress(stepProgress);

                const path = isUnifiedChat ? `chats/${chatId}` : `messages/${groupId}`;
                const fileName = `${path}/${Date.now()}_${file.name}`;
                let publicUrl: string | null = null;

                try {
                    const { data, error } = await supabase.storage
                        .from('chat-media')
                        .upload(fileName, file);

                    if (!error && data) {
                        const { data: publicData } = supabase.storage
                            .from('chat-media')
                            .getPublicUrl(fileName);
                        publicUrl = publicData?.publicUrl || null;
                    }
                } catch (storageErr) {
                    console.warn('Supabase storage upload failed, using Base64 fallback:', storageErr);
                }

                if (!publicUrl) {
                    try {
                        publicUrl = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                        });
                    } catch (e) {
                        publicUrl = URL.createObjectURL(file);
                    }
                }

                setUploadProgress(stepProgress + 80 / files.length / 2);

                const mType = file.type.startsWith('image')
                    ? 'image'
                    : file.type.startsWith('video')
                    ? 'video'
                    : 'file';

                const mediaMsgPayload: any = {
                    text: '',
                    senderId: user.uid,
                    senderName,
                    senderRole: userProfile?.role || 'user',
                    senderVerification: userProfile?.verification || null,
                    senderAvatar: userProfile?.photoURL || null,
                    timestamp: serverTimestamp(),
                    groupId: groupId || null,
                    mediaUrl: publicUrl,
                    mediaType: mType,
                    reactions: {}
                };

                const targetCol =
                    isUnifiedChat && chatId
                        ? collection(db, 'chats', chatId, 'messages')
                        : collection(db, 'group_messages');

                try {
                    await addDoc(targetCol, mediaMsgPayload);
                } catch (firestoreErr) {
                    console.warn('Firestore write failed for media message, appending to local state:', firestoreErr);
                    setMessages(prev => [...prev, { ...mediaMsgPayload, id: `local-${Date.now()}` }]);
                }

                count++;
                setUploadProgress(10 + (count / files.length) * 80);

                if (isUnifiedChat && chatId) {
                    await updateDoc(doc(db, 'chats', chatId), {
                        lastMessage: mType === 'image' ? '🖼 Фото' : mType === 'video' ? '🎥 Видео' : '📄 Файл',
                        lastMessageAt: serverTimestamp(),
                        lastMessageBy: user.uid,
                        [`readBy.${user.uid}`]: serverTimestamp()
                    }).catch(() => {});
                }
            }
            setUploadProgress(100);
        } catch (error) {
            console.error('Error sending media files:', error);
        } finally {
            setIsSending(false);
            setIsUploading(false);
        }
    };

    // Send Voice Note
    const sendVoiceMessage = async (audioBlob: Blob, durationSeconds: number) => {
        setIsSending(true);
        let publicUrl: string | null = null;
        const fileName = `chat-voices/${Date.now()}_${user.uid}.webm`;

        try {
            const { data, error } = await supabase.storage
                .from('voice-messages')
                .upload(fileName, audioBlob, { contentType: 'audio/webm' });

            if (!error && data) {
                const { data: publicData } = supabase.storage
                    .from('voice-messages')
                    .getPublicUrl(fileName);
                publicUrl = publicData?.publicUrl || null;
            }
        } catch (storageErr) {
            console.warn('Supabase voice storage upload failed, utilizing Base64 fallback:', storageErr);
        }

        if (!publicUrl) {
            try {
                publicUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(audioBlob);
                });
            } catch (e) {
                publicUrl = URL.createObjectURL(audioBlob);
            }
        }

        const senderName =
            userProfile?.full_name || userProfile?.childName || user.email || 'Пользователь';

        const voiceMsgPayload: any = {
            text: '',
            senderId: user.uid,
            senderName,
            senderRole: userProfile?.role || 'user',
            senderVerification: userProfile?.verification || null,
            senderAvatar: userProfile?.photoURL || null,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
            readBy: [user.uid],
            groupId: groupId || null,
            mediaUrl: publicUrl,
            mediaType: 'voice',
            type: 'voice',
            duration: durationSeconds || 5,
            reactions: {}
        };

        try {
            const targetCol =
                isUnifiedChat && chatId
                    ? collection(db, 'chats', chatId, 'messages')
                    : collection(db, 'group_messages');

            await addDoc(targetCol, voiceMsgPayload);

            if (isUnifiedChat && chatId) {
                await updateDoc(doc(db, 'chats', chatId), {
                    lastMessage: '🎙️ Голосовое сообщение',
                    lastMessageAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastMessageBy: user.uid,
                    [`readBy.${user.uid}`]: serverTimestamp()
                }).catch(() => {});
            }
        } catch (err) {
            console.warn('Error adding voice message to database, placing in local state:', err);
            setMessages(prev => [...prev, { ...voiceMsgPayload, id: `voice-${Date.now()}` }]);
        } finally {
            setIsSending(false);
        }
    };

    // Delete Single Message
    const deleteMessage = async (msgId: string) => {
        if (!msgId) return;

        // 1. Mark as deleted in ref and localStorage immediately
        deletedMsgIdsRef.current.add(msgId);
        try {
            const stored = JSON.parse(safeLocalStorage.getItem(storageKey) || '[]');
            if (Array.isArray(stored) && !stored.includes(msgId)) {
                stored.push(msgId);
                safeLocalStorage.setItem(storageKey, JSON.stringify(stored));
            }
        } catch (e) {}

        const msg = messages.find(m => m.id === msgId);

        // 2. Optimistically remove from React state
        setMessages(prev => prev.filter(m => m.id !== msgId));

        // 3. Persistent DB mutation (soft-delete first, then hard delete)
        try {
            const targetDoc =
                (msg && msg.__source === 'unified') || (isUnifiedChat && chatId)
                    ? doc(db, 'chats', msg?.__chatId || chatId!, 'messages', msgId)
                    : doc(db, 'group_messages', msgId);

            await updateDoc(targetDoc, {
                isDeleted: true,
                text: '',
                mediaUrl: null,
                mediaType: null,
                deletedAt: serverTimestamp()
            }).catch(() => {});

            await deleteDoc(targetDoc).catch(() => {});
        } catch (error) {
            console.error('Error deleting message from database:', error);
        }
    };

    // Batch Delete Messages
    const batchDeleteMessages = async (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;

        const idsToDelete = [...selectedIds];

        // 1. Save to ref and localStorage
        idsToDelete.forEach(id => deletedMsgIdsRef.current.add(id));
        try {
            const stored = JSON.parse(safeLocalStorage.getItem(storageKey) || '[]');
            if (Array.isArray(stored)) {
                idsToDelete.forEach(id => {
                    if (!stored.includes(id)) stored.push(id);
                });
                safeLocalStorage.setItem(storageKey, JSON.stringify(stored));
            }
        } catch (e) {}

        // 2. Optimistically remove from state
        setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id)));

        // 3. DB mutations
        try {
            for (const id of idsToDelete) {
                const targetDoc =
                    isUnifiedChat && chatId
                        ? doc(db, 'chats', chatId, 'messages', id)
                        : doc(db, 'group_messages', id);

                await updateDoc(targetDoc, {
                    isDeleted: true,
                    text: '',
                    mediaUrl: null,
                    mediaType: null,
                    deletedAt: serverTimestamp()
                }).catch(() => {});

                await deleteDoc(targetDoc).catch(() => {});
            }
        } catch (err) {
            console.error('Error batch deleting messages:', err);
        }
    };

    return {
        messages,
        setMessages,
        isLoading,
        isSending,
        isUploading,
        uploadProgress,
        sendTextMessage,
        sendMediaMessages,
        sendVoiceMessage,
        deleteMessage,
        batchDeleteMessages
    };
}
