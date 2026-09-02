import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Shield, Plus, X, Loader, Wrench, Snowflake, Save, AlertTriangle, CheckCircle, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminSettings = () => {
    // --- Stop Words ---
    const [stopWords, setStopWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState('');

    // --- Maintenance Mode ---
    const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState('Ведутся технические работы. Скоро вернёмся!');

    // --- Freeze Settings ---
    const [freezeDays, setFreezeDays] = useState(7);
    const [maxFreezePerYear, setMaxFreezePerYear] = useState(2);

    // --- SpartCoins Economy Settings ---
    const [coinExchangeRateRub, setCoinExchangeRateRub] = useState(10);
    const [maxDiscountPercent, setMaxDiscountPercent] = useState(100);

    // --- UI State ---
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // which section is saving
    const [savedSection, setSavedSection] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [modDoc, sysDoc, ecoDoc] = await Promise.all([
                    getDoc(doc(db, 'settings', 'moderation')),
                    getDoc(doc(db, 'settings', 'system')),
                    getDoc(doc(db, 'settings', 'economy')),
                ]);

                if (modDoc.exists()) {
                    if (modDoc.data().stopWords) setStopWords(modDoc.data().stopWords);
                }
                if (sysDoc.exists()) {
                    const data = sysDoc.data();
                    if (data.maintenanceEnabled !== undefined) setMaintenanceEnabled(data.maintenanceEnabled);
                    if (data.maintenanceMessage) setMaintenanceMessage(data.maintenanceMessage);
                    if (data.freezeDays !== undefined) setFreezeDays(data.freezeDays);
                    if (data.maxFreezePerYear !== undefined) setMaxFreezePerYear(data.maxFreezePerYear);
                }
                if (ecoDoc.exists()) {
                    const ecoData = ecoDoc.data();
                    if (ecoData.coinExchangeRateRub !== undefined) setCoinExchangeRateRub(ecoData.coinExchangeRateRub);
                    if (ecoData.maxDiscountPercent !== undefined) setMaxDiscountPercent(ecoData.maxDiscountPercent);
                }
            } catch (error) {
                console.error('Error fetching settings', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const showSaved = (section: string) => {
        setSavedSection(section);
        setTimeout(() => setSavedSection(null), 2500);
    };

    // --- SpartCoins Economy Settings ---
    const saveEconomySettings = async () => {
        setSaving('economy');
        try {
            await setDoc(doc(db, 'settings', 'economy'), {
                coinExchangeRateRub: Number(coinExchangeRateRub) || 10,
                maxDiscountPercent: Number(maxDiscountPercent) || 100,
                updatedAt: new Date()
            }, { merge: true });
            showSaved('economy');
        } catch (error) {
            console.error('Error saving economy settings', error);
            alert('Ошибка при сохранении настроек экономики.');
        } finally {
            setSaving(null);
        }
    };

    // --- Stop Words ---
    const handleAddWord = async (e: React.FormEvent) => {
        e.preventDefault();
        const word = newWord.trim().toLowerCase();
        if (!word || stopWords.includes(word)) return;
        const updated = [...stopWords, word];
        setStopWords(updated);
        setNewWord('');
        await saveModerationSettings(updated);
    };

    const handleRemoveWord = async (wordToRemove: string) => {
        const updated = stopWords.filter(w => w !== wordToRemove);
        setStopWords(updated);
        await saveModerationSettings(updated);
    };

    const saveModerationSettings = async (words: string[]) => {
        setSaving('moderation');
        try {
            await setDoc(doc(db, 'settings', 'moderation'), { stopWords: words }, { merge: true });
            showSaved('moderation');
        } catch (error) {
            console.error('Error saving moderation settings', error);
            alert('Ошибка при сохранении настроек.');
        } finally {
            setSaving(null);
        }
    };

    // --- Maintenance Mode ---
    const handleToggleMaintenance = async () => {
        const newValue = !maintenanceEnabled;
        setMaintenanceEnabled(newValue);
        setSaving('maintenance');
        try {
            await setDoc(doc(db, 'settings', 'system'), {
                maintenanceEnabled: newValue,
                maintenanceMessage,
                freezeDays,
                maxFreezePerYear,
            }, { merge: true });
            showSaved('maintenance');
        } catch (error) {
            console.error('Error saving maintenance settings', error);
            setMaintenanceEnabled(!newValue); // rollback
            alert('Ошибка при сохранении.');
        } finally {
            setSaving(null);
        }
    };

    const saveMaintenanceMessage = async () => {
        setSaving('maintenance');
        try {
            await setDoc(doc(db, 'settings', 'system'), {
                maintenanceEnabled,
                maintenanceMessage,
                freezeDays,
                maxFreezePerYear,
            }, { merge: true });
            showSaved('maintenance');
        } catch (error) {
            console.error('Error saving maintenance settings', error);
            alert('Ошибка при сохранении.');
        } finally {
            setSaving(null);
        }
    };

    // --- Freeze Settings ---
    const saveFreezeSettings = async () => {
        setSaving('freeze');
        try {
            await setDoc(doc(db, 'settings', 'system'), {
                freezeDays,
                maxFreezePerYear,
            }, { merge: true });
            showSaved('freeze');
        } catch (error) {
            console.error('Error saving freeze settings', error);
            alert('Ошибка при сохранении.');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="w-8 h-8 text-sparta-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-russo text-white mb-8">Настройки системы</h1>

            {/* ─── Maintenance Mode ─── */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Wrench className="text-orange-400" size={24} />
                        <h2 className="text-xl font-russo text-white">Режим технического обслуживания</h2>
                    </div>
                    {/* Toggle Switch — auto-saves on click */}
                    <button
                        onClick={handleToggleMaintenance}
                        disabled={saving === 'maintenance'}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-60 ${maintenanceEnabled ? 'bg-orange-500' : 'bg-white/10'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${maintenanceEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                </div>

                <AnimatePresence>
                    {maintenanceEnabled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1 mb-4"
                        >
                            <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-4">
                                <AlertTriangle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                                <p className="text-orange-300 text-sm">
                                    Сайт будет недоступен для всех пользователей, кроме администраторов. Они увидят заглушку с указанным текстом.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-white/50 text-sm mb-5 max-w-2xl">
                    При включении этого режима все посетители (кроме администраторов) увидят страницу с сообщением о техработах.
                </p>

                <div className="mb-5 max-w-xl">
                    <label className="text-white/60 text-sm mb-2 block">Сообщение для пользователей</label>
                    <textarea
                        value={maintenanceMessage}
                        onChange={e => setMaintenanceMessage(e.target.value)}
                        rows={2}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-400 outline-none text-sm transition-colors resize-none"
                        placeholder="Ведутся технические работы..."
                    />
                </div>

                <SaveButton
                    onClick={saveMaintenanceMessage}
                    saving={saving === 'maintenance'}
                    saved={savedSection === 'maintenance'}
                />
            </div>

            {/* ─── Freeze Settings ─── */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-2">
                    <Snowflake className="text-blue-400" size={24} />
                    <h2 className="text-xl font-russo text-white">Настройки заморозки абонемента</h2>
                </div>
                <p className="text-white/50 text-sm mb-6 max-w-2xl">
                    Укажите стандартную длительность заморозки и максимальное количество заморозок в год на одного пользователя.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-md mb-6">
                    <div>
                        <label className="text-white/60 text-sm mb-2 block">Длительность заморозки (дней)</label>
                        <input
                            type="number"
                            min={1}
                            max={90}
                            value={freezeDays}
                            onChange={e => setFreezeDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-400 outline-none text-sm transition-colors"
                        />
                        <p className="text-white/30 text-xs mt-1">от 1 до 90 дней</p>
                    </div>
                    <div>
                        <label className="text-white/60 text-sm mb-2 block">Макс. заморозок в год</label>
                        <input
                            type="number"
                            min={1}
                            max={12}
                            value={maxFreezePerYear}
                            onChange={e => setMaxFreezePerYear(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-400 outline-none text-sm transition-colors"
                        />
                        <p className="text-white/30 text-xs mt-1">от 1 до 12 раз</p>
                    </div>
                </div>

                <SaveButton
                    onClick={saveFreezeSettings}
                    saving={saving === 'freeze'}
                    saved={savedSection === 'freeze'}
                />
            </div>

            {/* ─── SpartCoins Economy ─── */}
            <div className="bg-[#1a1a1a] border border-amber-500/20 rounded-2xl p-8 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
                <div className="flex items-center gap-3 mb-4">
                    <Coins className="text-sparta-gold" size={24} />
                    <h2 className="text-xl font-russo text-white">🪙 Экономика SpartCoins (Клубная валюта)</h2>
                </div>
                <p className="text-white/50 text-sm mb-6 max-w-2xl">
                    Управление курсом обмена клубных монет на рубли и предельными скидками при оформлении экипировки и мерча в магазине.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mb-6">
                    <div>
                        <label className="block text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
                            Стоимость 1 монеты в рублях (₽)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="1000"
                                value={coinExchangeRateRub}
                                onChange={e => setCoinExchangeRateRub(Math.max(1, Number(e.target.value)))}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-base focus:border-sparta-gold outline-none transition-colors pr-24"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                                1 🟡 = {coinExchangeRateRub} ₽
                            </span>
                        </div>
                        <p className="text-white/40 text-[11px] mt-1.5">
                            По умолчанию 10 ₽. При списании 30 монет скидка составит {30 * coinExchangeRateRub} ₽.
                        </p>
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
                            Макс. % оплаты заказа монетами
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={maxDiscountPercent}
                                onChange={e => setMaxDiscountPercent(Math.max(1, Math.min(100, Number(e.target.value))))}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-base focus:border-sparta-gold outline-none transition-colors pr-10"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                                %
                            </span>
                        </div>
                        <p className="text-white/40 text-[11px] mt-1.5">
                            100% — разрешить полную оплату монетами (0 ₽ к оплате).
                        </p>
                    </div>
                </div>

                <SaveButton
                    onClick={saveEconomySettings}
                    saving={saving === 'economy'}
                    saved={savedSection === 'economy'}
                />
            </div>

            {/* ─── Moderation / Stop Words ─── */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="text-sparta-gold" size={24} />
                    <h2 className="text-xl font-russo text-white">Анти-спам фильтр (Стоп-слова)</h2>
                </div>
                <p className="text-white/50 text-sm mb-6 max-w-2xl">
                    Если пользователь попытается отправить комментарий, содержащий любое из этих слов, его сообщение будет автоматически скрыто от других и отправлено на модерацию.
                </p>

                <form onSubmit={handleAddWord} className="flex gap-3 mb-8 max-w-md">
                    <input
                        type="text"
                        value={newWord}
                        onChange={e => setNewWord(e.target.value)}
                        placeholder="Введите стоп-слово..."
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-sparta-gold outline-none text-sm transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!newWord.trim() || saving === 'moderation'}
                        className="bg-sparta-gold text-black px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#ffd700] transition-colors disabled:opacity-50"
                    >
                        <Plus size={18} />
                        Добавить
                    </button>
                </form>

                <div className="flex flex-wrap gap-2">
                    {stopWords.length === 0 ? (
                        <div className="text-white/30 text-sm italic">Список стоп-слов пуст</div>
                    ) : (
                        stopWords.map((word, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 group">
                                <span className="text-white text-sm">{word}</span>
                                <button
                                    onClick={() => handleRemoveWord(word)}
                                    className="text-white/40 hover:text-red-400 transition-colors opacity-60 hover:opacity-100 cursor-pointer"
                                    title="Удалить слово"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
                {saving === 'moderation' && (
                    <div className="text-xs text-white/30 mt-4 flex items-center gap-2">
                        <Loader size={12} className="animate-spin" /> Сохранение...
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Reusable Save Button ───
const SaveButton = ({ onClick, saving, saved }: { onClick: () => void; saving: boolean; saved: boolean }) => (
    <button
        onClick={onClick}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        style={{
            background: saved ? 'rgba(74,222,128,0.15)' : 'rgba(212,175,55,0.15)',
            border: `1px solid ${saved ? 'rgba(74,222,128,0.3)' : 'rgba(212,175,55,0.3)'}`,
            color: saved ? '#4ade80' : '#d4af37'
        }}
    >
        {saving ? (
            <><Loader size={15} className="animate-spin" /> Сохранение...</>
        ) : saved ? (
            <><CheckCircle size={15} /> Сохранено!</>
        ) : (
            <><Save size={15} /> Сохранить</>
        )}
    </button>
);

export default AdminSettings;
