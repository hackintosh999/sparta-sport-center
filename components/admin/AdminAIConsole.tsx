import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Sparkles, Brain, ArrowRight, Check, X, Loader2, Info, AlertTriangle, MessageSquare, Mic, MicOff, Volume2, VolumeX, Cloud, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveAIAction, AIActionResponse } from '../../services/aiActionResolver';

interface AdminAIConsoleProps {
    context: {
        groups: any[];
        users: any[];
        coaches: any[];
        stats: any;
    };
    onExecuteAction: (action: AIActionResponse) => Promise<void>;
}

const AdminAIConsole: React.FC<AdminAIConsoleProps> = ({ context, onExecuteAction }) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<{ type: 'user' | 'ai', content: string, status?: 'pending' | 'success' | 'error' }[]>([]);
    const [pendingAction, setPendingAction] = useState<AIActionResponse | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isCloudActive, setIsCloudActive] = useState(true); // Default to true as it's the primary engine now
    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, pendingAction]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'ru-RU';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setInput('');
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const speak = (text: string) => {
        if (!isVoiceEnabled) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const currentInput = input;
        setInput('');
        setHistory(prev => [...prev, { type: 'user', content: currentInput }]);

        setIsProcessing(true);
        // Simulate thinking for UX
        await new Promise(r => setTimeout(r, 600));

        try {
            const response = await resolveAIAction(currentInput, context);

            if (response.requiresConfirmation) {
                setPendingAction(response);
                speak(response.confirmationMessage || 'Мне нужно ваше подтверждение.');
            } else {
                const aiText = response.answer || 'Действие выполнено!';
                setHistory(prev => [...prev, { type: 'ai', content: aiText }]);
                speak(aiText);
                if (response.type !== 'unknown' && response.type !== 'info') {
                    await onExecuteAction(response);
                }
            }
        } catch (err) {
            setHistory(prev => [...prev, { type: 'ai', content: 'Ошибка при обработке команды ИИ.', status: 'error' }]);
        }
        setIsProcessing(false);
    };

    const handleConfirm = async () => {
        if (!pendingAction) return;
        setIsProcessing(true);

        try {
            await onExecuteAction(pendingAction);
            const successText = 'Магия сработала! Изменения применены.';
            setHistory(prev => [...prev, { type: 'ai', content: successText, status: 'success' }]);
            speak(successText);
        } catch (error) {
            const errorText = 'Что-то пошло не так при выполнении команды.';
            setHistory(prev => [...prev, { type: 'ai', content: errorText, status: 'error' }]);
            speak(errorText);
        }

        setPendingAction(null);
        setIsProcessing(false);
    };

    const handleCancel = () => {
        setPendingAction(null);
        const cancelText = 'Действие отменено.';
        setHistory(prev => [...prev, { type: 'ai', content: cancelText }]);
        speak(cancelText);
    };

    return (
        <div className="bg-[#0a0a0a]/90 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[400px] backdrop-blur-xl relative font-manrope">
            {/* Header */}
            <div className="bg-white/[0.03] border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                        <Terminal size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-white font-russo text-sm tracking-wider uppercase">AI Консоль управления</h2>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[8px] font-black text-indigo-400 uppercase tracking-tighter"
                            >
                                <Cloud size={8} />
                                Gemini 2.5 Cloud
                            </motion.div>
                        </div>
                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-0.5">Sparta Command System</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                        className={`p-1.5 rounded-lg transition-all ${isVoiceEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/20 hover:text-white/40'}`}
                        title={isVoiceEnabled ? 'Голосовой ответ включен' : 'Голосовой ответ выключен'}
                    >
                        {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full border border-white/5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{isListening ? 'Listening' : 'Online'}</span>
                    </div>
                </div>
            </div>

            {/* Terminal Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar font-mono text-sm">
                {history.length === 0 && !pendingAction && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                        <Brain size={48} className="mb-4 text-white" />
                        <p className="text-center text-xs tracking-widest uppercase font-black">Ожидание команд...</p>
                        <p className="text-[10px] mt-2 opacity-50 italic">"Отмени группу бокс" или "Сколько выручки?"</p>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {history.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.type === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.type === 'user'
                                ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-200'
                                : 'bg-white/5 border border-white/10 text-white/80'
                                }`}>
                                <div className="flex items-start gap-2">
                                    {msg.type === 'ai' && <Sparkles size={14} className="mt-0.5 text-indigo-400 shrink-0" />}
                                    <p className="leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isProcessing && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                <Loader2 size={16} className="animate-spin text-indigo-400" />
                            </div>
                        </motion.div>
                    )}

                    {pendingAction && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-3xl space-y-4 shadow-xl"
                        >
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm mb-1 uppercase font-russo tracking-tight">Требуется подтверждение</h4>
                                    <p className="text-indigo-200/60 text-xs leading-normal">{pendingAction.confirmationMessage}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/50 transition-all font-manrope"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                                >
                                    Подтвердить
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSubmit} className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-3 relative overflow-hidden">
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-x-0 top-0 bottom-0 bg-red-500/10 backdrop-blur-sm pointer-events-none flex items-center justify-center gap-4 z-20"
                    >
                        {[1, 2, 3, 2, 1].map((h, i) => (
                            <motion.div
                                key={i}
                                animate={{ height: [10, 30, 10] }}
                                transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                                className="w-1 bg-red-500 rounded-full"
                            />
                        ))}
                    </motion.div>
                )}

                <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-3 rounded-2xl transition-all relative z-30 ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 border border-white/5'}`}
                >
                    {isListening ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Слушаю..." : "Введите команду для ИИ..."}
                    className={`flex-1 bg-black/40 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-white/10 font-manrope relative z-30 ${isListening ? 'placeholder:text-red-400/30' : ''}`}
                    disabled={isProcessing || !!pendingAction}
                />

                <button
                    type="submit"
                    disabled={isProcessing || !!pendingAction || !input.trim()}
                    className="p-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 text-white rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-90 relative z-30"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default AdminAIConsole;
