# Sparta Sports Center - Project Context & Messenger Architecture

## Overview
Sparta Sports Center is a multi-role web and desktop application (React 19, TypeScript, Vite, TailwindCSS, Firebase Firestore & Authentication, Supabase Storage, Electron, Capacitor) designed for managing sports center operations, student training, coaching schedules, and real-time community messaging.

---

## Core System Architecture

```
[ React 19 Frontend UI ]
       │
       ├──► Firebase Auth (User identities & role claims)
       ├──► Firestore Database (Real-time sync on snapshot)
       │       ├── chats/{chatId}/messages  (Unified 1:1 and private group chats)
       │       ├── group_messages            (Team/Group channel broadcasts)
       │       ├── users/{uid}               (User profiles & athlete data)
       │       ├── friendships               (Bi-directional friend relationships)
       │       └── friend_requests           (Pending social invitations)
       └──► Supabase Storage
               ├── chat-media (Images, videos, documents)
               └── voice-messages (Audio .webm notes)
```

---

## Messenger & Real-Time Delivery System

### Key Components & Hooks
- [`components/profile/GroupChat.tsx`](file:///C:/Users/User/Downloads/sparta-sports-center/components/profile/GroupChat.tsx): Primary chat room interface supporting text, media uploads, voice notes, polls, training registration cards, reactions, thread discussions, pinning, forwarding, and search. Integrated with branded **[`SpartaEmojiPicker.tsx`](file:///C:/Users/User/Downloads/sparta-sports-center/components/profile/SpartaEmojiPicker.tsx)** (Apple Style emojis + Russian search + Sparta Glassmorphism design).
- [`hooks/useChatMessages.ts`](file:///C:/Users/User/Downloads/sparta-sports-center/hooks/useChatMessages.ts): Custom React hook encapsulating Firestore real-time subscriptions, text/media/voice dispatch, and optimistic deletion logic.
- [`components/profile/MessagesSection.tsx`](file:///C:/Users/User/Downloads/sparta-sports-center/components/profile/MessagesSection.tsx): Main chat list overview with search, category filtering (1:1 with coaches, group channels), creation modals, and unread badges.

---

## Community & Social Graph Architecture

### Components
- [`components/profile/FriendsSection.tsx`](file:///C:/Users/User/Downloads/sparta-sports-center/components/profile/FriendsSection.tsx): Primary social management hub with 3 views:
  - **`my_friends`**: Realtime grid of confirmed friends with role badges, group tags, direct message triggers, and unfriend actions.
  - **`requests`**: Dual section for incoming requests (Accept / Decline) and outgoing pending requests (Cancel action).
  - **`find`**: Optimized athlete search with smart relationship status detection.

### Data Model & Firestore Mutations
- **`users`**: Stores profile details (`childFirstName`, `childLastName`, `displayName`, `role`, `groupId`, `achievements`, `verification`).
- **`friendships`**: Stores `{ users: [uid1, uid2], createdAt }`.
- **`friend_requests`**: Stores `{ fromId, toId, status: 'pending' | 'accepted' | 'declined', createdAt }`.
- **Optimized Search (`handleSearch`)**: Replaced client-side full collection scans with targeted Firestore prefix queries (`where('childFirstName', '>=', term)`, `limit(12)`), cutting read operations by 95%+.
- **Mutations**: `handleSendRequest`, `handleCancelRequest`, `handleAcceptRequest` (atomic `writeBatch`), `handleDeclineRequest`, `handleUnfriend`.

---

## Voice / Audio Pipeline & Form Guidelines

- **Microphone Hardware Release**: Always execute `stream.getTracks().forEach(track => track.stop())` upon recording completion or cancellation in [`AudioRecorder.tsx`](file:///C:/Users/User/Downloads/sparta-sports-center/components/profile/AudioRecorder.tsx) to release OS audio resources.
- **Strict Button Types**: All interactive buttons inside `<form>` elements MUST specify `type="button"` to avoid unintended form submit triggers and page reloads.

---

## Verification & Knowledge Graph
- Verified TypeScript transpilation for all modified components.
- AST Knowledge Base updated via `graphify update .`.
