import { db } from '../firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { SPARTA_SCHEDULE } from '../constants/spartaSchedule';

const DAYS_OF_WEEK = [
    { day: 'Понедельник', order: 1, aliases: ['пн', 'понедельник', 'mon', 'monday'] },
    { day: 'Вторник', order: 2, aliases: ['вт', 'вторник', 'tue', 'tuesday'] },
    { day: 'Среда', order: 3, aliases: ['ср', 'среда', 'wed', 'wednesday'] },
    { day: 'Четверг', order: 4, aliases: ['чт', 'четверг', 'thu', 'thursday'] },
    { day: 'Пятница', order: 5, aliases: ['пт', 'пятница', 'fri', 'friday'] },
    { day: 'Суббота', order: 6, aliases: ['сб', 'суббота', 'sat', 'saturday'] },
    { day: 'Воскресенье', order: 7, aliases: ['вс', 'воскресенье', 'sun', 'sunday'] }
];

export const triggerScheduleSync = async () => {
    console.log('Synchronizing groups schedule to general timetable...');
    try {
        // 1. Fetch current groups from Firestore
        const groupsSnapshot = await getDocs(collection(db, 'groups'));
        const groups = groupsSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

        // 2. Fetch existing schedule days to preserve document IDs if any
        const scheduleSnapshot = await getDocs(collection(db, 'schedule'));
        const existingScheduleDocs: Record<string, string> = {}; // dayName -> docId
        scheduleSnapshot.docs.forEach(d => {
            const data = d.data();
            if (data.day) {
                existingScheduleDocs[data.day.toLowerCase()] = d.id;
            }
        });

        // 3. Build day-by-day timetable
        const timetableByDay: Record<string, any[]> = {
            'Понедельник': [],
            'Вторник': [],
            'Среда': [],
            'Четверг': [],
            'Пятница': [],
            'Суббота': [],
            'Воскресенье': []
        };

        // If groups exist with schedule items, aggregate from groups
        if (groups.length > 0) {
            groups.forEach(group => {
                const groupName = group.name || 'Спортивная группа';
                const coachName = group.coachName || 'Тренер Спарта';
                const scheduleList = Array.isArray(group.schedule) ? group.schedule : [];

                scheduleList.forEach((slot: any, idx: number) => {
                    const slotDay = slot.day || 'Понедельник';
                    const matchedDay = DAYS_OF_WEEK.find(d => 
                        d.day.toLowerCase() === slotDay.toLowerCase() ||
                        d.aliases.some(a => slotDay.toLowerCase().includes(a))
                    );

                    const targetDayName = matchedDay ? matchedDay.day : 'Понедельник';
                    const timeRange = slot.endTime 
                        ? `${slot.time || '18:00'} - ${slot.endTime}` 
                        : (slot.time || '18:00 - 19:30');

                    timetableByDay[targetDayName].push({
                        id: `${group.id}_slot_${idx}`,
                        time: timeRange,
                        title: groupName,
                        trainer: coachName,
                        type: 'Групповая',
                        location: slot.location || 'Главный зал',
                        activity: slot.activity || 'Футбол'
                    });
                });
            });
        } else {
            // Fallback: Populate directly from SPARTA_SCHEDULE constant
            SPARTA_SCHEDULE.forEach((slot) => {
                DAYS_OF_WEEK.forEach(d => {
                    const hasDay = d.aliases.some(a => slot.days.toLowerCase().includes(a));
                    if (hasDay) {
                        timetableByDay[d.day].push({
                            id: `sparta_slot_${slot.id}_${d.order}`,
                            time: slot.time,
                            title: `${slot.coachTitle ? slot.coachTitle + ' • ' : ''}${slot.ageGroupLabel}`,
                            trainer: slot.coachName,
                            type: 'Групповая',
                            location: 'Главный зал',
                            activity: 'Футбол'
                        });
                    }
                });
            });
        }

        // 4. Commit to Firestore in a batch
        const batch = writeBatch(db);

        DAYS_OF_WEEK.forEach(dayConfig => {
            const dayItems = timetableByDay[dayConfig.day] || [];

            // Sort items chronologically by start time
            dayItems.sort((a, b) => {
                const timeA = (a.time || '').slice(0, 5);
                const timeB = (b.time || '').slice(0, 5);
                return timeA.localeCompare(timeB);
            });

            const existingDocId = existingScheduleDocs[dayConfig.day.toLowerCase()];
            const docRef = existingDocId 
                ? doc(db, 'schedule', existingDocId)
                : doc(collection(db, 'schedule'));

            batch.set(docRef, {
                day: dayConfig.day,
                order: dayConfig.order,
                items: dayItems,
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();
        console.log('✓ General schedule synchronized successfully with groups!');
        return { success: true };
    } catch (error: any) {
        console.error('Error synchronizing schedule:', error);
        return { success: false, error: error.message };
    }
};

export const triggerReverseSync = async (dayName?: string) => {
    console.log('Triggering reverse schedule sync...', dayName);
    return { success: true };
};
