export type AttendanceStatus = 'PRESENT' | 'MISSED_BURNT' | 'EXCUSED' | 'present' | 'absent' | 'excused';

export interface AttendanceRecordItem {
    status: AttendanceStatus;
    childId: string;
    childName: string;
    parentId?: string;
    date: string; // YYYY-MM-DD
    time?: string;
    branchId: string;
    branchName?: string;
    groupId: string;
    groupName?: string;
    coachId?: string;
    coachName?: string;
    note?: string;
    medicalNoteUrl?: string;
    medicalNoteDays?: number;
    checkInTime?: string;
    timestamp?: any;
}

export interface GroupAttendanceDoc {
    groupId: string;
    groupName?: string;
    branchId?: string;
    date: string;
    records: Record<string, AttendanceRecordItem | any>;
    updatedAt: any;
}
