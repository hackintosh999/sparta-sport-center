export interface QuickCategory {
    id: string;
    label: string;
}

export const QUICK_CATEGORIES: QuickCategory[] = [
    { id: 'schedule', label: 'Вопрос по расписанию' },
    { id: 'payments', label: 'Оплата и абонементы' },
    { id: 'trial', label: 'Запись на пробное занятие' },
    { id: 'support', label: 'Техническая поддержка' },
    { id: 'other', label: 'Другое' }
];

export const QUICK_SUBJECTS: string[] = QUICK_CATEGORIES.map(c => c.label);

export const SUPPORT_FAQ = [
    {
        id: 1,
        question: 'Как записаться на пробное занятие?',
        answer: 'Нажмите на кнопку "Записаться на пробное занятие" на главной странице или свяжитесь с нами через чат поддержки.'
    },
    {
        id: 2,
        question: 'Какова стоимость абонементов?',
        answer: 'Подробную информацию о ценах вы можете найти в разделе "Услуги" или в вашем личном кабинете.'
    },
    {
        id: 3,
        question: 'Что взять с собой на первую тренировку?',
        answer: 'Удобную спортивную форму, сменную обувь и бутылку воды.'
    }
];
