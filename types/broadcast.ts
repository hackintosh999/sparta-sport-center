export type StreamSourceType = 'direct_camera' | 'direct_hls' | 'vk' | 'youtube' | 'rutube' | 'video_file';
export type BroadcastStatus = 'live' | 'scheduled' | 'finished';

export interface Broadcast {
    id: string;
    title: string;
    description?: string;
    status?: BroadcastStatus;
    isLive?: boolean;
    isScheduled?: boolean;
    streamSourceType?: StreamSourceType;
    videoUrl?: string;
    streamUrl?: string;
    webrtcRoomId?: string;
    
    // Match metadata
    tournamentName?: string;
    opponentName?: string;
    opponentLogo?: string;
    ageCategory?: string; // e.g. '2017-2018', '2015-2016', '2019-2020', 'all'
    locationName?: string;
    coachName?: string;
    
    // Live Scoreboard
    scoreSparta?: number;
    scoreOpponent?: number;
    matchTime?: string; // e.g. '1-й тайм 18'', 'Перерыв', '2-й тайм 35''
    
    // Timing
    scheduledStartTime?: any; // Firestore Timestamp or ISO string
    scheduledAt?: any;
    date?: any;
    createdAt?: any;
    updatedAt?: any;
    
    // Media & Stats
    thumbnailUrl?: string;
    viewersCount?: number;
    tags?: string[];
    
    // Interactive
    mvpCandidates?: string[];
    mvpVotes?: { [candidateName: string]: number };
}
