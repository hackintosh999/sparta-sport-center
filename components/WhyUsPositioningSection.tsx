import React from 'react';
import { motion } from 'framer-motion';
import { Award, Trophy, ShieldCheck } from 'lucide-react';
import { Container, SectionHeader } from './UIComponents';

const whyUsCards = [
    {
        icon: <Award className="w-8 h-8 text-sparta-gold" />,
        title: 'Стандарты академий',
        text: 'Тренировки построены по профессиональным программам, адаптированным для детей. Мы даем качественную базу, которая позволит ребенку уверенно чувствовать себя на поле.',
    },
    {
        icon: <Trophy className="w-8 h-8 text-sparta-gold" />,
        title: 'Гарантированное игровое время',
        text: 'У нас нет ситуации, когда ребенок проводит весь сезон на скамейке запасных. Каждый футболист получает достаточно времени в игре для отработки навыков.',
    },
    {
        icon: <ShieldCheck className="w-8 h-8 text-sparta-gold" />,
        title: 'Поддерживающая атмосфера',
        text: 'Мы создали идеальный баланс: даем спортивную базу, но без жесткой конкуренции, криков и страха ошибиться. Ребенок тренируется в удовольствие.',
    },
];

export const WhyUsPositioningSection: React.FC = () => {
    return (
        <section id="why-us-positioning" className="py-12 md:py-24 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-sparta-gold/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 left-0 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

            <Container>
                <SectionHeader
                    title="НАШИ ПРИНЦИПЫ"
                    subtitle="Профессиональный подход к подготовке в поддерживающей и развивающей среде."
                />

                {/* Grid of 3 equal Lumi Black cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    {whyUsCards.map((card, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.15 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -6 }}
                            className="group relative rounded-[28px] bg-white/5 backdrop-blur-md border border-white/10 p-6 md:p-8 flex flex-col justify-between transition-all duration-300 hover:border-sparta-gold/50 hover:bg-white/[0.08] hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)]"
                        >
                            <div>
                                <div className="w-16 h-16 rounded-2xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-sparta-gold/20 group-hover:border-sparta-gold/40 transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                    {card.icon}
                                </div>
                                <h3 className="font-manrope font-extrabold tracking-tight text-xl md:text-2xl text-white mb-4 group-hover:text-sparta-gold transition-colors leading-snug">
                                    {card.title}
                                </h3>
                                <p className="font-manrope text-white/85 text-sm md:text-base leading-relaxed">
                                    {card.text}
                                </p>
                            </div>
                            <div className="mt-8 pt-4 border-t border-white/5 w-full flex items-center justify-between text-xs text-sparta-gold/80 font-bold uppercase tracking-wider opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                                <span>Принцип SPARTA</span>
                                <span>✦</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

export default WhyUsPositioningSection;
