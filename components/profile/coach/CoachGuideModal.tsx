import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    BookOpen,
    CheckCircle2,
    Phone,
    Heart,
    ShieldAlert,
    Trophy,
    Users,
    Download,
    Sparkles,
    ArrowRight,
    Check,
    AlertTriangle,
    Layers,
    Clock,
    FileText,
    HelpCircle
} from 'lucide-react';

interface CoachGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownloadPdf?: () => void;
}

export const CoachGuideModal: React.FC<CoachGuideModalProps> = ({
    isOpen,
    onClose,
    onDownloadPdf
}) => {
    const [activeTab, setActiveTab] = useState<'quick' | 'today' | 'trials' | 'sos' | 'homework'>('quick');

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl bg-[#121214] border border-sparta-gold/40 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-5 sm:p-6 bg-gradient-to-r from-sparta-gold/15 via-[#1a1a1e] to-sparta-gold/10 border-b border-white/10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 border border-sparta-gold/40 flex items-center justify-center text-2xl text-sparta-gold shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                                📖
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-russo text-lg sm:text-2xl text-white uppercase tracking-tight truncate">
                                        Шпаргалка тренера SPARTA
                                    </h3>
                                    <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                        Просто и понятно
                                    </span>
                                </div>
                                <p className="font-manrope text-xs sm:text-sm text-white/70 truncate">
                                    Инструкция без лишних слов: как отмечать ребят, принимать новеньких и звонить родителям
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* Download PDF Button */}
                            <a
                                href="/sparta-coach-manual.pdf"
                                download="sparta-coach-manual.pdf"
                                onClick={onDownloadPdf}
                                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sparta-gold text-black font-russo text-xs uppercase tracking-wider font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                                title="Скачать памятку в формате PDF для печати"
                            >
                                <Download size={15} />
                                <span>Скачать PDF</span>
                            </a>

                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
                                aria-label="Закрыть"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Pills */}
                    <div className="p-3 bg-black/40 border-b border-white/5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'quick', label: '⚡ Памятка за 30 сек', icon: Sparkles },
                            { id: 'today', label: '⚽ 1. Сегодня на поле', icon: Clock },
                            { id: 'trials', label: '📥 2. Новенькие на пробном', icon: Users },
                            { id: 'sos', label: '🚨 3. Звонок родителю / ЧП', icon: Phone },
                            { id: 'homework', label: '🏆 4. Домашка ребят', icon: Trophy }
                        ].map((t) => {
                            const active = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id as any)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-russo uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                                        active
                                            ? 'bg-sparta-gold text-black font-black shadow-md shadow-sparta-gold/30'
                                            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <t.icon size={14} className={active ? 'text-black' : 'text-sparta-gold'} />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Modal Content Body */}
                    <div className="p-5 sm:p-7 overflow-y-auto space-y-6 custom-scrollbar text-white font-manrope">
                        {/* TAB 1: QUICK OVERVIEW (30 SECONDS) */}
                        {activeTab === 'quick' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                                    <span className="text-2xl">💡</span>
                                    <div>
                                        <h4 className="font-russo text-sm sm:text-base text-amber-300 uppercase">
                                            Главное тренерское правило: телефон на поле нужен только на 10 секунд!
                                        </h4>
                                        <p className="text-xs sm:text-sm text-white/80 mt-1 leading-relaxed">
                                            Вам не нужно вести сложную отчетность. Вся рутина сведена к трем простым действиям: нажать <strong>«Пришёл»</strong>, нажать <strong>«Принять новичка»</strong> и в случае ушиба нажать <strong>«📞 Позвонить маме»</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Action 1 */}
                                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-russo font-bold flex items-center justify-center text-base shrink-0 border border-emerald-500/30">
                                                1
                                            </div>
                                            <div>
                                                <h5 className="font-russo text-sm text-white uppercase">Отметка присутствующих</h5>
                                                <p className="text-xs text-white/70 mt-1">
                                                    Вкладка <strong>«Сегодня на поле»</strong>. Нажмите крупную зелёную кнопку <strong>«Пришёл»</strong> или красную <strong>«Не пришёл»</strong>.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 p-2 rounded-xl">
                                            <Check size={14} /> Занимает 15 секунд перед свистком
                                        </div>
                                    </div>

                                    {/* Action 2 */}
                                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-sparta-gold/40 transition-all flex flex-col justify-between space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 text-sparta-gold font-russo font-bold flex items-center justify-center text-base shrink-0 border border-sparta-gold/30">
                                                2
                                            </div>
                                            <div>
                                                <h5 className="font-russo text-sm text-white uppercase">Новенькие на пробном</h5>
                                                <p className="text-xs text-white/70 mt-1">
                                                    Вкладка <strong>«Новенькие»</strong>. Видите карточку ребенка. После тренировки нажмите <strong>«Принять в команду»</strong>.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-sparta-gold bg-sparta-gold/10 p-2 rounded-xl">
                                            <Trophy size={14} /> Ребёнок сразу закрепляется за вами
                                        </div>
                                    </div>

                                    {/* Action 3 */}
                                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-red-500/40 transition-all flex flex-col justify-between space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 font-russo font-bold flex items-center justify-center text-base shrink-0 border border-red-500/30">
                                                3
                                            </div>
                                            <div>
                                                <h5 className="font-russo text-sm text-white uppercase">Экстренный звонок родителям</h5>
                                                <p className="text-xs text-white/70 mt-1">
                                                    Возле фамилии каждого ребенка есть значок телефонной трубки <strong>📞</strong>. Нажали — вызов пошел сразу.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-500/10 p-2 rounded-xl">
                                            <Phone size={14} /> Без поиска номеров по блокнотам
                                        </div>
                                    </div>

                                    {/* Action 4 */}
                                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 font-russo font-bold flex items-center justify-center text-base shrink-0 border border-blue-500/30">
                                                4
                                            </div>
                                            <div>
                                                <h5 className="font-russo text-sm text-white uppercase">Проверка домашки</h5>
                                                <p className="text-xs text-white/70 mt-1">
                                                    Вкладка <strong>«Домашка ребят»</strong>. За чаем в тренерской глянули видео и нажали 👍 или 👎.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-blue-400 bg-blue-500/10 p-2 rounded-xl">
                                            <CheckCircle2 size={14} /> Спортсмен получает победные монеты
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: TODAY WORKOUT / ATTENDANCE */}
                        {activeTab === 'today' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <h4 className="font-russo text-lg text-white uppercase flex items-center gap-2">
                                    <span>⚽</span> Как отмечать детей на поле
                                </h4>
                                <div className="space-y-3 text-sm text-white/80">
                                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                                        <div className="font-russo text-sparta-gold text-xs uppercase">Шаг 1. Откройте первую вкладку</div>
                                        <p className="text-xs sm:text-sm">
                                            Сверху экрана нажмите <strong>«⚽ Сегодня на поле»</strong>. Если у вас несколько групп (например, младшие и старшие), нажмите на название вашей группы, чтобы увидеть ее состав.
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                                        <div className="font-russo text-sparta-gold text-xs uppercase">Шаг 2. Нажмите кнопки посещаемости</div>
                                        <div className="flex flex-wrap items-center gap-3 pt-1">
                                            <div className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-russo text-xs uppercase font-black">
                                                ✓ Пришёл
                                            </div>
                                            <span className="text-xs text-white/60">Ребенок на поле, тренируется</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 pt-1">
                                            <div className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-russo text-xs uppercase font-bold">
                                                🩺 Болеет / Справка
                                            </div>
                                            <span className="text-xs text-white/60">Занятие не сгорает, заморозка по болезни</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 pt-1">
                                            <div className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 font-russo text-xs uppercase font-bold">
                                                ✕ Не пришёл
                                            </div>
                                            <span className="text-xs text-white/60">Пропуск без предупреждения</span>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                                        <div className="font-russo text-sparta-gold text-xs uppercase">Шаг 3. Быстрая отметка всех сразу</div>
                                        <p className="text-xs sm:text-sm">
                                            Если пришла вся команда в полном составе — вверху списка нажмите <strong>«Отметить всех»</strong>, чтобы не кликать каждого по отдельности!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: TRIALS / NEW STUDENTS */}
                        {activeTab === 'trials' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <h4 className="font-russo text-lg text-white uppercase flex items-center gap-2">
                                    <span>📥</span> Работа с новичками на пробном
                                </h4>

                                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">1️⃣</span>
                                        <div>
                                            <h5 className="font-russo text-sm text-white uppercase">Мама привела ребенка на пробную тренировку</h5>
                                            <p className="text-xs text-white/70 mt-0.5">
                                                Откройте вкладку <strong>«Новенькие»</strong>. Карточка ребенка уже ждет вас с указанием имени, возраста и телефона родителя.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">2️⃣</span>
                                        <div>
                                            <h5 className="font-russo text-sm text-white uppercase">Провели тренировку — берем в команду?</h5>
                                            <p className="text-xs text-white/70 mt-0.5">
                                                В карточке ребенка проверьте выбранную группу (система сама подбирает её по году рождения) и нажмите большую золотую кнопку <strong>«⭐ ЗАЧИСЛИТЬ В МОЙ СОСТАВ»</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">3️⃣</span>
                                        <div>
                                            <h5 className="font-russo text-sm text-white uppercase">Ребенок младше или старше? Передайте коллеге</h5>
                                            <p className="text-xs text-white/70 mt-0.5">
                                                В выпадающем списке выберите группу другого тренера (например, группу малышей) и нажмите кнопку <strong>«Передать в состав коллеги»</strong>. Заявка моментально появится у нужного тренера.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: SOS & EMERGENCY CALL */}
                        {activeTab === 'sos' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                                    <ShieldAlert size={28} className="text-red-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-russo text-base text-red-400 uppercase">
                                            Безопасность детей и экстренная связь
                                        </h4>
                                        <p className="text-xs text-white/80 mt-1 leading-relaxed">
                                            Если ребенок получил ушиб, пожаловался на самочувствие или забыл обувь — не теряйте ни секунды на поиски номеров в мессенджерах.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
                                        <div>
                                            <h5 className="font-russo text-sm text-white uppercase">Кнопка «📞 Позвонить»</h5>
                                            <p className="text-xs text-white/60 mt-0.5">
                                                Расположена прямо в строке ребенка и в карточке новенького.
                                            </p>
                                        </div>
                                        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shrink-0">
                                            <Phone size={14} /> Вызов в 1 клик
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
                                        <div>
                                            <h5 className="font-russo text-sm text-white uppercase">Значок 🏥 «Справка» или ⚠️ «Внимание»</h5>
                                            <p className="text-xs text-white/60 mt-0.5">
                                                Если у ребенка нет действующей справки от педиатра или есть ограничения по здоровью, система предупредит вас ярким значком.
                                            </p>
                                        </div>
                                        <div className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shrink-0">
                                            <AlertTriangle size={14} /> Контроль здоровья
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: HOMEWORK REVIEW */}
                        {activeTab === 'homework' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <h4 className="font-russo text-lg text-white uppercase flex items-center gap-2">
                                    <span>🏆</span> Проверка домашних заданий и челленджей
                                </h4>

                                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3 text-sm text-white/80">
                                    <p>
                                        Дети выполняют задания дома (чеканка мяча, планка, отжимания) и отправляют отчеты через родительский кабинет.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="font-russo text-emerald-400 text-xs uppercase mb-1">👍 Зачесть (+30 монет)</div>
                                            <p className="text-xs text-white/70">
                                                Нажмите, если упражнение выполнено правильно. Ребенок получит монеты для покупок в клубном магазине.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                            <div className="font-russo text-red-400 text-xs uppercase mb-1">👎 На доработку</div>
                                            <p className="text-xs text-white/70">
                                                Нажмите, если техника нарушена. Можно написать короткий добрый комментарий с подсказкой.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 sm:p-5 bg-black/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-white/60">
                            <span>Тренерский штаб SPARTA • Челябинск</span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <a
                                href="/sparta-coach-manual.pdf"
                                download="sparta-coach-manual.pdf"
                                onClick={onDownloadPdf}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-sparta-gold text-black font-russo text-xs uppercase tracking-wider font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            >
                                <Download size={15} />
                                <span>Скачать шпаргалку в PDF</span>
                            </a>

                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-manrope font-bold text-xs uppercase tracking-wider transition-all"
                            >
                                Понятно, к тренировке!
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CoachGuideModal;
