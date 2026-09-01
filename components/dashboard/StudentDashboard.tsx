import KidDashboard from './KidDashboard';
import AwardsPage from '../profile/AwardsPage';
import { TrophyStandCard } from '../profile/TrophyStandCard';
import { CertificateCard } from '../profile/CertificateCard';
import { CertificateLightboxModal } from '../profile/CertificateLightboxModal';
import { useStudentAchievements } from '../../hooks/useStudentAchievements';

export { KidDashboard, KidDashboard as StudentDashboard };
export { AwardsPage, AwardsPage as TrophiesGallery };
export { TrophyStandCard };
export { CertificateCard };
export { CertificateLightboxModal };
export { StudentCardModal } from '../profile/StudentCardModal';
export { SidebarProfile } from '../profile/SidebarProfile';
export { AwardDetailModal } from '../profile/AwardDetailModal';
export { AdminAwardsManager } from '../admin/AdminAwardsManager';
export { BadgeCard } from './BadgeCard';
export { BadgeDetailModal } from './BadgeDetailModal';
export { useStudentAchievements };
export type { SpartanBadge } from './BadgeCard';

export default KidDashboard;
