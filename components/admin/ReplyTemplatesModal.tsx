import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Copy, Save } from 'lucide-react';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { BaseModal } from '../ui/BaseModal';

interface Template {
    id: string;
    title: string;
    content: string;
}

interface ReplyTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (content: string) => void;
}

const ReplyTemplatesModal: React.FC<ReplyTemplatesModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const q = query(collection(db, 'message_templates'), orderBy('title'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template)));
        });

        return () => unsubscribe();
    }, [isOpen]);

    const handleSave = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;

        if (currentTemplate) {
            await updateDoc(doc(db, 'message_templates', currentTemplate.id), {
                title: newTitle,
                content: newContent
            });
        } else {
            await addDoc(collection(db, 'message_templates'), {
                title: newTitle,
                content: newContent,
                createdAt: serverTimestamp()
            });
        }

        resetForm();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Удалить шаблон?')) {
            await deleteDoc(doc(db, 'message_templates', id));
        }
    };

    const startEdit = (template: Template) => {
        setCurrentTemplate(template);
        setNewTitle(template.title);
        setNewContent(template.content);
        setIsEditing(true);
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentTemplate(null);
        setNewTitle('');
        setNewContent('');
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-2xl"
            showCloseButton={false}
            noPadding
            glowColor="amber"
            zIndex="z-[100]"
        >
            <div className="bg-[#1a1a1a] w-full rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-bold text-white font-russo">Шаблоны ответов</h3>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="text-white/50 hover:text-white cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {isEditing ? (
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Название шаблона (например, График работы)"
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold outline-none"
                            />
                            <textarea
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="Текст ответа..."
                                rows={6}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold outline-none resize-none"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={resetForm}
                                    className="px-4 py-2 text-white/50 hover:text-white transition-colors cursor-pointer"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-sparta-gold text-black font-bold rounded-xl hover:bg-white transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    <Save size={18} /> Сохранить
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/50 hover:bg-white/5 hover:text-sparta-gold transition-colors flex items-center justify-center gap-2 mb-4 cursor-pointer"
                            >
                                <Plus size={20} /> Создать новый шаблон
                            </button>

                            {templates.map(template => (
                                <div key={template.id} className="bg-white/5 rounded-xl p-4 group hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-white">{template.title}</h4>
                                        <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(template)}
                                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white cursor-pointer transition-colors"
                                                title="Редактировать шаблон"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template.id)}
                                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-red-400 cursor-pointer transition-colors"
                                                title="Удалить шаблон"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-white/50 text-sm line-clamp-2 mb-3">{template.content}</p>
                                    <button
                                        onClick={() => {
                                            onSelect(template.content);
                                            onClose();
                                        }}
                                        className="w-full py-2 bg-sparta-gold/10 text-sparta-gold rounded-lg hover:bg-sparta-gold hover:text-black transition-colors text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Copy size={16} /> Использовать этот шаблон
                                    </button>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="text-center text-white/30 py-8">Нет сохраненных шаблонов</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};

export default ReplyTemplatesModal;
