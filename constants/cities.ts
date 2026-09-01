import { City, LocationItem } from '../types/city';

export const CITIES: City[] = [
    {
        id: 'chelyabinsk',
        name: 'Челябинск',
        shortName: 'Челябинск',
        status: 'active',
        isDefault: true,
        sortOrder: 1
    },
    {
        id: 'novosibirsk',
        name: 'Новосибирск',
        shortName: 'Новосибирск',
        status: 'active',
        isDefault: false,
        sortOrder: 2
    }
];

export const SPARTA_LOCATIONS: LocationItem[] = [
    // --- ЧЕЛЯБИНСК ---
    {
        id: 'newton',
        cityId: 'chelyabinsk',
        name: 'ОЦ «Ньютон»',
        shortName: 'Ньютон',
        address: 'ул. 250-летия Челябинска, 46',
        city: 'Челябинск',
        details: 'Главный вход через спортивный комплекс, 1 этаж',
        parking: 'Бесплатная парковка вдоль улицы и у здания школы',
        lat: 55.168134,
        lon: 61.284612,
        phone: '+7 (351) 230-12-69',
        badge: 'Северо-Запад',
        status: 'active',
        sortOrder: 1,
        href: 'https://yandex.ru/maps/?text=%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20250-%D0%BB%D0%B5%D1%82%D0%B8%D1%8F%20%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%D0%B0%2C%2046'
    },
    {
        id: 'tatischeva',
        cityId: 'chelyabinsk',
        name: 'Зал на Татищева',
        shortName: 'Татищева',
        address: 'ул. Татищева, 256',
        city: 'Челябинск',
        details: 'Спортивный зал SPARTA, отдельный вход',
        parking: 'Парковочная зона перед спортивным корпусом',
        lat: 55.172500,
        lon: 61.278900,
        phone: '+7 (351) 230-12-69',
        badge: 'Северо-Запад',
        status: 'active',
        sortOrder: 2,
        href: 'https://yandex.ru/maps/?text=%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%A2%D0%B0%D1%82%D0%B8%D1%89%D0%B5%D0%B2%D0%B0%2C%20256'
    },
    {
        id: 'chtz',
        cityId: 'chelyabinsk',
        name: 'Зал ЧТЗ (ул. Карпенко)',
        shortName: 'Карпенко (ЧТЗ)',
        address: 'ул. Карпенко, 5Б',
        city: 'Челябинск',
        details: 'Вход со двора здания, спортивный зал SPARTA',
        parking: 'Собственная стоянка перед входом в зал',
        lat: 55.160421,
        lon: 61.458923,
        phone: '+7 (351) 230-12-69',
        badge: 'ЧТЗ',
        status: 'active',
        sortOrder: 3,
        href: 'https://yandex.ru/maps/?text=%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%9A%D0%B0%D1%80%D0%BF%D0%B5%D0%BD%D0%BA%D0%BE%2C%205%D0%91'
    },
    {
        id: 'gagarin',
        cityId: 'chelyabinsk',
        name: 'ТК «Гагарин-Парк»',
        shortName: 'Гагарин-Парк',
        address: 'ул. Труда, 183',
        city: 'Челябинск',
        details: '4 этаж, «Островок Футбола», лифт/эскалатор',
        parking: 'Подземный паркинг ТК и открытая автостоянка',
        lat: 55.169820,
        lon: 61.371240,
        phone: '+7 (351) 230-12-69',
        badge: 'Центр',
        status: 'active',
        sortOrder: 4,
        href: 'https://yandex.ru/maps/?text=%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%A2%D1%80%D1%83%D0%B4%D0%B0%2C%20183'
    },

    // --- НОВОСИБИРСК ---
    {
        id: 'bolshevist',
        cityId: 'novosibirsk',
        name: 'Зал на Большевистской',
        shortName: 'Большевистская',
        address: 'ул. Большевистская, 131',
        city: 'Новосибирск',
        details: 'Главный спортивный комплекс SPARTA, 2 этаж',
        parking: 'Удобная парковка перед зданием комплекса',
        lat: 55.008400,
        lon: 82.952600,
        phone: '+7 (383) 209-12-69',
        badge: 'Октябрьский район',
        status: 'active',
        sortOrder: 1,
        href: 'https://yandex.ru/maps/?text=%D0%9D%D0%BE%D0%B2%D0%BE%D1%81%D0%B8%D0%B1%D0%B8%D1%80%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%B5%D0%B2%D0%B8%D1%81%D1%82%D1%81%D0%BA%D0%B0%D1%8F%2C%20131'
    },
    {
        id: 'myasnikova',
        cityId: 'novosibirsk',
        name: 'Зал на Мясниковой',
        shortName: 'Мясникова',
        address: 'ул. Мясниковой, 24',
        city: 'Новосибирск',
        details: 'Спортивный комплекс, сектор единоборств и футбола SPARTA',
        parking: 'Большая бесплатная автостоянка',
        lat: 55.093100,
        lon: 82.946300,
        phone: '+7 (383) 209-12-69',
        badge: 'Калининский район',
        status: 'active',
        sortOrder: 2,
        href: 'https://yandex.ru/maps/?text=%D0%9D%D0%BE%D0%B2%D0%BE%D1%81%D0%B8%D0%B1%D0%B8%D1%80%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%9C%D1%8F%D1%81%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2%D0%BE%D0%B9%2C%2024'
    }
];

export const LOCATIONS_BY_CITY: Record<string, LocationItem[]> = {
    chelyabinsk: SPARTA_LOCATIONS.filter(l => l.cityId === 'chelyabinsk'),
    novosibirsk: SPARTA_LOCATIONS.filter(l => l.cityId === 'novosibirsk')
};

