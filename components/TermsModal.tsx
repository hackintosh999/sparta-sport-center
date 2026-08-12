import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-white/10 shadow-2xl pointer-events-auto flex flex-col">
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#151515]">
                                <h2 className="font-russo text-xl md:text-2xl text-white">Политика в отношении обработки персональных данных</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8 overflow-y-auto font-manrope text-white/80 space-y-6 custom-scrollbar text-sm leading-relaxed">
                                <section>
                                    <h3 className="text-base font-bold text-white mb-2">1. Общие положения</h3>
                                    <p className="mb-2">Настоящая политика обработки персональных данных составлена в соответствии с требованиями Федерального закона от 27.07.2006. № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые ИП Лебедева Ксения Александровна (далее — Оператор).</p>
                                    <p className="mb-2">1.1. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну.</p>
                                    <p>1.2. Настоящая политика применяется ко всей информации, которую Оператор может получить о посетителях веб-сайта.</p>
                                </section>

                                <section>
                                    <h3 className="text-base font-bold text-white mb-2">2. Основные понятия, используемые в Политике</h3>
                                    <ul className="space-y-2">
                                        <li>2.1. Автоматизированная обработка персональных данных — обработка персональных данных с помощью средств вычислительной техники.</li>
                                        <li>2.2. Блокирование — временное прекращение обработки персональных данных.</li>
                                        <li>2.3. Веб-сайт — совокупность графических и информационных материалов, обеспечивающих их доступность в сети интернет.</li>
                                        <li>2.4. Информационная система персональных данных — совокупность содержащихся в базах данных персональных данных.</li>
                                        <li>2.5. Обезличивание — действия, в результате которых невозможно определить принадлежность персональных данных.</li>
                                        <li>2.6. Обработка персональных данных — любое действие с персональными данными.</li>
                                        <li>2.7. Оператор — лицо, организующее и/или осуществляющее обработку персональных данных.</li>
                                        <li>2.8. Персональные данные — любая информация, относящаяся прямо или косвенно к определенному Пользователю.</li>
                                        <li>2.10. Пользователь — любой посетитель веб-сайта.</li>
                                        <li>2.11. Предоставление персональных данных — действия, направленные на раскрытие данных определенному лицу.</li>
                                        <li>2.12. Распространение персональных данных — действия, направленные на раскрытие данных неопределенному кругу лиц.</li>
                                        <li>2.14. Уничтожение персональных данных — действия, в результате которых данные уничтожаются безвозвратно.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-base font-bold text-white mb-2">3. Основные права и обязанности Оператора</h3>
                                    <p className="mb-2"><strong>3.1. Оператор имеет право:</strong> получать достоверные информацию; продолжить обработку при отзыве согласия при наличии законных оснований; самостоятельно определять состав мер для защиты данных.</p>
                                    <p><strong>3.2. Оператор обязан:</strong> предоставлять информацию касающуюся обработки; организовывать обработку в соответствии с законодательством РФ; отвечать на обращения и запросы; принимать меры для защиты данных.</p>
                                </section>

                                <section>
                                    <h3 className="text-base font-bold text-white mb-2">4. Основные права и обязанности субъектов</h3>
                                    <p className="mb-2"><strong>4.1. Субъекты имеют право:</strong> получать информацию об обработке, требовать уточнения данных, отзывать согласие и обжаловать действия Оператора.</p>
                                    <p className="mb-2"><strong>4.2. Субъекты обязаны:</strong> предоставлять достоверные данные и сообщать об их обновлении.</p>
                                </section>

                                <section>
                                    <h3 className="text-base font-bold text-white mb-2">5. Принципы обработки персональных данных</h3>
                                    <p className="mb-2">Обработка осуществляется на законной и справедливой основе. Сбор данных ограничен достижением конкретных законных целей.</p>
                                    <p>Хранение осуществляется в форме, позволяющей определить субъекта, не дольше, чем этого требуют цели обработки.</p>
                                </section>

                                <section>
                                    <h3 className="text-base font-bold text-white mb-2">6. Цели обработки персональных данных</h3>
                                    <p className="mb-2"><strong>Цель обработки:</strong> заключение, исполнение и прекращение гражданско-правовых договоров.</p>
                                    <p className="mb-2"><strong>Персональные данные:</strong> фамилия, имя, отчество, номера телефонов.</p>
                                    <p><strong>Виды обработки:</strong> сбор, запись, систематизация, накопление, хранение, уничтожение и обезличивание.</p>
                                </section>

                                <section>
                                    <h3 className="text-base font-bold text-white mb-2">7-10. Условия, порядок сбора и передачи</h3>
                                    <p className="mb-2">Безопасность персональных данных обеспечивается путем реализации правовых, организационных и технических мер.</p>
                                    <p className="mb-2">Персональные данные никогда, ни при каких условиях не будут переданы третьим лицам, за исключением случаев, связанных с исполнением действующего законодательства.</p>
                                    <p>Пользователь может в любой момент отозвать свое согласие, направив Оператору уведомление на электронный адрес <strong>bugrova.k@bk.ru</strong>.</p>
                                </section>

                                <section>
                                    <h3 className="text-base font-bold text-white mb-2">12. Заключительные положения</h3>
                                    <p className="mb-2">12.1. Пользователь может получить любые разъяснения по интересующим вопросам, обратившись к Оператору по почте: bugrova.k@bk.ru.</p>
                                    <p>12.2. В данном документе будут отражены любые изменения политики обработки персональных данных. Политика действует бессрочно до замены ее новой версией.</p>
                                </section>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-white/10 bg-[#151515] flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 bg-sparta-gold text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors"
                                >
                                    Понятно
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TermsModal;
