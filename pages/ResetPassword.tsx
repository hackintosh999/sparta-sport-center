import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { GlassCard, Button } from '../components/UIComponents';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { verifyCode, confirmReset } = useAuth();

    const [oobCode] = useState(searchParams.get('oobCode'));
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'verifying' | 'ready' | 'loading' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!oobCode) {
            setStatus('error');
            setErrorMessage('Ссылка для сброса пароля недействительна или просрочена.');
            return;
        }

        const checkCode = async () => {
            try {
                await verifyCode(oobCode);
                setStatus('ready');
            } catch (error) {
                setStatus('error');
                setErrorMessage('Срок действия ссылки истек или она уже была использована.');
            }
        };

        checkCode();
    }, [oobCode, verifyCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setErrorMessage('Пароли не совпадают');
            return;
        }
        if (newPassword.length < 6) {
            setErrorMessage('Пароль должен содержать минимум 6 символов');
            return;
        }

        setStatus('loading');
        try {
            await confirmReset(oobCode!, newPassword);
            setStatus('success');
            setTimeout(() => navigate('/'), 3000);
        } catch (error: any) {
            setStatus('ready');
            setErrorMessage(error.message || 'Произошла ошибка при смене пароля.');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sparta-gold/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sparta-gold/5 blur-[150px] rounded-full pointer-events-none" />

            <AnimatePresence mode="wait">
                {status === 'verifying' ? (
                    <motion.div
                        key="verifying"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-4 text-white"
                    >
                        <Loader2 className="w-12 h-12 animate-spin text-sparta-gold" />
                        <p className="font-russo tracking-widest uppercase">Проверка ссылки...</p>
                    </motion.div>
                ) : status === 'success' ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full"
                    >
                        <GlassCard className="text-center py-12">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                                <ShieldCheck className="text-green-500 w-10 h-10" />
                            </div>
                            <h1 className="text-3xl font-russo text-white mb-4 uppercase">Готово!</h1>
                            <p className="text-white/60 mb-8">
                                Ваш пароль был успешно изменен. Сейчас вы будете перенаправлены на главную страницу.
                            </p>
                            <Loader2 className="w-6 h-6 animate-spin text-sparta-gold mx-auto" />
                        </GlassCard>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md w-full relative group"
                    >

                        <GlassCard className="transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.8)] border-sparta-gold/20">
                            <div className="mb-8 text-center">
                                <div className="w-16 h-16 bg-sparta-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sparta-gold/20 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                                    <KeyRound className="text-sparta-gold w-8 h-8" />
                                </div>
                                <h1 className="text-2xl font-russo text-white uppercase tracking-wider">Новый пароль</h1>
                                <p className="text-white/40 text-sm mt-2">Установите надежный пароль для доступа к Sparta</p>
                            </div>

                            {status === 'error' ? (
                                <div className="text-center">
                                    <p className="text-red-500 mb-6 px-4">{errorMessage}</p>
                                    <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                                        Вернуться на главную
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2 group/input">
                                        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1 transition-colors group-focus-within/input:text-sparta-gold">
                                            Новый пароль
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within/input:text-sparta-gold">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white outline-none focus:border-sparta-gold focus:shadow-[0_0_25px_rgba(212,175,55,0.15)] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 group/input">
                                        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1 transition-colors group-focus-within/input:text-sparta-gold">
                                            Повторите пароль
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within/input:text-sparta-gold">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white outline-none focus:border-sparta-gold focus:shadow-[0_0_25px_rgba(212,175,55,0.15)] transition-all"
                                            />
                                        </div>
                                    </div>

                                    {errorMessage && (
                                        <motion.p
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="text-red-500 text-xs text-center"
                                        >
                                            {errorMessage}
                                        </motion.p>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={status === 'loading'}
                                        className="w-full py-5 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                                    >
                                        {status === 'loading' ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Сохранить <ArrowRight size={18} className="ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </GlassCard>

                        {/* 3D Glass Reflection Overlay */}
                        <div className="absolute inset-0 rounded-[32px] pointer-events-none border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ResetPassword;
