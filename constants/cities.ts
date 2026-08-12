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
        id: 'miass',
        name: 'Миасс',
        shortName: 'Миасс',
        status: 'active',
        sortOrder: 2
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
        badge: 'Главный корпус',
        href: 'https://yandex.ru/maps/?rtext=~55.168134,61.284612&rtt=auto'
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
        href: 'https://yandex.ru/maps/?rtext=~55.160421,61.458923&rtt=auto'
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
        badge: 'Центральный зал',
        href: 'https://yandex.ru/maps/?rtext=~55.169820,61.371240&rtt=auto'
    },
    {
        id: 'miass_ecotime',
        cityId: 'miass',
        name: 'СК «Экотайм»',
        shortName: 'Экотайм',
        address: 'ул. 8 Марта, 150',
        city: 'Миасс',
        details: 'Спортивный арена-комплекс, 1 этаж',
        parking: 'Бесплатная парковка перед спортивным комплексом',
        lat: 55.048000,
        lon: 60.108000,
        phone: '+7 (351) 230-12-69',
        badge: 'Филиал Миасс',
        href: 'https://yandex.ru/maps/?rtext=~55.048000,60.108000&rtt=auto'
    }
];

export const LOCATIONS_BY_CITY: Record<string, LocationItem[]> = {
    chelyabinsk: SPARTA_LOCATIONS.filter(l => l.cityId === 'chelyabinsk'),
    miass: SPARTA_LOCATIONS.filter(l => l.cityId === 'miass')
};
