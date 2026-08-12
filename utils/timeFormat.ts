/**
 * Formats user presence timestamp into relative Russian text
 */
export const formatLastSeen = (lastSeen: any, isOnline?: boolean): string => {
    if (isOnline) {
        return 'в сети';
    }

    if (!lastSeen) {
        return '';
    }

    let date: Date;
    if (typeof lastSeen.toDate === 'function') {
        date = lastSeen.toDate();
    } else if (lastSeen.seconds) {
        date = new Date(lastSeen.seconds * 1000);
    } else if (lastSeen instanceof Date) {
        date = lastSeen;
    } else if (typeof lastSeen === 'number' || typeof lastSeen === 'string') {
        date = new Date(lastSeen);
    } else {
        return '';
    }

    if (isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Pad zero helper
    const pad = (n: number) => n.toString().padStart(2, '0');
    const hoursStr = pad(date.getHours());
    const minStr = pad(date.getMinutes());
    const timeStr = `${hoursStr}:${minStr}`;

    // Plural helper for Russian minutes
    const getMinuteWord = (n: number) => {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod100 >= 11 && mod100 <= 19) return 'минут';
        if (mod10 === 1) return 'минуту';
        if (mod10 >= 2 && mod10 <= 4) return 'минуты';
        return 'минут';
    };

    if (diffMin < 1) {
        return 'был(а) только что';
    }

    if (diffMin < 60) {
        return `был(а) ${diffMin} ${getMinuteWord(diffMin)} назад`;
    }

    const isToday =
        now.getDate() === date.getDate() &&
        now.getMonth() === date.getMonth() &&
        now.getFullYear() === date.getFullYear();

    if (isToday) {
        return `был(а) сегодня в ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        yesterday.getDate() === date.getDate() &&
        yesterday.getMonth() === date.getMonth() &&
        yesterday.getFullYear() === date.getFullYear();

    if (isYesterday) {
        return `был(а) вчера в ${timeStr}`;
    }

    const dayStr = pad(date.getDate());
    const monthStr = pad(date.getMonth() + 1);
    const yearStr = date.getFullYear();

    return `был(а) ${dayStr}.${monthStr}.${yearStr} в ${timeStr}`;
};
