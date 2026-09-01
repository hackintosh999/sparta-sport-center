import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    MessageSquare,
    Send,
    User,
    Zap,
    X,
    Clock,
    Check,
    CheckCheck,
    Search,
    Image as ImageIcon,
    Video as VideoIcon,
    File as FileIcon,
    Paperclip,
    Smile,
    RotateCcw,
    Mic,
    Square,
    Trash2,
    Play,
    Pause
} from 'lucide-react';
import { db } from '../../firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    increment,
    Timestamp,
    setDoc,
    where,
    getDoc
} from 'firebase/firestore';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChatAttachmentMenu } from './ChatAttachmentMenu';

interface CoachChatProps {
    user: any; // Auth user (current viewer)
    userProfile: any; // Profile of the current viewer
    otherUser: any; // The person we are chatting with (student or coach)
    isCoachViewing?: boolean;
}

const CoachChat: React.FC<CoachChatProps> = ({ user, userProfile, otherUser, isCoachViewing = false }) => {
    const { theme } = useTheme();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [selectedMediaForLightbox, setSelectedMediaForLightbox] = useState<any>(null);
    const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const coachId = isCoachViewing ? (userProfile?.coachId || user.uid) : (otherUser.id || otherUser.uid);
    const studentId = isCoachViewing ? (otherUser.id || otherUser.uid) : user.uid;
    const chatId = `${coachId}_${studentId}`;

    useEffect(() => {
        if (!chatId) return;

        const messagesRef = collection(db, 'coach_chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];
            setMessages(loadedMessages);
            setIsLoading(false);

            // Mark as read when student views the chat
            const unreadFromOther = loadedMessages.filter((m: any) => m.senderId === otherUser.id && !m.isRead);
            if (unreadFromOther.length > 0) {
                updateDoc(doc(db, 'coach_chats', chatId), {
                    [`unreadCount.${user.uid}`]: 0
                });

                // Also mark individual messages as read (optional but good for UI)
                unreadFromOther.forEach((m: any) => {
                    updateDoc(doc(db, 'coach_chats', chatId, 'messages', m.id), { isRead: true });
                });
            }
        });

        return () => unsubscribe();
    }, [chatId, user.uid, otherUser.id, otherUser.uid]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const otherId = otherUser.id || otherUser.uid;
        if (!otherId) return;

        const unsubscribe = onSnapshot(doc(db, "users", otherId), (docSnap) => {
            if (docSnap.exists()) {
                setOtherUserProfile(docSnap.data());
            }
        });

        return () => unsubscribe();
    }, [otherUser.id, otherUser.uid]);

    const getOnlineStatus = (lastSeen: any) => {
        if (!lastSeen) return { online: false, text: 'был(а) в сети давно' };

        const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen.seconds * 1000);
        const diff = Date.now() - lastSeenDate.getTime();

        if (diff < 90000) { // 1.5 minutes
            return { online: true, text: 'в сети' };
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const lastSeenTime = lastSeenDate.getTime();

        let timeStr = format(lastSeenDate, 'HH:mm', { locale: ru });

        if (lastSeenTime >= startOfToday) {
            return { online: false, text: `был(а) в сети: сегодня в ${timeStr}` };
        } else if (lastSeenTime >= startOfYesterday) {
            return { online: false, text: `был(а) в сети: вчера в ${timeStr}` };
        } else {
            return { online: false, text: `был(а) в сети: ${format(lastSeenDate, 'd MMMM в HH:mm', { locale: ru })}` };
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setUploadPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setUploadPreview(null);
        }
    };

    const uploadFile = async (file: File | Blob, fileName: string = 'file'): Promise<string | null> => {
        const formData = new FormData();
        // If it's a blob (voice message), convert to file
        const fileToUpload = file instanceof File ? file : new File([file], fileName, { type: file.type });

        formData.append('file', fileToUpload);
        formData.append('bucket', 'review-media');
        formData.append('path', `student_${user.uid}/${Date.now()}_${fileToUpload.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`);

        try {
            const response = await fetch('/api/upload-media', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server Upload Error Response:', errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading file via Supabase proxy:', error);
            return null;
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                await sendVoiceMessage(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            setMediaRecorder(recorder);
            setAudioChunks(chunks);
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Не удалось получить доступ к микрофону");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.onstop = null; // Prevent sending
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const sendVoiceMessage = async (blob: Blob) => {
        setIsSending(true);
        try {
            const url = await uploadFile(blob, 'voice_message.webm');
            if (url) {
                await addMessageToFirestore('', url, 'audio');
            }
        } catch (error) {
            console.error("Error sending voice message:", error);
        } finally {
            setIsSending(false);
        }
    };

    const addMessageToFirestore = async (text: string, mediaUrl: string | null = null, mediaType: any = null) => {
        const chatRef = doc(db, 'coach_chats', chatId);
        const messagesRef = collection(db, 'coach_chats', chatId, 'messages');

        await addDoc(messagesRef, {
            text,
            senderId: user.uid,
            senderName: userProfile.childName || userProfile.name || user.displayName || 'Пользователь',
            timestamp: serverTimestamp(),
            isRead: false,
            mediaUrl,
            mediaType,
            fileName: mediaType === 'audio' ? 'Голосовое сообщение' : (selectedFile?.name || null)
        });

        const metadata: any = {
            lastMessage: mediaType === 'audio' ? '🎤 Голосовое сообщение' : (mediaUrl ? (mediaType === 'image' ? '🖼 Фото' : '📁 Файл') : text),
            lastMessageAt: serverTimestamp(),
            [`unreadCount.${otherUser.id || otherUser.uid}`]: increment(1),
            participants: [user.uid, otherUser.id || otherUser.uid],
            coachId,
            studentId
        };

        if (isCoachViewing) {
            metadata.coachName = userProfile.name || userProfile.childName || user.displayName || 'Тренер';
            metadata.studentName = otherUser.childName || otherUser.parentName || otherUser.name || 'Ученик';
        } else {
            metadata.studentName = userProfile.childName || userProfile.parentName || user.displayName || 'Ученик';
            metadata.coachName = otherUser.name || otherUser.fullName || 'Тренер';
        }

        await setDoc(chatRef, metadata, { merge: true });

        // Notification logic
        await addDoc(collection(db, 'notifications'), {
            email: otherUser.email || '',
            userId: otherUser.id || otherUser.uid,
            title: isCoachViewing ? 'Новое сообщение от тренера' : 'Новое сообщение от ученика',
            message: mediaType === 'audio' ? 'Отправил голосовое сообщение' : (mediaUrl ? 'Отправил медиафайл' : text),
            type: 'chat',
            isRead: false,
            createdAt: serverTimestamp(),
            relatedId: chatId,
            senderId: user.uid
        });
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !selectedFile) || isSending) return;

        setIsSending(true);
        const text = newMessage.trim();

        try {
            const chatRef = doc(db, 'coach_chats', chatId);
            const messagesRef = collection(db, 'coach_chats', chatId, 'messages');

            let mediaUrl = null;
            let mediaType: 'image' | 'video' | 'file' | null = null;

            if (selectedFile) {
                setIsUploading(true);
                mediaUrl = await uploadFile(selectedFile);
                if (selectedFile.type.startsWith('image/')) mediaType = 'image';
                else if (selectedFile.type.startsWith('video/')) mediaType = 'video';
                else mediaType = 'file';
                setIsUploading(false);
            }

            // Add the message
            await addDoc(messagesRef, {
                text,
                senderId: user.uid,
                senderName: userProfile.childName || userProfile.name || user.displayName || 'Пользователь',
                timestamp: serverTimestamp(),
                isRead: false,
                mediaUrl,
                mediaType,
                fileName: selectedFile?.name || null
            });

            // Update chat metadata
            const metadata: any = {
                lastMessage: mediaUrl ? (mediaType === 'image' ? '🖼 Фото' : (mediaType === 'video' ? '🎥 Видео' : '📁 Файл')) : text,
                lastMessageAt: serverTimestamp(),
                [`unreadCount.${otherUser.id || otherUser.uid}`]: increment(1),
                participants: [user.uid, otherUser.id || otherUser.uid],
                coachId: coachId,
                studentId: studentId
            };

            // Store names for easier listing
            if (isCoachViewing) {
                metadata.coachName = userProfile.name || userProfile.childName || user.displayName || 'Тренер';
                metadata.studentName = otherUser.childName || otherUser.parentName || otherUser.name || 'Ученик';
            } else {
                metadata.studentName = userProfile.childName || userProfile.parentName || user.displayName || 'Ученик';
                metadata.coachName = otherUser.name || otherUser.fullName || 'Тренер';
            }

            await setDoc(chatRef, metadata, { merge: true });

            // Create notification for other user
            await addDoc(collection(db, 'notifications'), {
                email: otherUser.email || '',
                userId: otherUser.id || otherUser.uid,
                title: isCoachViewing ? 'Новое сообщение от тренера' : 'Новое сообщение от ученика',
                message: mediaUrl ? 'Отправил медиафайл' : `${userProfile.childName || userProfile.name || user.displayName}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
                type: 'chat',
                isRead: false,
                createdAt: serverTimestamp(),
                relatedId: chatId,
                senderId: user.uid
            });

            setNewMessage('');
            setSelectedFile(null);
            setUploadPreview(null);
            setShowEmojiPicker(false);
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-main border border-main rounded-3xl overflow-hidden shadow-2xl dashboard-theme">
            {/* Header */}
            <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sparta-gold/20 to-transparent p-0.5 border border-white/10 relative">
                        <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                            {(otherUser.photoURL || otherUserProfile?.photoURL) ? (
                                <img src={otherUser.photoURL || otherUserProfile?.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User className="text-sparta-gold/40" size={24} />
                            )}
                        </div>
                        {getOnlineStatus(otherUserProfile?.lastSeen).online && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#111] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-russo text-white uppercase tracking-tight">
                            {otherUser.name || otherUserProfile?.childName || otherUserProfile?.parentName || 'Спортсмен'}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${getOnlineStatus(otherUserProfile?.lastSeen).online ? 'text-green-500' : 'text-white/30'}`}>
                                {getOnlineStatus(otherUserProfile?.lastSeen).text}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="relative flex-1 max-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-9 pr-4 text-[10px] text-white outline-none focus:border-sparta-gold/30 transition-all font-bold uppercase tracking-wider"
                    />
                </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center opacity-20">
                        <div className="w-8 h-8 border-2 border-sparta-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                        <MessageSquare size={64} className="mb-4 text-sparta-gold" />
                        <p className="text-sm font-russo uppercase tracking-widest text-white">Список пуст</p>
                        <p className="text-[10px] mt-2 max-w-[200px] uppercase font-bold tracking-tighter">Напишите первый вопрос вашему тренеру</p>
                    </div>
                ) : (
                    messages
                        .filter(msg => !chatSearchQuery || msg.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                        .map((msg) => (
                            <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] relative group ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-lg ${msg.senderId === user.uid
                                            ? 'bg-sparta-gold text-black rounded-tr-none shadow-sparta-gold/10 font-medium'
                                            : 'bg-field text-main border border-main rounded-tl-none'
                                        }`}>
                                        {msg.mediaUrl && (
                                            <div className="mb-3 rounded-lg overflow-hidden border border-black/10 shadow-xl bg-black/40 group/media relative">
                                                {msg.mediaType === 'audio' ? (
                                                    <div className="py-2">
                                                        <AudioPlayer url={msg.mediaUrl} />
                                                    </div>
                                                ) : msg.mediaType === 'image' ? (
                                                    <div
                                                        className="cursor-zoom-in"
                                                        onClick={() => setSelectedMediaForLightbox({ url: msg.mediaUrl, type: 'image' })}
                                                    >
                                                        <img src={msg.mediaUrl} alt="Медиа" className="w-full h-auto max-h-48 object-cover hover:scale-105 transition-transform" />
                                                    </div>
                                                ) : msg.mediaType === 'video' ? (
                                                    <video src={msg.mediaUrl} controls className="w-full h-auto max-h-48" />
                                                ) : (
                                                    <div className="flex flex-col">
                                                        {msg.fileName?.toLowerCase().endsWith('.pdf') ? (
                                                            <>
                                                                <div className="flex items-center gap-2 mb-2 p-1 bg-white/5 rounded-lg">
                                                                    <div className="w-8 h-8 rounded-lg bg-sparta-gold/20 flex items-center justify-center">
                                                                        <FileIcon size={14} className="text-sparta-gold" />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-white truncate max-w-[150px]">{msg.fileName}</span>
                                                                </div>
                                                                <div className="relative group/pdf overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0c]">
                                                                    <iframe
                                                                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(msg.mediaUrl)}&embedded=true`}
                                                                        className="w-full h-80 border-none opacity-90 group-hover:opacity-100 transition-opacity"
                                                                        title="PDF Preview"
                                                                    />
                                                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                                                                        <button
                                                                            onClick={() => window.open(msg.mediaUrl, '_blank')}
                                                                            className="px-6 py-2 text-[10px] bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-sparta-gold hover:text-black transition-all font-black rounded-lg uppercase tracking-tighter"
                                                                        >
                                                                            Открыть
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="p-3 bg-white/5 flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                                                                    <FileIcon size={18} className={msg.senderId === user.uid ? 'text-black' : 'text-sparta-gold'} />
                                                                </div>
                                                                <div className="flex-1 min-w-0 text-[10px]">
                                                                    <p className={`font-bold truncate ${msg.senderId === user.uid ? 'text-black' : 'text-white'}`}>{msg.fileName || 'Файл'}</p>
                                                                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className={`text-[8px] font-black uppercase tracking-wider hover:underline ${msg.senderId === user.uid ? 'text-black/60' : 'text-sparta-gold'}`}>Скачать</a>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                        <div className={`text-[8px] mt-2 flex items-center gap-1.5 ${msg.senderId === user.uid ? 'justify-end text-black/40' : 'text-white/30'}`}>
                                            {msg.timestamp?.seconds ? format(new Date(msg.timestamp.seconds * 1000), 'HH:mm') : '...'}
                                            {msg.senderId === user.uid && (
                                                msg.isRead ? <CheckCheck size={10} /> : <Check size={10} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5 space-y-4">
                {/* Attachments Preview */}
                <AnimatePresence>
                    {selectedFile && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10"
                        >
                            {uploadPreview ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                    <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                    {selectedFile.type.startsWith('video/') ? <VideoIcon size={20} className="text-sparta-gold" /> : <FileIcon size={20} className="text-sparta-gold" />}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-white truncate uppercase">{selectedFile.name}</p>
                                <p className="text-[8px] text-white/40 uppercase font-black">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button onClick={() => { setSelectedFile(null); setUploadPreview(null); }} className="p-2 hover:bg-white/10 rounded-full text-white/20 transition-colors">
                                <RotateCcw size={16} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative">
                    {showEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-4 z-[120]">
                            <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                            <div className="relative shadow-2xl border border-white/10 rounded-3xl overflow-hidden">
                                <EmojiPicker
                                    onEmojiClick={(emojiData) => {
                                        setNewMessage(prev => prev + emojiData.emoji);
                                    }}
                                    theme={theme === 'light' ? Theme.LIGHT : Theme.DARK}
                                    autoFocusSearch={false}
                                    searchPlaceholder="Поиск эмодзи..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="relative flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5 transition-all focus-within:border-sparta-gold/50 focus-within:bg-white/[0.08]">
                        {/* Redesigned Dual-Platform Attachment Menu (PC Popover & Mobile Bottom Sheet) */}
                        <ChatAttachmentMenu
                            isOpen={showAttachmentMenu}
                            onClose={() => setShowAttachmentMenu(false)}
                            onSelectGallery={() => galleryInputRef.current?.click()}
                            onSelectDoc={() => docInputRef.current?.click()}
                            onSelectCamera={() => cameraInputRef.current?.click()}
                            isTrainerOrAdmin={isCoachViewing}
                        />

                        {!isRecording ? (
                            <>
                                <div className="flex items-center gap-1 self-center pl-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`p-2 rounded-xl transition-all ${showEmojiPicker ? 'bg-sparta-gold text-black' : 'hover:bg-white/5 text-white/20'}`}
                                    >
                                        <Smile size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                                        className={`p-2 rounded-xl transition-all ${showAttachmentMenu ? 'bg-sparta-gold text-black' : 'hover:bg-white/5 text-white/20'}`}
                                        title="Прикрепить вложение"
                                    >
                                        <Paperclip size={18} />
                                    </button>
                                    <input ref={galleryInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,video/*" />
                                    <input ref={docInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.zip,.xls,.xlsx,.txt" />
                                    <input ref={cameraInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*" capture="environment" />
                                </div>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={isCoachViewing ? "Написать ученику..." : "Написать тренеру..."}
                                    className="flex-1 bg-transparent border-none outline-none text-white text-xs py-2.5 resize-none max-h-32 scrollbar-hide uppercase font-bold tracking-wider placeholder:text-white/10"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-1 self-center pr-1">
                                    {!newMessage.trim() && !selectedFile ? (
                                        <button
                                            onClick={startRecording}
                                            className="p-3 bg-white/5 hover:bg-sparta-gold hover:text-black rounded-xl text-white/40 transition-all"
                                            title="Голосовое сообщение"
                                        >
                                            <Mic size={18} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={isSending || isUploading}
                                            className="p-3 bg-sparta-gold text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-sparta-gold/20"
                                        >
                                            {isSending || isUploading ? <RotateCcw size={18} className="animate-spin" /> : <Send size={18} />}
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-between px-2 py-1 bg-red-500/10 rounded-xl overflow-hidden">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[10px] font-russo text-red-500 tracking-widest uppercase">Запись {formatDuration(recordingTime)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={cancelRecording}
                                        className="p-2 text-white/40 hover:text-white transition-colors"
                                        title="Отменить"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={stopRecording}
                                        className="p-3 bg-red-500 text-white rounded-xl hover:scale-105 transition-all shadow-lg shadow-red-500/20"
                                        title="Завершить и отправить"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-[8px] text-white/20 uppercase font-black tracking-[0.2em] text-center mt-4 italic">
                    {isCoachViewing ? 'Ученик получит уведомление о вашем сообщении' : 'Тренер ответит вам при первой возможности'}
                </p>
            </div>

            {/* Media Lightbox */}
            <AnimatePresence>
                {selectedMediaForLightbox && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm shadow-2xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedMediaForLightbox(null)}
                                className="absolute top-0 right-0 p-4 text-white/40 hover:text-white transition-colors"
                            >
                                <X size={32} />
                            </button>

                            {selectedMediaForLightbox.type === 'image' ? (
                                <img
                                    src={selectedMediaForLightbox.url}
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl"
                                    alt="Full screen view"
                                />
                            ) : (
                                <video
                                    src={selectedMediaForLightbox.url}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-full shadow-2xl rounded-2xl"
                                />
                            )}

                            <div className="mt-6 flex gap-4">
                                <button
                                    onClick={() => window.open(selectedMediaForLightbox.url, '_blank')}
                                    className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all font-bold text-xs uppercase tracking-widest"
                                >
                                    Открыть оригинал
                                </button>
                                <button
                                    onClick={() => setSelectedMediaForLightbox(null)}
                                    className="px-8 py-3 rounded-xl bg-sparta-gold text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-sparta-gold/20"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AudioPlayer: React.FC<{ url: string }> = ({ url }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const onTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const onLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const onEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 bg-black/20 rounded-xl p-3 border border-white/5 min-w-[200px]">
            <audio
                ref={audioRef}
                src={url}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
            />
            <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-sparta-gold/10 flex items-center justify-center text-sparta-gold hover:bg-sparta-gold hover:text-black transition-all"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
            <div className="flex-1 space-y-1">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-sparta-gold"
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-white/40">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default CoachChat;