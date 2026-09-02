import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, writeBatch, getDocs, where, arrayUnion } from 'firebase/firestore';
import {
    Plus, Trash2, Image as ImageIcon, Loader, Edit2, X, Save, Search, UploadCloud, Users, Check, RefreshCw, ShieldAlert, ArrowRightLeft
} from 'lucide-react';
import { triggerScheduleSync } from '../../services/scheduleSync';

interface Coach {
    id: string;
    name: string;
    role: string;
    image: string;
    order?: number;
    createdAt?: any;
}

const DEFAULT_COACHES = [
    { name: "Сергей Пономарев", role: "Старший тренер по футболу", image: "/sergey-ponomarev.png" },
    { name: "Антон Глазунов", role: "Старший тренер по киле", image: "/anton-glazunov.png" },
    { name: "Аксинья Лебедева", role: "Директор футбольного клуба", image: "/aksinya-lebedeva.png" },
    { name: "Сергей Кубарь", role: "Тренер по футболу", image: "/sergey-kubar-gold.png" },
    { name: "Павел Якупов", role: "Тренер по футболу", image: "/pavel-yakupov-gold.png" },
];

const AdminTeam = () => {
    // --- State ---
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Editor State
    const [formData, setFormData] = useState<Partial<Coach>>({
        name: '',
        role: '',
        image: '',
        order: 0
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    // Removed upload progress since it's instant now
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    const [groups, setGroups] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // Successor / Group Reassignment Modal State
    const [isSuccessorModalOpen, setIsSuccessorModalOpen] = useState(false);
    const [retiringCoach, setRetiringCoach] = useState<Coach | null>(null);
    const [attachedGroups, setAttachedGroups] = useState<any[]>([]);
    const [selectedSuccessorId, setSelectedSuccessorId] = useState<string>('');
    const [isReassigning, setIsReassigning] = useState(false);

    // --- Effects ---
    useEffect(() => {
        const q = query(collection(db, "coaches"), orderBy("order", "asc"));

        const unsubscribeCoaches = onSnapshot(collection(db, "coaches"), (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setCoaches(data);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Read Error:", error);
            setErrorMessage(`Ошибка доступа к БД: ${error.message}`);
            setLoading(false);
        });

        const unsubscribeGroups = onSnapshot(collection(db, "groups"), (snapshot) => {
            setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeCoaches();
            unsubscribeGroups();
            unsubscribeUsers();
        };
    }, []);

    const handleAutoSync = async () => {
        if (coaches.length > 0) {
            if (!window.confirm("Список не пуст. Все равно добавить стандартных тренеров?")) return;
        }

        setSyncing(true);
        try {
            const batch = writeBatch(db);
            DEFAULT_COACHES.forEach((coach, index) => {
                const docRef = doc(collection(db, "coaches"));
                batch.set(docRef, {
                    ...coach,
                    order: index + 1,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
            setSuccessMessage("Данные синхронизированы!");
            setTimeout(() => setSuccessMessage(null), 2000);
        } catch (error: any) {
            console.error("Sync Error:", error);
            setErrorMessage("Ошибка синхронизации: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    // --- Helpers ---

    // Resize image to base64 (ONLY mechanism now)
    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 500; // Small size for Firestore storage efficiency

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Compress to JPEG 0.6 standard
                        resolve(canvas.toDataURL('image/jpeg', 0.6));
                    } else {
                        reject(new Error("Canvas failed"));
                    }
                };
                img.onerror = () => reject(new Error("Image load failed"));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error("File read failed"));
            reader.readAsDataURL(file);
        });
    };

    // --- Handlers ---

    const handleOpenEditor = (item?: Coach) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ ...item });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                role: '',
                image: '',
                order: coaches.length + 1
            });
        }
        setIsEditorOpen(true);
        setErrorMessage(null);
    };

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingId(null);
        setIsUploading(false);
    };

    // PURE LOCAL UPLOAD (No Firebase Storage)
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage("Файл слишком большой (макс. 10MB)");
            return;
        }

        setIsUploading(true);
        setErrorMessage(null);

        try {
            // Only convert to Base64. Do NOT attempt Storage upload (to fix CORS hang).
            const base64String = await resizeImage(file);
            setFormData(prev => ({ ...prev, image: base64String }));
            setSuccessMessage("Фото готово!");
        } catch (err: any) {
            console.error("Resize failed:", err);
            setErrorMessage("Не удалось обработать файл: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.role) {
            setErrorMessage("Заполните Имя и Должность");
            return;
        }

        const dataToSave = {
            ...formData,
            updatedAt: serverTimestamp()
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, "coaches", editingId), dataToSave);
                setSuccessMessage("Тренер обновлен!");
            } else {
                await addDoc(collection(db, "coaches"), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("Тренер добавлен!");
            }
            setTimeout(() => {
                setSuccessMessage(null);
                handleCloseEditor();
            }, 500);
        } catch (error: any) {
            console.error("Save error:", error);
            setErrorMessage("Ошибка сохранения: " + error.message);
        }
    };

    const handleDelete = async (coach: Coach) => {
        // 1. Check if coach has attached groups
        const cleanCoachName = (coach.name || '').trim().toLowerCase();
        const matchedGroups = groups.filter(g => 
            g.coachId === coach.id || 
            (g.coachName && g.coachName.trim().toLowerCase() === cleanCoachName)
        );

        // 2. If NO attached groups: standard confirmation
        if (matchedGroups.length === 0) {
            if (window.confirm(`Вы уверены, что хотите удалить тренера ${coach.name}?`)) {
                await deleteDoc(doc(db, "coaches", coach.id));
                setSuccessMessage("Тренер успешно удален!");
                setTimeout(() => setSuccessMessage(null), 2000);
            }
            return;
        }

        // 3. If groups exist (> 0): open Successor Reassignment Modal
        const otherCoaches = coaches.filter(c => c.id !== coach.id);
        setRetiringCoach(coach);
        setAttachedGroups(matchedGroups);
        setSelectedSuccessorId(otherCoaches[0]?.id || '');
        setIsSuccessorModalOpen(true);
    };

    const handleReassignAndDelete = async () => {
        if (!retiringCoach || !selectedSuccessorId) return;
        const successor = coaches.find(c => c.id === selectedSuccessorId);
        if (!successor) return;

        setIsReassigning(true);
        try {
            const batch = writeBatch(db);

            // 1. Reassign all attached groups to successor
            for (const g of attachedGroups) {
                const groupRef = doc(db, "groups", g.id);
                batch.update(groupRef, {
                    coachId: successor.id,
                    coachName: successor.name,
                    coachImage: successor.image || '',
                    updatedAt: serverTimestamp()
                });
            }

            // 2. Delete retiring coach from coaches
            const coachRef = doc(db, "coaches", retiringCoach.id);
            batch.delete(coachRef);

            // Commit atomic batch
            await batch.commit();

            // 3. Synchronize group chats in `chats` collection
            for (const g of attachedGroups) {
                try {
                    const qChats = query(collection(db, 'chats'), where('groupId', '==', g.id));
                    const chatsSnap = await getDocs(qChats);
                    for (const cDoc of chatsSnap.docs) {
                        await updateDoc(doc(db, 'chats', cDoc.id), {
                            coachId: successor.id,
                            coachName: successor.name,
                            participants: arrayUnion(successor.id),
                            updatedAt: serverTimestamp()
                        });
                    }
                } catch (chatErr) {
                    console.warn("Could not sync chat for group", g.id, chatErr);
                }
            }

            // 4. Update website timetable schedule
            await triggerScheduleSync().catch(console.error);

            setSuccessMessage(`✓ ${attachedGroups.length} групп успешно переданы тренеру ${successor.name}. Карточка сотрудника удалена.`);
            setIsSuccessorModalOpen(false);
            setRetiringCoach(null);
            setAttachedGroups([]);
            setTimeout(() => setSuccessMessage(null), 3500);
        } catch (error: any) {
            console.error("Reassignment error:", error);
            setErrorMessage("Ошибка при передаче групп: " + error.message);
        } finally {
            setIsReassigning(false);
        }
    };

    const filteredCoaches = coaches.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center h-full bg-[#050505]">
            <Loader className="animate-spin text-sparta-gold w-10 h-10" />
        </div>
    );

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope relative">
            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[400px]' : ''}`}>
                {/* Header */}
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-russo text-white mb-2">Команда</h1>
                            <p className="text-white/40 text-sm">Управление тренерским составом</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleAutoSync}
                                disabled={syncing}
                                className="bg-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {syncing ? <Loader className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                                {coaches.length === 0 ? "Загрузить всех" : "Сброс"}
                            </button>

                            <button
                                onClick={() => handleOpenEditor()}
                                className="bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2 transform active:scale-95"
                            >
                                <Plus size={20} />
                                Добавить
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                            type="text"
                            placeholder="Поиск по имени или роли..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:border-sparta-gold/50 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Coach List */}
                <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCoaches.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                                <Users size={48} className="text-white/10 mb-4" />
                                <h3 className="text-white/40 font-bold mb-2">Список пуст</h3>
                                <p className="text-white/20 text-sm mb-6">Нажмите "Загрузить всех", чтобы добавить стандартную команду</p>
                                <button
                                    onClick={handleAutoSync}
                                    disabled={syncing}
                                    className="bg-sparta-gold text-black font-bold py-3 px-8 rounded-xl hover:bg-[#ffd700] transition-all flex items-center gap-2"
                                >
                                    {syncing ? <Loader className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                                    Загрузить команду сайта
                                </button>
                            </div>
                        ) : (
                            filteredCoaches.map(coach => (
                                <div
                                    key={coach.id}
                                    onClick={() => handleOpenEditor(coach)}
                                    className={`group relative bg-[#0F0F0F] hover:bg-[#141414] border border-white/5 hover:border-sparta-gold/30 rounded-3xl p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 ${editingId === coach.id ? 'border-sparta-gold/50 ring-1 ring-sparta-gold/20' : ''}`}
                                >
                                    {/* Circular Image - Matching Site Design */}
                                    <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-sparta-gold to-transparent mb-4 relative group-hover:scale-105 transition-transform duration-500">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-black/50 flex items-center justify-center">
                                            {coach.image ? (
                                                <img src={coach.image} alt={coach.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Users size={32} className="text-white/20" />
                                            )}
                                        </div>
                                        {/* Edit Badge indicator */}
                                        <div className="absolute bottom-1 right-1 p-1.5 rounded-full bg-sparta-gold/90 text-black shadow-md opacity-80 group-hover:opacity-100 transition-opacity" title="Редактировать карточку">
                                            <Edit2 size={13} strokeWidth={2.5} />
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-white group-hover:text-sparta-gold transition-colors font-russo mb-1">{coach.name}</h3>
                                    <p className="text-white/50 text-sm font-manrope">{coach.role}</p>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(coach);
                                        }}
                                        className="absolute top-4 right-4 p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all z-30 cursor-pointer"
                                        title="Удалить / передать группы"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Editor Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-[400px] bg-[#111] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h2 className="text-xl font-bold text-white font-russo">{editingId ? 'Редактировать' : 'Новый тренер'}</h2>
                    <button onClick={handleCloseEditor} className="text-white/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Circular Image Upload Preview */}
                    <div className="space-y-3 flex flex-col items-center">
                        <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-br from-sparta-gold to-transparent relative group">
                            <div className="w-full h-full rounded-full overflow-hidden bg-black/50 flex items-center justify-center">
                                {formData.image ? (
                                    <img src={formData.image} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <ImageIcon size={32} className="text-white/20" />
                                )}
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center gap-1 z-10">
                                    <Loader className="animate-spin text-sparta-gold" size={20} />
                                </div>
                            )}
                        </div>

                        <label className={`text-sparta-gold hover:text-[#ffd700] text-sm font-bold cursor-pointer transition-colors flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <UploadCloud size={16} />
                            <span>{formData.image ? 'Изменить фото' : 'Загрузить фото'}</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Имя Фамилия</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold/50 outline-none transition-all"
                                placeholder="Например: Сергей Пономарев"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Должность / Роль</label>
                            <input
                                type="text"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold/50 outline-none transition-all"
                                placeholder="Например: Старший тренер по футболу"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Порядок отображения</label>
                            <input
                                type="number"
                                value={formData.order}
                                onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold/50 outline-none transition-all"
                                placeholder="0"
                            />
                            <p className="text-[10px] text-white/30">Меньше число = Выше/Левее в списке</p>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                            <Check size={16} /> {successMessage}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-[#111]">
                    <button
                        onClick={handleSubmit}
                        disabled={isUploading}
                        className="w-full bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save size={20} />
                        Сохранить
                    </button>
                </div>
            </div>

            {/* Successor Reassignment Modal (Защитный диалог передачи групп) */}
            {isSuccessorModalOpen && retiringCoach && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#111113] border border-amber-500/30 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-[0_0_50px_rgba(245,158,11,0.15)] space-y-6 animate-in fade-in zoom-in-95 font-manrope">
                        {/* Header Warning */}
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            <ShieldAlert size={28} className="shrink-0 text-amber-400 mt-0.5" />
                            <div>
                                <h3 className="font-russo text-white text-lg leading-tight">
                                    Передача групп перед удалением сотрудника
                                </h3>
                                <p className="text-xs text-white/70 mt-1">
                                    За тренером <strong className="text-amber-400">{retiringCoach.name}</strong> закреплено <strong className="text-white">{attachedGroups.length}</strong> активных групп. Пожалуйста, выберите наставника-преемника, которому будут переданы все группы и чаты.
                                </p>
                            </div>
                        </div>

                        {/* List of Attached Groups */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 font-bold uppercase tracking-wider block">
                                Передаваемые группы ({attachedGroups.length}):
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {attachedGroups.map(g => {
                                    const count = users.filter(u => u.groupId === g.id).length || g.studentCount || 0;
                                    return (
                                        <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
                                            <div className="overflow-hidden">
                                                <p className="text-white text-sm font-bold font-russo truncate">{g.name}</p>
                                                <p className="text-white/40 text-[11px] font-semibold">
                                                    Возраст: {g.ageRange?.min || 0}–{g.ageRange?.max || 18} лет
                                                </p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/30 text-xs font-bold font-mono shrink-0">
                                                {count} учеников
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Successor Selector */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/60 font-bold uppercase tracking-wider block">
                                Новый наставник (Преемник):
                            </label>
                            <select
                                value={selectedSuccessorId}
                                onChange={e => setSelectedSuccessorId(e.target.value)}
                                className="w-full bg-[#18181b] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-sparta-gold transition-colors cursor-pointer"
                            >
                                {coaches.filter(c => c.id !== retiringCoach.id).map(c => (
                                    <option key={c.id} value={c.id} className="bg-[#18181b] text-white">
                                        {c.name} — {c.role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSuccessorModalOpen(false);
                                    setRetiringCoach(null);
                                    setAttachedGroups([]);
                                }}
                                disabled={isReassigning}
                                className="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleReassignAndDelete}
                                disabled={isReassigning || !selectedSuccessorId}
                                className="flex-[2] py-3 px-5 rounded-xl bg-gradient-to-r from-sparta-gold to-amber-500 hover:brightness-110 text-black font-bold text-sm shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer font-russo"
                            >
                                {isReassigning ? (
                                    <>
                                        <Loader className="animate-spin" size={16} />
                                        <span>Передача и удаление...</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowRightLeft size={16} />
                                        <span>Передать группы и удалить сотрудника</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTeam;
