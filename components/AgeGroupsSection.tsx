import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, Zap, ChevronRight } from 'lucide-react';
import { Container, SectionHeader, Button } from './UIComponents';

interface AgeGroupsSectionProps {
    onOpenTrial?: () => void;
}

const ageGroups = [
    {
        age: '4–6 лет',
        title: 'Старт и фанатичная любовь к мячу',
        description: 'Игровая форма, координация, базовые движения, развитие реакций.',
        icon: <Sparkles className="w-6 h-6 text-sparta-gold" />,
        badge: 'Младшая группа',
        highlights: ['Игровой формат', 'Координация и моторика', 'Любовь к спорту'],
    },
    {
        age: '7–9 лет',
        title: 'Техника и фундаментальное мастерство',
        description: 'Ведение мяча, передача, финты, видение поля, первые турниры.',
        icon: <Zap className="w-6 h-6 text-sparta-gold" />,
        badge: 'Средняя группа',
        highlights: ['Ведение мяча и финты', 'Видение поля и точный пас', 'Первые турниры'],
    },
    {
        age: '10–14 лет',
        title: 'Тактическая и командная подготовка',
        description: 'Игровое мышление, позиции на поле, физическая форма, подготовка к просмотрам.',
        icon: <Trophy className="w-6 h-6 text-sparta-gold" />,
        badge: 'Старшая группа',
        highlights: ['Тактическое мышление', 'Выносливость и физо', 'Подготовка к просмотрам'],
    },
];

export const AgeGroupsSection: React.FC<AgeGroupsSectionProps> = ({ onOpenTrial }) => {
    return (
        <section id="age-groups" className="py-24 relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-sparta-gold/5 rounded-full blur-[130px] pointer-events-none" />

            <Container>
                <SectionHeader
                    title="ВОЗРАСТНЫЕ ГРУППЫ"
                    subtitle="Специализированные программы подготовки под каждый этап развития ребенка"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {ageGroups.map((group, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.15 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -6 }}
                            className="group relative rounded-[32px] bg-white/5 backdrop-blur-md border border-white/10 p-8 flex flex-col justify-between transition-all duration-300 hover:border-sparta-gold/50 hover:bg-white/[0.08] hover:shadow-[0_15px_35px_rgba(212,175,55,0.15)]"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <span className="font-russo text-3xl md:text-4xl text-sparta-gold tracking-tight">
                                        {group.age}
                                    </span>
                                    <div className="w-12 h-12 rounded-2xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-sparta-gold/20 transition-all">
                                        {group.icon}
                                    </div>
                                </div>

                                <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-wider mb-4">
                                    {group.badge}
                                </div>

                                <h3 className="font-russo text-xl text-white mb-3 group-hover:text-sparta-gold transition-colors">
                                    {group.title}
                                </h3>

                                <p className="font-manrope text-white/60 text-sm leading-relaxed mb-6">
                                    {group.description}
                                </p>

                                <ul className="space-y-2.5 mb-8">
                                    {group.highlights.map((item, i) => (
                                        <li key={i} className="flex items-center gap-2.5 text-xs md:text-sm font-manrope text-white/80">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sparta-gold shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <Button
                                    variant="outline"
                                    onClick={onOpenTrial}
                                    className="w-full text-sm group-hover:bg-sparta-gold group-hover:text-black group-hover:border-sparta-gold"
                                >
                                    <span>Записаться в группу</span>
                                    <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

export default AgeGroupsSection;
