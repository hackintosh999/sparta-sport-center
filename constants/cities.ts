import { City, LocationItem } from '../types/city';

export const CITIES: City[] = [
    {
        id: 'chelyabinsk',
        name: 'Челябинск',
        shortName: 'Челябинск',
        status: 'active',
        isDefault: true,
        sortOrder: 1
    }
];

export const SPARTA_LOCATIONS: LocationItem[] = [
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
        href: 'https://yandex.ru/maps/?text=%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20250-%D0%BB%D0%B5%D1%82%D0%B8%D1%8F%20%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%D0%B0%2C%2046'
    },
    {
        id: 'chtz',
        cityId: 'chelyabinsk',
        name: 'Зал ЧТЗ',
        shortName: 'ЧТЗ',
        address: 'ул. Карпенко, 5Б',
        city: 'Челябинск',
        details: 'Вход со двора здания, спортивный зал SPARTA',
        parking: 'Собственная стоянка перед входом в зал',
        lat: 55.160421,
        lon: 61.458923,
        phone: '+7 (351) 230-12-69',
        badge: 'ЧТЗ',
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
        href: 'https://yandex.ru/maps/?text=%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%A2%D1%80%D1%83%D0%B4%D0%B0%2C%20183'
    }
];


export const LOCATIONS_BY_CITY: Record<string, LocationItem[]> = {
    chelyabinsk: SPARTA_LOCATIONS.filter(l => l.cityId === 'chelyabinsk')
};

