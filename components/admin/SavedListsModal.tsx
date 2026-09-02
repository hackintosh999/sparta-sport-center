import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import {
    collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc,
    serverTimestamp, query, orderBy, getDocs, writeBatch, where
} from 'firebase/firestore';
import {
    X, Plus, Trash2, Edit3, Download, Save, RefreshCw, Search,
    Users, UserPlus, FileText, Check, ArrowLeft, Wand2, Calendar,
    Clock, AlertTriangle, Eraser, Sparkles, FolderOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Group, User } from '../../types/shop';
import { BaseModal } from '../ui/BaseModal';

export interface SavedStudentItem {
    id: string;
    childName: string;
    parentName?: string;
    phone: string;
    age: number | string;
    groupName: string;
    coachName?: string;
    notes?: string;
}

export interface SavedList {
    id: string;
    name: string;
    totalStudents: number;
    groupName?: string;
    targetGroupId?: string;
    createdAt?: any;
    updatedAt?: any;
    students: SavedStudentItem[];
}

interface SavedListsModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingGroups: Group[];
    existingUsers: User[];
    onSyncWithDatabase?: () => Promise<void>;
}

const toTitleCase = (str: string) => {
    if (!str) return '';
    const cleanStr = str.replace(/\s+/g, ' ').trim();
    return cleanStr.replace(/\b[\wА-ЯЁа-яё]+/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
        return `+7 (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4, -2)}-${digits.slice(-2)}`;
    }
    return phone;
};

