export interface ScheduleSlot {
    id: string;
    coachName: string;
    coachTitle: string;
    coachPhoto: string;
    birthYears: number[];
    ageGroupLabel: string;
    days: string;
    time: string;
    streamType: 'weekday' | 'weekend';
    streamTitle: string;
    physioBadge?: string;
    maxCapacity: number;
    initialOccupied: number;
}

export const SPARTA_SCHEDULE: ScheduleSlot[] = [
    {
        id: 'yakupov_1',
        coachName: 'Якупов Павел Валерьевич',
        coachTitle: 'Главный тренер (Категория UEFA)',
        coachPhoto: '/pavel-yakupov-gold.png',
        birthYears: [2016, 2017, 2018],
        ageGroupLabel: '2016–2018 г.р. (6–8 лет)',
        days: 'Пн, Ср, Пт',
        time: '19:00 - 20:00',
        streamType: 'weekday',
        streamTitle: 'Группа в будние дни (вечер)',
        physioBadge: '⚡ Оптимальное время после школы',
        maxCapacity: 30,
        initialOccupied: 28
    },
    {
        id: 'kubar_1',
        coachName: 'Кубарь Сергей Игоревич',
        coachTitle: 'Тренер по отработке техники',
        coachPhoto: '/sergey-kubar-gold.png',
        birthYears: [2014, 2015],
        ageGroupLabel: '2014–2015 г.р. (9–10 лет)',
        days: 'Пн, Ср, Пт',
        time: '20:00 - 21:00',
        streamType: 'weekday',
        streamTitle: 'Группа в будние дни (вечер)',
        physioBadge: '🔋 Спортивная разгрузка после уроков',
        maxCapacity: 20,
        initialOccupied: 18
    },
    {
        id: 'ponomarev_1',
        coachName: 'Пономарев Сергей Александрович',
        coachTitle: 'Старший тренер школы',
        coachPhoto: '/sergey-ponomarev.png',
        birthYears: [2012, 2013],
        ageGroupLabel: '2012–2013 г.р. (11–12 лет)',
        days: 'Пн, Ср, Пт',
        time: '20:00 - 21:00',
        streamType: 'weekday',
        streamTitle: 'Группа в будние дни (вечер)',
        physioBadge: '🔋 Спортивная разгрузка после уроков',
        maxCapacity: 20,
        initialOccupied: 16
    },
    {
        id: 'ponomarev_2',
        coachName: 'Пономарев Сергей Александрович',
        coachTitle: 'Старший тренер школы',
        coachPhoto: '/sergey-ponomarev.png',
        birthYears: [2014, 2015],
        ageGroupLabel: '2014–2015 г.р. (9–10 лет)',
        days: 'Пн, Ср, Пт',
        time: '19:00 - 20:00',
        streamType: 'weekday',
        streamTitle: 'Группа в будние дни (вечер)',
        maxCapacity: 20,
        initialOccupied: 16
    },
    {
        id: 'ponomarev_3',
        coachName: 'Пономарев Сергей Александрович',
        coachTitle: 'Старший тренер школы',
        coachPhoto: '/sergey-ponomarev.png',
        birthYears: [2016, 2017],
        ageGroupLabel: '2016–2017 г.р. (7–8 лет)',
        days: 'Сб, Вс',
        time: '13:00 - 14:00',
        streamType: 'weekend',
        streamTitle: 'Группа выходного дня',
        maxCapacity: 25,
        initialOccupied: 22
    },
    {
        id: 'ponomarev_4',
        coachName: 'Пономарев Сергей Александрович',
        coachTitle: 'Старший тренер школы',
        coachPhoto: '/sergey-ponomarev.png',
        birthYears: [2018, 2019, 2020],
        ageGroupLabel: '2018–2020 г.р. (4–6 лет)',
        days: 'Сб, Вс',
        time: '12:00 - 13:00',
        streamType: 'weekend',
        streamTitle: 'Группа выходного дня',
        physioBadge: '☀️ Дневное время перед обедом',
        maxCapacity: 20,
        initialOccupied: 17
    },
    {
        id: 'ponomarev_5',
        coachName: 'Пономарев Сергей Александрович',
        coachTitle: 'Старший тренер школы',
        coachPhoto: '/sergey-ponomarev.png',
        birthYears: [2012, 2013, 2014, 2015],
        ageGroupLabel: '2012–2015 г.р. (9–12 лет)',
        days: 'Сб, Вс',
        time: '14:00 - 15:00',
        streamType: 'weekend',
        streamTitle: 'Группа выходного дня',
        maxCapacity: 20,
        initialOccupied: 14
    }
];

export const declineChildName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return 'ребёнка';
    const lower = trimmed.toLowerCase();
    
    if (lower === 'артем' || lower === 'артём') return 'Артёма';
    if (lower === 'миша') return 'Миши';
    if (lower === 'даша') return 'Даши';
    if (lower === 'саша') return 'Саши';
    
    const lastChar = trimmed.slice(-1).toLowerCase();
    if (lastChar === 'а') return trimmed.slice(0, -1) + 'и';
    if (lastChar === 'я') return trimmed.slice(0, -1) + 'и';
    if (lastChar === 'й') return trimmed.slice(0, -1) + 'я';
    if (['б', 'в', 'г', 'д', 'ж', 'з', 'к', 'л', 'м', 'н', 'п', 'р', 'с', 'т', 'ф', 'х', 'ц', 'ч', 'ш', 'щ'].includes(lastChar)) {
        return trimmed + 'а';
    }
    return trimmed;
};
