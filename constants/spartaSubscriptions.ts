import { SubscriptionPlan } from '../types/subscription';

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'plan_base_8',
        title: 'Базовый',
        description: '2 раза в неделю • 8 занятий в месяц. Основы техники, моторика, координация и базовая подготовка.',
        cityId: 'all',
        cityName: 'Все филиалы',
        branchId: 'all',
        branchName: 'Все филиалы',
        isUniversal: true,
        ageCategory: 'ALL',
        ageLabel: '3–14 лет',
        scheduleSlots: ['18:00 - 19:00', '19:00 - 20:00'],
        scheduleDays: '2 раза в неделю',
        type: 'sessions',
        totalSessions: 8,
        validityDays: 30,
        price: 5200,
        oldPrice: 6000,
        perSessionPrice: 650,
        isActive: true,
        isPopular: false,
        badge: 'Старт',
        features: [
            'Основы техники, моторика и координация',
            'Дневник юного футболиста с наклейками в подарок',
            'Сохранение и перенос занятий по справке'
        ],
        sortOrder: 1
    },
    {
        id: 'plan_intensiv_12',
        title: 'Интенсив',
        description: '3 раза в неделю • 12 занятий в месяц. Тактическая подготовка, турнирная практика и техника.',
        cityId: 'all',
        cityName: 'Все филиалы',
        branchId: 'all',
        branchName: 'Все филиалы',
        isUniversal: true,
        ageCategory: 'ALL',
        ageLabel: '3–14 лет',
        scheduleSlots: ['18:00 - 19:00', '19:00 - 20:00'],
        scheduleDays: '3 раза в неделю',
        type: 'sessions',
        totalSessions: 12,
        validityDays: 30,
        price: 7790,
        oldPrice: 9000,
        perSessionPrice: 649,
        isActive: true,
        isPopular: true,
        badge: 'Выбор большинства',
        features: [
            'Тактика, техника, удары и участие в матчах',
            'Скидка 15% на клубную форму в магазине',
            'Заморозка по болезни + дни на каникулы'
        ],
        sortOrder: 2
    },
    {
        id: 'plan_premium_14',
        title: 'Премиум',
        description: '12 групповых + 2 индивидуальные тренировки. Максимальный персональный результат с наставником.',
        cityId: 'all',
        cityName: 'Все филиалы',
        branchId: 'all',
        branchName: 'Все филиалы',
        isUniversal: true,
        ageCategory: 'ALL',
        ageLabel: '3–14 лет',
        scheduleSlots: ['18:00 - 19:00', '19:00 - 20:00'],
        scheduleDays: 'Групповые + Индивидуальные',
        type: 'sessions',
        totalSessions: 14,
        validityDays: 30,
        price: 11900,
        oldPrice: 14000,
        perSessionPrice: 850,
        isActive: true,
        isPopular: false,
        badge: 'VIP Наставничество',
        features: [
            'Персональная работа с наставником 1 на 1',
            'Фирменный аксессуар в подарок + скидка 25% в магазине',
            'Приоритетный выбор времени и заморозка до 21 дня'
        ],
        sortOrder: 3
    }
];

export const SPARTA_SUBSCRIPTIONS = DEFAULT_SUBSCRIPTION_PLANS;
export default DEFAULT_SUBSCRIPTION_PLANS;