export const SavedListsModal: React.FC<SavedListsModalProps> = ({
    isOpen,
    onClose,
    existingGroups,
    existingUsers,
    onSyncWithDatabase
}) => {
    const [savedLists, setSavedLists] = useState<SavedList[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedList, setSelectedList] = useState<SavedList | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Editor local state for currently opened list
    const [editorTitle, setEditorTitle] = useState('');
    const [editorDefaultGroup, setEditorDefaultGroup] = useState('');
    const [editorStudents, setEditorStudents] = useState<SavedStudentItem[]>([]);
    const [editorSearchQuery, setEditorSearchQuery] = useState('');
    const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null);

    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Realtime listener for saved_lists collection
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);

        const q = query(collection(db, 'saved_lists'), orderBy('updatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lists: SavedList[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as SavedList));
            setSavedLists(lists);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching saved lists:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen]);

    // Handle opening a list into the editor
    const handleOpenEditor = (list: SavedList) => {
        setSelectedList(list);
        setEditorTitle(list.name || 'Без названия');
        setEditorDefaultGroup(list.groupName || '');
        setEditorStudents(list.students || []);
        setEditorSearchQuery('');
        setSuccessMessage(null);
        setErrorMessage(null);
    };

    // Handle creating a new empty list
    const handleCreateNewList = () => {
        const defaultGroupName = existingGroups[0]?.name || 'Общая группа';
        const newList: SavedList = {
            id: `new_${Date.now()}`,
            name: `Список от ${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
            totalStudents: 0,
            groupName: defaultGroupName,
            students: []
        };
        handleOpenEditor(newList);
    };

    // Edit cell in the spreadsheet editor
    const handleCellChange = (studentId: string, field: keyof SavedStudentItem, value: any) => {
        const finalValue = field === 'childName' ? toTitleCase(String(value || '')) : value;
        setEditorStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: finalValue } : s));
    };

    // Add a new empty row to the editor
    const handleAddBlankStudent = () => {
        const newStudent: SavedStudentItem = {
            id: `student_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            childName: '',
            phone: '',
            age: '',
            parentName: '',
            groupName: editorDefaultGroup || existingGroups[0]?.name || 'Без группы'
        };
        setEditorStudents(prev => [...prev, newStudent]);
        setTimeout(() => {
            if (tableContainerRef.current) {
                tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
            }
        }, 50);
    };

    // Delete a single row from the editor
    const handleDeleteStudent = (studentId: string) => {
        setEditorStudents(prev => prev.filter(s => s.id !== studentId));
    };

    // Auto fix formatting
    const handleAutoFixFormats = () => {
        let count = 0;
        const updated = editorStudents.map(s => {
            const cleanName = toTitleCase(s.childName);
            const cleanParent = s.parentName ? toTitleCase(s.parentName) : '';
            const cleanPhone = formatPhone(s.phone);
            const cleanAge = String(s.age || '').trim();

            if (cleanName !== s.childName || cleanParent !== s.parentName || cleanPhone !== s.phone || cleanAge !== s.age) {
                count++;
            }
            return {
                ...s,
                childName: cleanName,
                parentName: cleanParent,
                phone: cleanPhone,
                age: cleanAge
            };
        });
        setEditorStudents(updated);
        setSuccessMessage(`✓ Приведено в порядок строк: ${count}`);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    // Clean empty rows
    const handleCleanEmpty = () => {
        const valid = editorStudents.filter(s => s.childName.trim().length > 0);
        const removed = editorStudents.length - valid.length;
        setEditorStudents(valid);
        setSuccessMessage(`✓ Удалено пустых строк: ${removed}`);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    // Save list and sync with database
    const handleSaveAndSyncList = async () => {
        if (!editorTitle.trim()) {
            setErrorMessage('Пожалуйста, укажите название списка');
            return;
        }

        const validStudents = editorStudents.filter(s => s.childName.trim().length > 0);
        setIsSaving(true);
        setSuccessMessage('Сохранение списка и обновление базы...');
        setErrorMessage(null);

        try {
            const listData = {
                name: editorTitle.trim(),
                groupName: editorDefaultGroup.trim() || 'Без группы',
                totalStudents: validStudents.length,
                students: validStudents,
                updatedAt: serverTimestamp()
            };

            let listDocId = selectedList?.id;
            if (!listDocId || listDocId.startsWith('new_')) {
                const docRef = await addDoc(collection(db, 'saved_lists'), {
                    ...listData,
                    createdAt: serverTimestamp()
                });
                listDocId = docRef.id;
            } else {
                await updateDoc(doc(db, 'saved_lists', listDocId), listData);
            }

            // Sync with pending_students collection in Firestore
            let currentBatch = writeBatch(db);
            let batchOpCount = 0;

            const safeBatchSet = async (ref: any, data: any) => {
                currentBatch.set(ref, data);
                batchOpCount++;
                if (batchOpCount >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    batchOpCount = 0;
                }
            };

            const safeBatchUpdate = async (ref: any, data: any) => {
                currentBatch.update(ref, data);
                batchOpCount++;
                if (batchOpCount >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    batchOpCount = 0;
                }
            };

            const currentYear = new Date().getFullYear();

            for (const student of validStudents) {
                const cleanPhone = student.phone.replace(/\D/g, '');
                const childFullName = student.childName.trim();
                const nameParts = childFullName.split(/\s+/);
                const childFirstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';
                const childLastName = nameParts.length > 1 ? nameParts[0] : '';
                const studentGroupName = (student.groupName || editorDefaultGroup || 'Без группы').trim();

                let ageNum = parseInt(String(student.age).replace(/\D/g, '') || '0', 10);
                if (ageNum >= 1990 && ageNum <= currentYear + 1) {
                    ageNum = Math.max(3, currentYear - ageNum);
                }

                // Check group id
                const matchedGroup = existingGroups.find(g => g.name.toLowerCase() === studentGroupName.toLowerCase());
                const targetGroupId = matchedGroup?.id || '';

                // Find if user already exists
                const existingUser = existingUsers.find(u => {
                    const uPhone = (u.parentPhone || (u as any).phone || '').replace(/\D/g, '');
                    const uName = (u.childName || (u as any).displayName || '').trim().toLowerCase();
                    return (cleanPhone.length >= 10 && uPhone.includes(cleanPhone.slice(-10))) || (childFullName.length > 3 && uName === childFullName.toLowerCase());
                });

                if (existingUser) {
                    if (targetGroupId && existingUser.groupId !== targetGroupId) {
                        await safeBatchUpdate(doc(db, 'users', existingUser.id), {
                            groupId: targetGroupId,
                            groupName: studentGroupName,
                            updatedAt: serverTimestamp()
                        });
                    }
                } else {
                    const pendingSnap = await getDocs(
                        query(collection(db, 'pending_students'), where('childFullName', '==', childFullName))
                    );

                    let existingPendingDoc = pendingSnap.docs.find(d => {
                        const data = d.data();
                        const pPhone = (data.parentPhone || '').replace(/\D/g, '');
                        return (cleanPhone && pPhone.includes(cleanPhone.slice(-10))) || (targetGroupId && data.groupId === targetGroupId);
                    });

                    if (existingPendingDoc) {
                        await safeBatchUpdate(doc(db, 'pending_students', existingPendingDoc.id), {
                            parentPhone: cleanPhone || existingPendingDoc.data().parentPhone || '',
                            parentName: student.parentName || existingPendingDoc.data().parentName || '',
                            childFirstName,
                            childLastName,
                            childAge: ageNum || existingPendingDoc.data().childAge || 0,
                            groupId: targetGroupId || existingPendingDoc.data().groupId || '',
                            groupName: studentGroupName,
                            updatedAt: serverTimestamp()
                        });
                    } else {
                        const pendingRef = doc(collection(db, 'pending_students'));
                        await safeBatchSet(pendingRef, {
                            parentPhone: cleanPhone,
                            parentName: student.parentName || '',
                            childFirstName,
                            childLastName,
                            childFullName,
                            childAge: ageNum || 0,
                            groupId: targetGroupId,
                            groupName: studentGroupName,
                            status: 'pending',
                            createdAt: serverTimestamp()
                        });
                    }
                }
            }

            if (batchOpCount > 0) {
                await currentBatch.commit();
            }

            if (onSyncWithDatabase) {
                await onSyncWithDatabase();
            }

            setSuccessMessage(`✓ Список «${editorTitle}» успешно сохранен! База синхронизирована (${validStudents.length} учеников).`);
            setTimeout(() => setSuccessMessage(null), 4000);
            setSelectedList(prev => prev ? { ...prev, id: listDocId!, name: editorTitle, totalStudents: validStudents.length, students: validStudents } : null);
        } catch (err: any) {
            console.error('Error saving list:', err);
            setErrorMessage('Ошибка сохранения: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Export list to Excel
    const handleExportListToExcel = (list: SavedList | { name: string; students: SavedStudentItem[] }) => {
        const rows = list.students.map((s, idx) => ({
            '№': idx + 1,
            'ФИО Ученика': s.childName,
            'Телефон Родителя': s.phone,
            'Возраст / Г.р.': s.age,
            'Родитель / Заметка': s.parentName || '',
            'Группа': s.groupName || list.name || 'Без группы'
        }));

        if (rows.length === 0) {
            rows.push({
                '№': 1,
                'ФИО Ученика': 'Пример ученика',
                'Телефон Родителя': '+7 (999) 000-00-00',
                'Возраст / Г.р.': '2016',
                'Родитель / Заметка': 'Иванова Мария',
                'Группа': 'Футбол'
            });
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 32 },
            { wch: 22 },
            { wch: 15 },
            { wch: 28 },
            { wch: 25 }
        ];

        const wb = XLSX.utils.book_new();
        const safeSheetName = (list.name || 'Список').replace(/[*?:/\\\[\]]/g, '').slice(0, 30);
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        const safeFileName = `${(list.name || 'Список_детей').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_')}.xlsx`;
        XLSX.writeFile(wb, safeFileName);
    };

    // Delete a saved list
    const handleDeleteList = async (listId: string) => {
        try {
            await deleteDoc(doc(db, 'saved_lists', listId));
            setDeleteConfirmListId(null);
            if (selectedList?.id === listId) {
                setSelectedList(null);
            }
            setSuccessMessage('✓ Список удален');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setErrorMessage('Ошибка удаления: ' + err.message);
        }
    };

    if (!isOpen) return null;

    // Filtered lists in directory
    const filteredLists = savedLists.filter(list => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const matchesName = list.name?.toLowerCase().includes(q);
        const matchesGroup = list.groupName?.toLowerCase().includes(q);
        const matchesStudent = list.students?.some(s => s.childName?.toLowerCase().includes(q) || s.phone?.includes(q));
        return matchesName || matchesGroup || matchesStudent;
    });

    // Filtered students in current editor
    const filteredEditorStudents = editorStudents.filter(s => {
        const q = editorSearchQuery.toLowerCase().trim();
        if (!q) return true;
        return s.childName?.toLowerCase().includes(q) || s.phone?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) || s.groupName?.toLowerCase().includes(q);
    });

    const groupOptionsList = Array.from(new Set([
        ...existingGroups.map(g => g.name),
        editorDefaultGroup,
        'Без группы'
    ])).filter(Boolean);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-5xl"
            showCloseButton={false}
            noPadding
            glowColor="amber"
        >
            <div className="bg-[#121214] rounded-2xl w-full p-6 overflow-hidden flex flex-col max-h-[88vh]">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10 mb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        {selectedList && (
                            <button
                                onClick={() => setSelectedList(null)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer"
                                title="Назад ко всем спискам"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h3 className="text-xl font-bold text-white font-russo flex items-center gap-2">
                                <FolderOpen className="text-sparta-gold" size={22} />
                                {selectedList ? 'Редактирование списка' : 'Сохраненные списки и файлы'}
                            </h3>
                            <p className="text-white/40 text-xs mt-0.5">
                                {selectedList
                                    ? `Учеников в списке: ${editorStudents.filter(s => s.childName.trim()).length}`
                                    : `Всего сохранено списков: ${savedLists.length}`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!selectedList ? (
                            <button
                                onClick={handleCreateNewList}
                                className="px-3.5 py-2 bg-sparta-gold text-black font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-[#ffd700]"
                            >
                                <Plus size={15} />
                                <span>+ Новый список</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleExportListToExcel({ name: editorTitle, students: editorStudents })}
                                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                    title="Скачать текущий список в Excel"
                                >
                                    <Download size={14} className="text-sparta-gold" />
                                    <span>Скачать Excel</span>
                                </button>

                                <button
                                    onClick={handleSaveAndSyncList}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-green-600/20 disabled:opacity-50"
                                >
                                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    <span>💾 Сохранить и применить</span>
                                </button>
                            </>
                        )}

                        <button onClick={onClose} className="text-white/40 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {successMessage && (
                    <div className="mb-3 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0 animate-in fade-in">
                        <Check size={16} />
                        <span>{successMessage}</span>
                    </div>
                )}
                {errorMessage && (
                    <div className="mb-3 p-3 bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0 animate-in fade-in">
                        <AlertTriangle size={16} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* === VIEW 1: DIRECTORY OF SAVED LISTS === */}
                {!selectedList ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Search Bar */}
                        <div className="flex items-center gap-3 mb-4 shrink-0">
                            <div className="relative flex-1 bg-[#0a0a0a] border border-white/10 focus-within:border-sparta-gold/50 rounded-xl px-3.5 py-2 flex items-center gap-2">
                                <Search size={15} className="text-white/30 shrink-0" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Поиск по названию списка, группе, ФИО ученика или телефону..."
                                    className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white text-xs cursor-pointer">✕</button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center text-white/40 text-xs font-russo">
                                <RefreshCw className="animate-spin mr-2" size={16} /> Загрузка списков...
                            </div>
                        ) : filteredLists.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                                <FolderOpen size={40} className="text-white/20 mb-3" />
                                <h4 className="text-base font-bold text-white mb-1">
                                    {searchQuery ? 'Ничего не найдено' : 'Сохраненных списков пока нет'}
                                </h4>
                                <p className="text-white/40 text-xs max-w-md mb-6">
                                    {searchQuery
                                        ? 'Попробуйте изменить поисковый запрос.'
                                        : 'Все файлы, которые вы импортируете через Excel, будут автоматически сохраняться здесь для быстрого редактирования в любое время.'
                                    }
                                </p>
                                <button
                                    onClick={handleCreateNewList}
                                    className="px-4 py-2.5 bg-sparta-gold text-black font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-[#ffd700]"
                                >
                                    <Plus size={15} />
                                    <span>Создать первый список</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                {filteredLists.map(list => {
                                    const isConfirmingDelete = deleteConfirmListId === list.id;
                                    const dateStr = list.updatedAt?.toDate
                                        ? format(list.updatedAt.toDate(), 'dd.MM.yyyy HH:mm', { locale: ru })
                                        : list.createdAt?.toDate
                                        ? format(list.createdAt.toDate(), 'dd.MM.yyyy HH:mm', { locale: ru })
                                        : 'Недавно';

                                    return (
                                        <div
                                            key={list.id}
                                            className="bg-[#18181b] hover:bg-[#1f1f23] border border-white/10 hover:border-sparta-gold/30 rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                                        >
                                            <div className="flex items-center gap-3.5 overflow-hidden">
                                                <div className="w-10 h-10 rounded-xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center text-sparta-gold shrink-0">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-bold text-white group-hover:text-sparta-gold transition-colors truncate">
                                                            {list.name}
                                                        </h4>
                                                        {list.groupName && (
                                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/70 font-semibold shrink-0">
                                                                {list.groupName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-white/40 text-xs mt-0.5 flex items-center gap-2">
                                                        <span>Учеников: <strong className="text-white font-mono">{list.totalStudents || list.students?.length || 0}</strong></span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1"><Clock size={11} /> {dateStr}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                <button
                                                    onClick={() => handleExportListToExcel(list)}
                                                    className="p-2 bg-white/5 hover:bg-emerald-500/20 text-white/50 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 rounded-xl text-xs transition-all cursor-pointer"
                                                    title="Скачать в Excel"
                                                >
                                                    <Download size={15} />
                                                </button>

                                                <button
                                                    onClick={() => handleOpenEditor(list)}
                                                    className="px-3.5 py-2 bg-sparta-gold/15 hover:bg-sparta-gold text-sparta-gold hover:text-black border border-sparta-gold/30 hover:border-sparta-gold rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                                >
                                                    <Edit3 size={14} />
                                                    <span>Открыть & Править</span>
                                                </button>

                                                {isConfirmingDelete ? (
                                                    <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 p-1 rounded-xl animate-in fade-in">
                                                        <button
                                                            onClick={() => handleDeleteList(list.id)}
                                                            className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 cursor-pointer"
                                                        >
                                                            Да, удалить
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmListId(null)}
                                                            className="px-2 py-1 text-white/50 hover:text-white text-[10px] cursor-pointer"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirmListId(list.id)}
                                                        className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                                                        title="Удалить список"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* === VIEW 2: INTERACTIVE SPREADSHEET EDITOR === */
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Top Info Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 bg-[#18181b] p-3 rounded-2xl border border-white/10 shrink-0">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                                    Название списка / файла
                                </label>
                                <input
                                    type="text"
                                    value={editorTitle}
                                    onChange={e => setEditorTitle(e.target.value)}
                                    placeholder="Название списка"
                                    className="w-full bg-black border border-white/10 focus:border-sparta-gold/60 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                                    Группа по умолчанию
                                </label>
                                <select
                                    value={editorDefaultGroup}
                                    onChange={e => setEditorDefaultGroup(e.target.value)}
                                    className="w-full bg-black border border-white/10 focus:border-sparta-gold/60 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                                >
                                    <option value="">-- Выберите группу --</option>
                                    {groupOptionsList.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleAutoFixFormats}
                                    className="flex-1 px-3 py-2 bg-sparta-gold/10 hover:bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    title="Привести ФИО к заглавным буквам и отформатировать телефоны"
                                >
                                    <Wand2 size={13} />
                                    <span>🪄 Форматы</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCleanEmpty}
                                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    title="Удалить пустые строки"
                                >
                                    <Eraser size={13} />
                                    <span>🧹 Очистить</span>
                                </button>
                            </div>
                        </div>

                        {/* Search & Actions toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
                            <div className="relative min-w-[220px] max-w-sm w-full bg-[#0a0a0a] border border-white/10 focus-within:border-sparta-gold/50 rounded-xl px-3 py-1.5 flex items-center gap-2">
                                <Search size={14} className="text-white/30 shrink-0" />
                                <input
                                    type="text"
                                    value={editorSearchQuery}
                                    onChange={e => setEditorSearchQuery(e.target.value)}
                                    placeholder="Поиск по ФИО, телефону, группе..."
                                    className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                                />
                                {editorSearchQuery && (
                                    <button onClick={() => setEditorSearchQuery('')} className="text-white/30 hover:text-white text-xs cursor-pointer">✕</button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleAddBlankStudent}
                                className="bg-sparta-gold text-black font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer hover:bg-[#ffd700]"
                            >
                                <UserPlus size={14} />
                                <span>+ Добавить ученика</span>
                            </button>
                        </div>

                        {/* Spreadsheet Table */}
                        <div ref={tableContainerRef} className="flex-1 overflow-auto border border-white/10 rounded-2xl bg-[#09090b]">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/40 font-bold sticky top-0 z-10 backdrop-blur-md">
                                        <th className="py-2.5 px-3 w-10 text-center">№</th>
                                        <th className="py-2.5 px-3 min-w-[200px]">ФИО Ученика *</th>
                                        <th className="py-2.5 px-3 w-40">Телефон Родителя</th>
                                        <th className="py-2.5 px-3 w-28">Возраст / Г.р.</th>
                                        <th className="py-2.5 px-3 min-w-[150px]">Родитель / Заметка</th>
                                        <th className="py-2.5 px-3 min-w-[160px]">Группа</th>
                                        <th className="py-2.5 px-3 w-12 text-center">✕</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs">
                                    {filteredEditorStudents.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-white/[0.02] group transition-colors">
                                            <td className="py-2 px-3 text-center text-white/30 font-mono text-[11px]">
                                                {idx + 1}
                                            </td>

                                            {/* Child Name */}
                                            <td className="py-1 px-2">
                                                <input
                                                    type="text"
                                                    value={student.childName}
                                                    onChange={e => handleCellChange(student.id, 'childName', e.target.value)}
                                                    placeholder="ФИО ученика"
                                                    className="w-full bg-transparent hover:bg-white/5 focus:bg-[#1a1a1a] border border-transparent focus:border-sparta-gold/50 rounded-lg px-2 py-1 text-xs text-white font-bold outline-none placeholder:text-white/20"
                                                />
                                            </td>

                                            {/* Phone */}
                                            <td className="py-1 px-2">
                                                <input
                                                    type="text"
                                                    value={student.phone}
                                                    onChange={e => handleCellChange(student.id, 'phone', e.target.value)}
                                                    placeholder="Телефон родителя"
                                                    className="w-full bg-transparent hover:bg-white/5 focus:bg-[#1a1a1a] border border-transparent focus:border-sparta-gold/50 rounded-lg px-2 py-1 text-xs text-white/90 font-mono outline-none placeholder:text-white/20"
                                                />
                                            </td>

                                            {/* Age */}
                                            <td className="py-1 px-2">
                                                <input
                                                    type="text"
                                                    value={student.age}
                                                    onChange={e => handleCellChange(student.id, 'age', e.target.value)}
                                                    placeholder="Возраст или год"
                                                    className="w-full bg-transparent hover:bg-white/5 focus:bg-[#1a1a1a] border border-transparent focus:border-sparta-gold/50 rounded-lg px-2 py-1 text-xs text-white/90 font-mono text-center outline-none placeholder:text-white/20"
                                                />
                                            </td>

                                            {/* Parent Name */}
                                            <td className="py-1 px-2">
                                                <input
                                                    type="text"
                                                    value={student.parentName || ''}
                                                    onChange={e => handleCellChange(student.id, 'parentName', e.target.value)}
                                                    placeholder="ФИО родителя"
                                                    className="w-full bg-transparent hover:bg-white/5 focus:bg-[#1a1a1a] border border-transparent focus:border-sparta-gold/50 rounded-lg px-2 py-1 text-xs text-white/80 outline-none placeholder:text-white/20"
                                                />
                                            </td>

                                            {/* Group */}
                                            <td className="py-1 px-2">
                                                <select
                                                    value={student.groupName || editorDefaultGroup || 'Без группы'}
                                                    onChange={e => handleCellChange(student.id, 'groupName', e.target.value)}
                                                    className="w-full bg-[#0a0a0a] text-white border border-white/10 rounded-lg px-2 py-1 text-xs focus:border-sparta-gold outline-none"
                                                >
                                                    {groupOptionsList.map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Delete Row */}
                                            <td className="py-1 px-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteStudent(student.id)}
                                                    className="text-white/40 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors opacity-50 group-hover:opacity-100 cursor-pointer"
                                                    title="Удалить строку"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Add Row Button at bottom of table */}
                                    <tr
                                        onClick={handleAddBlankStudent}
                                        className="border-t border-dashed border-white/10 hover:border-sparta-gold/40 hover:bg-sparta-gold/5 cursor-pointer transition-all"
                                    >
                                        <td colSpan={7} className="p-2.5 text-center text-xs font-bold text-sparta-gold/80 hover:text-sparta-gold">
                                            <span className="flex items-center justify-center gap-1.5">
                                                <Plus size={14} /> + Добавить строку ученика
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};
