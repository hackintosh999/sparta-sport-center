import React from 'react';
import { X } from 'lucide-react';
import { BaseModal } from './ui/BaseModal';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-3xl"
            showCloseButton={false}
            noPadding
            glowColor="amber"
        >
            <div className="bg-[#1a1a1a] rounded-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#151515]">
                    <h2 className="font-russo text-xl md:text-2xl text-white">Политика в отношении обработки персональных данных</h2>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
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
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-white mb-2">3. Оператор может обрабатывать следующие персональные данные</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Фамилия, имя, отчество;</li>
                            <li>Номера телефонов;</li>
                            <li>Адрес электронной почты;</li>
                            <li>Сведения о ребенке (имя, возраст).</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-base font-bold text-white mb-2">4. Цели обработки персональных данных</h3>
                        <p className="mb-2">Цель обработки персональных данных Пользователя — предоставление доступа к сервисам, информации и/или материалам, содержащимся на веб-сайте; запись на пробные и регулярные тренировки; информирование посредством отправки электронных писем и сообщений в мессенджерах.</p>
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
                        className="px-6 py-2 bg-sparta-gold text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors cursor-pointer"
                    >
                        Понятно
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default TermsModal;
