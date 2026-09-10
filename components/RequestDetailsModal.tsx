import React, { useState } from 'react';
import { Calendar, User, Phone, Mail, MessageSquare, Ban, CheckCircle2, Clock, Trash2, Edit2, Save, MapPin, Sparkles, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BaseModal } from './ui/BaseModal';

interface RequestDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: any;
    onContactSupport: () => void;
}

const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ isOpen, onClose, request, onContactSupport }) => {
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        parentName: '',
        parentPhone: ''
    });

    React.useEffect(() => {
        if (request) {
            setEditForm({
                parentName: request.parentName || request.name || '',
                parentPhone: request.parentPhone || request.phone || ''
            });
            setIsEditing(false);
        }
    }, [request]);

    if (!request) return null;

    const handleDelete = async () => {
        const isNew = request.status === 'new';
        const confirmMessage = isNew
            ? 'Отменить и удалить эту заявку?'
            : 'Удалить эту заявку из истории?';

        if (!window.confirm(confirmMessage)) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, "requests", request.id));
            onClose();
        } catch (error) {
            console.error("Error deleting request:", error);
            alert("Не удалось удалить заявку.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateDoc(doc(db, "requests", request.id), {
                parentName: editForm.parentName,
                parentPhone: editForm.parentPhone,
                name: editForm.parentName,
                phone: editForm.parentPhone,
                updatedAt: new Date()
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating request:", error);
            alert("Не удалось сохранить изменения.");
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'completed': return { label: 'Завершено', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 };
            case 'contacted': return { label: 'В работе', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: MessageSquare };
            case 'rejected': return { label: 'Отклонено', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Ban };
            case 'cancelled': return { label: 'Отменено', color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10', icon: Ban };
            default: return { label: 'На рассмотрении', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Clock };
        }
    };

    const statusInfo = getStatusInfo(request.status);
    const StatusIcon = statusInfo.icon;
    const canEdit = request.status === 'new';

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            glowColor="amber"
            zIndex="z-50"
        >
            <div className="text-left font-manrope">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 sm:mb-6 pr-10">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white font-russo mb-1">Детали заявки</h2>
                        <p className="text-white/50 text-xs">ID: {request.id}</p>
                    </div>
                    {canEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-sparta-gold cursor-pointer"
                            title="Редактировать"
                        >
                            <Edit2 size={18} />
                        </button>
                    )}
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border mb-6 ${statusInfo.bg} ${statusInfo.border}`}>
                    <StatusIcon size={18} className={statusInfo.color} />
                    <span className={`font-bold text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>

                {/* Content Grid */}
                <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Программа</label>
                            <div className="text-white text-sm font-medium flex items-center gap-2">
                                <Calendar size={15} className="text-sparta-gold" />
                                {request.programType || 'Пробная тренировка'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Дата создания</label>
                            <div className="text-white text-sm font-medium">
                                {request.createdAt?.seconds
                                    ? format(new Date(request.createdAt.seconds * 1000), 'd MMMM yyyy HH:mm', { locale: ru })
                                    : 'Неизвестно'}
                            </div>
                        </div>
                    </div>

                    {/* Group & Schedule Details (if selected) */}
                    {(request.groupTitle || request.preferredGroupTitle || request.groupSchedule || request.preferredDay || request.preferredLocation) && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
                            {(request.groupTitle || request.preferredGroupTitle) && (
                                <div className="flex items-center gap-2 text-white">
                                    <Sparkles size={14} className="text-sparta-gold shrink-0" />
                                    <span>Группа: <strong className="text-sparta-gold">{request.groupTitle || request.preferredGroupTitle}</strong></span>
                                </div>
                            )}
                            {(request.groupSchedule || request.preferredDay) && (
                                <div className="flex items-center gap-2 text-white/70">
                                    <Clock size={14} className="text-white/40 shrink-0" />
                                    <span>Желаемый график: <strong className="text-white font-mono">{request.groupSchedule || request.preferredDay}</strong></span>
                                </div>
                            )}
                            {request.preferredLocation && (
                                <div className="flex items-center gap-2 text-white/70">
                                    <MapPin size={14} className="text-white/40 shrink-0" />
                                    <span>Локация: <strong className="text-white">{request.preferredLocation}</strong></span>
                                </div>
                            )}
                            {request.experienceLevelLabel && (
                                <div className="flex items-center gap-2 text-white/70">
                                    <Activity size={14} className="text-white/40 shrink-0" />
                                    <span>Уровень: <strong className="text-white">{request.experienceLevelLabel}</strong></span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="h-px bg-white/5" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Имя спортсмена</label>
                            <div className="text-white text-sm font-medium flex items-center gap-2">
                                <User size={15} className="text-white/50" />
                                {request.childFullName || request.childName || 'Не указано'}
                                {request.childAge ? <span className="text-white/40 text-xs">({request.childAge} лет)</span> : null}
                            </div>
                        </div>

                        {/* Parent Name Field */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Имя родителя</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.parentName}
                                    onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs focus:border-sparta-gold outline-none"
                                />
                            ) : (
                                <div className="text-white text-sm font-medium flex items-center gap-2">
                                    <User size={15} className="text-white/50" />
                                    {request.parentName || request.name || 'Не указано'}
                                </div>
                            )}
                        </div>

                        {/* Phone Field */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Телефон для связи</label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={editForm.parentPhone}
                                    onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs focus:border-sparta-gold outline-none"
                                />
                            ) : (
                                <div className="text-white text-sm font-medium flex items-center gap-2">
                                    <Phone size={15} className="text-white/50" />
                                    {request.parentPhone || request.phone || 'Не указано'}
                                </div>
                            )}
                        </div>

                        {request.email && (
                            <div className="space-y-1">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Email</label>
                                <div className="text-white text-sm font-medium flex items-center gap-2">
                                    <Mail size={15} className="text-white/50" />
                                    {request.email}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Optional Comment */}
                    {(request.experienceComment || request.comment) && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-white/70">
                            <span className="text-[10px] text-white/40 uppercase font-bold block mb-1">Пожелание или комментарий:</span>
                            <p className="italic">{request.experienceComment || request.comment}</p>
                        </div>
                    )}

                    {/* Friendly Guidance Box */}
                    <div className="p-3 bg-sparta-gold/10 border border-sparta-gold/20 rounded-xl text-xs text-white/70">
                        {request.status === 'new' && (
                            <span>Администратор свяжется с вами по указанному телефону в течение 15 минут, чтобы ответить на вопросы и согласовать пробное занятие.</span>
                        )}
                        {request.status === 'contacted' && (
                            <span>Администратор находится в диалоге с вами и подбирает наиболее удобную группу и время.</span>
                        )}
                        {request.status === 'completed' && (
                            <span className="text-green-400">Заявка успешно подтверждена! Ждем юного чемпиона на тренировке в Sparta!</span>
                        )}
                        {request.status === 'rejected' && (
                            <span>Заявка отклонена или отменена. Вы можете подать новую заявку в любое удобное время.</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-all font-bold text-xs border border-white/10 cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 bg-sparta-gold text-black hover:bg-yellow-500 py-3 rounded-xl transition-all font-bold text-xs disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? 'Сохранение...' : 'Сохранить'}
                                <Save size={15} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => { onClose(); onContactSupport(); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-all font-bold text-xs border border-white/10 cursor-pointer"
                            >
                                <MessageSquare size={15} />
                                Поддержка
                            </button>

                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl transition-all font-bold text-xs border border-red-500/20 disabled:opacity-50 cursor-pointer"
                            >
                                <Trash2 size={15} />
                                {loading ? 'Удаление...' : (request.status === 'new' ? 'Отменить' : 'Удалить')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};

export default RequestDetailsModal;
