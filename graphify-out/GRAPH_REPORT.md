# Graph Report - sparta-sports-center  (2026-08-24)

## Corpus Check
- 301 files · ~9,002,641 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1656 nodes · 2450 edges · 192 communities (125 shown, 67 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `018df07a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LandingPage.tsx
- LearningService
- App.tsx
- JsonFileBackend
- compilerOptions
- useAuth
- NewsModal.tsx
- swarm-hooks.sh
- CoachSection.tsx
- UIComponents.tsx
- db
- devDependencies
- FavoritesContext.tsx
- Dashboard.tsx
- GroupChat.tsx
- metrics-db.mjs
- statusline.js
- shop.ts
- AdminMessages.tsx
- UserRequests.tsx
- ParentDashboard.tsx
- AuthContext.tsx
- learning-hooks.sh
- swarm-comms.sh
- daemon-manager.sh
- SmartEnrollmentWizard.tsx
- ProductDetails.tsx
- scripts
- dependencies
- auto-commit.sh
- sync-v3-metrics.sh
- AdminNews.tsx
- Broadcasts.tsx
- AchievementsList.tsx
- storage.ts
- package.json
- adr-compliance.sh
- swarm-monitor.sh
- AdminUsers.tsx
- CartContext.tsx
- SoundManager
- checkpoint-manager.sh
- memory.js
- claude-flow
- perf-worker.sh
- router.js
- worker-manager.sh
- react
- security-scanner.sh
- session.js
- AdminShop.tsx
- ddd-tracker.sh
- learning-optimizer.sh
- standard-checkpoint-hooks.sh
- validate-v3-config.sh
- AdminAIConsole.tsx
- DailyHub.tsx
- MessagesSection.tsx
- server.js
- AdminScanner.tsx
- StatsLab.tsx
- health-monitor.sh
- pattern-consolidator.sh
- TrialsTab.tsx
- ShopReceipt.tsx
- Viewer3D.tsx
- files
- AdminTeam.tsx
- github-safe.js
- statusline-hook.sh
- DocumentViewerModal.tsx
- clean_files.js
- vercel.json
- @capacitor/android
- express
- @capacitor/core
- github-setup.sh
- guidance-hook.sh
- guidance-hooks.sh
- post-commit
- pre-commit
- quick-start.sh
- setup-mcp.sh
- update-v3-progress.sh
- v3.sh
- v3-quick-status.sh
- concurrently
- cors
- date-fns
- ScheduleSection.tsx
- electron-is-dev
- emoji-picker-react
- DirectorDashboard.tsx
- @eslint/js
- TopUpModal.tsx
- generate-svg-dance-lotus.mjs
- generate-svg-sparta-duo-concept.mjs
- generate-svg-sparta-tennis.mjs
- html2canvas
- generate-svg-stage-realism.mjs
- qrcode
- export-all-posters-master.mjs
- generate-svg-dance-lotus-editorial.mjs
- lottie-react
- generate-svg-editorial.mjs
- SpartaMediaGalleryModal.tsx
- generate-svg-complete.mjs
- MediaUploadTrayModal.tsx
- export-pdf-camp.mjs
- export-pdf-dance.mjs
- react-router-dom
- export-pdf-dance-editorial.mjs
- export-pdf-dance-lotus.mjs
- @supabase/supabase-js
- three
- export-pdf-dance-lotus-editorial.mjs
- @types/express
- @types/three
- uuid
- export-pdf-dance-magazine.mjs
- export-pdf-dance-modern.mjs
- export-pdf-sparta-a4.mjs
- tsx
- export-pdf-sparta-duo-concept.mjs
- @typescript-eslint/eslint-plugin
- export-pdf-sparta-duo-rollup.mjs
- export-pdf-sparta-tennis.mjs
- export-pdf-stage-realism.mjs
- slice-3d-icons.mjs
- AnnouncementModal.tsx
- AdminTeam.tsx
- capture-banners.mjs
- capture-banners-puppeteer.mjs
- capture-camp-banner.mjs
- capture-complete-banner.mjs
- capture-dance-banner.mjs
- capture-grunge-banner.mjs
- capture-pinterest-banner.mjs
- export-pdf-sparta-football.mjs
- export-pdf-sparta-tennis-mint.mjs
- extract-transparent-petals.mjs
- figma-generate-banners.js
- process-petals-transparent.mjs
- sync-html.mjs
- Ruflo — Claude Code Configuration
- robokassa-result.js
- concurrently
- framer-motion
- firebase
- NewsSection.tsx
- Global Constraints
- AdminReviews.tsx
- Best Practices
- Monitoring & Insights
- AdminNews.tsx
- BonusModal.tsx
- ProfileSetupModal.tsx
- scratch_clean.js
- scratch_fix_final.js
- ActiveChat.tsx
- @capacitor/core
- start.sh
- llm-council
- STORYBOARD: Sparta Sports Center Showcase (40s)
- Sparta Sports Center - Video Brief

## God Nodes (most connected - your core abstractions)
1. `db` - 94 edges
2. `useAuth()` - 90 edges
3. `SPARTA_SCHEDULE` - 21 edges
4. `Button()` - 20 edges
5. `compilerOptions` - 16 edges
6. `safeLocalStorage` - 15 edges
7. `scripts` - 12 edges
8. `supabase` - 12 edges
9. `Container()` - 11 edges
10. `useCity()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `BroadcastChat()` --calls--> `useAuth()`  [EXTRACTED]
  components/BroadcastChat.tsx → context/AuthContext.tsx
- `ChildBenefitsSection()` --calls--> `useAuth()`  [EXTRACTED]
  components/ChildBenefitsSection.tsx → context/AuthContext.tsx
- `GroupsSection()` --calls--> `useAuth()`  [EXTRACTED]
  components/GroupsSection.tsx → context/AuthContext.tsx
- `Navbar()` --calls--> `useAuth()`  [EXTRACTED]
  components/LandingPage.tsx → context/AuthContext.tsx
- `LocationCard()` --calls--> `useCity()`  [EXTRACTED]
  components/LandingPage.tsx → context/CityContext.tsx

## Import Cycles
- None detected.

## Communities (192 total, 67 thin omitted)

### Community 0 - "LandingPage.tsx"
Cohesion: 0.08
Nodes (20): COACHES, FAQS, FEATURES, getPriceInfo(), getProgramImage(), LocationCard(), NAV_ITEMS, Navbar() (+12 more)

### Community 1 - "LearningService"
Cohesion: 0.13
Nodes (13): ParentAccountSetupModalProps, MagicTransfer(), MagicTransferProps, TransferMode, TrialModal(), TrialModalProps, app, auth (+5 more)

### Community 2 - "App.tsx"
Cohesion: 0.05
Nodes (36): AdminAchievements, AdminBans, AdminBroadcasts, AdminComments, AdminDashboard, AdminDirections, AdminFinance, AdminGroups (+28 more)

### Community 4 - "compilerOptions"
Cohesion: 0.06
Nodes (33): ./*, build, DOM, DOM.Iterable, e2e, ES2022, node, node_modules (+25 more)

### Community 5 - "useAuth"
Cohesion: 0.24
Nodes (9): AdminRoute(), DirectorRoute(), AuthContext, AuthContextType, AuthProvider(), isSuperDeveloper(), SUPER_DEVELOPER_EMAILS, root (+1 more)

### Community 6 - "NewsModal.tsx"
Cohesion: 0.09
Nodes (21): APPLE_EMOJI_CATEGORIES, AuthorRole, EMOJI_KEYWORDS, KidDashboard(), KidDashboardProps, MediaItem, MONTHS_LIST, PersonalTask (+13 more)

### Community 7 - "swarm-hooks.sh"
Cohesion: 0.09
Nodes (34): AuthModal(), AuthModalProps, GroupsSection(), generateGostQrString(), MembershipModal(), SPARTA_BANK_DETAILS, AttendanceSectionProps, DAYS_META (+26 more)

### Community 8 - "CoachSection.tsx"
Cohesion: 0.13
Nodes (12): ChatAttachmentMenu(), ChatAttachmentMenuProps, ChatParticipant, MessagesTabProps, CoachChat(), CoachChatProps, ThemeToggle(), Theme (+4 more)

### Community 9 - "UIComponents.tsx"
Cohesion: 0.10
Nodes (14): TrialRequest, TrialsTabProps, LinkingRequest, LinkingRequestBanner(), MembershipReceiptProps, ProgressSectionProps, ShopReceiptProps, Button() (+6 more)

### Community 10 - "db"
Cohesion: 0.08
Nodes (7): DeveloperConsoleProps, NotificationCategory, NotificationsModalProps, ActivitySectionProps, RequestDetailsModalProps, db, PromoCode

### Community 11 - "devDependencies"
Cohesion: 0.04
Nodes (49): autoprefixer, electron, electron-builder, electron-is-dev, electron-serve, eslint-plugin-react, devDependencies, autoprefixer (+41 more)

### Community 12 - "FavoritesContext.tsx"
Cohesion: 0.05
Nodes (55): CartSidebar(), ReviewCommentsDrawer(), ReviewCommentsDrawerProps, ThreadNode, getRepliesPlural(), QUICK_REPLIES, ReviewMediaModal(), ReviewMediaModalProps (+47 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.10
Nodes (12): AchievementsList(), AchievementsListProps, playTriumphSound(), TrophyShowcaseCardProps, Viewer3D, AdminAchievements(), DEFAULT_ACHIEVEMENTS, TROPHY_PRESETS (+4 more)

### Community 14 - "GroupChat.tsx"
Cohesion: 0.14
Nodes (9): copyImageToClipboard(), downloadFile(), GroupChat(), GroupChatProps, ParticipantItemProps, SpartaEmojiPicker(), SpartaEmojiPickerProps, VoicePlayer() (+1 more)

### Community 15 - "metrics-db.mjs"
Cohesion: 0.24
Nodes (16): RFC-1321, add32(), buildRobokassaUrl(), cmn(), ff(), gg(), hex(), hex_chr (+8 more)

### Community 16 - "statusline.js"
Cohesion: 0.15
Nodes (11): ageGroups, AgeGroupsSectionProps, AgeGroup, BenefitItem, BENEFITS_BY_AGE, ChildBenefitsSection(), ChildBenefitsSectionProps, Container() (+3 more)

### Community 17 - "shop.ts"
Cohesion: 0.06
Nodes (35): eslint-plugin-react-refresh, dependencies, react, react-dom, react-markdown, devDependencies, eslint, @eslint/js (+27 more)

### Community 18 - "AdminMessages.tsx"
Cohesion: 0.09
Nodes (22): ReplyTemplatesModalProps, Template, ContactModal(), ContactModalProps, MessageHistory, Ticket, MessageHistory, Ticket (+14 more)

### Community 19 - "UserRequests.tsx"
Cohesion: 0.22
Nodes (9): CoachHistoryStats, SkillsDistribution, StatsLabProps, CoachSection(), CoachSectionProps, DEFAULT_EXERCISES, EXERCISE_CATEGORIES, MUSCLE_GROUPS (+1 more)

### Community 20 - "ParentDashboard.tsx"
Cohesion: 0.24
Nodes (8): DashboardShell(), DashboardShellProps, StatsSectionProps, AdminUsers(), User, UserItem, UserRole, UserStatus

### Community 21 - "AuthContext.tsx"
Cohesion: 0.29
Nodes (13): RouteModalProps, CITIES, LOCATIONS_BY_CITY, SPARTA_LOCATIONS, CityContext, CityContextType, CityProvider(), AdminLocations() (+5 more)

### Community 22 - "learning-hooks.sh"
Cohesion: 0.10
Nodes (21): App(), AdminLayout(), BannedScreen(), BannedScreenProps, BroadcastReactions(), BroadcastReactionsProps, EMOJIS, Reaction (+13 more)

### Community 23 - "swarm-comms.sh"
Cohesion: 0.29
Nodes (9): IncomingRequestToastContainer(), ToastItem(), IncomingRequestNotification, NotificationContext, NotificationContextType, NotificationProvider(), playNotificationSound(), triggerVibration() (+1 more)

### Community 24 - "daemon-manager.sh"
Cohesion: 0.24
Nodes (11): calculate_aggregate_rankings(), parse_ranking_from_text(), Any, Parse the FINAL RANKING section from the model's response.      Args:, Calculate aggregate rankings across all models.      Args:         stage2_res, Run the complete 3-stage council process.      Args:         user_query: The, Stage 2: Each model ranks the anonymized responses.      Args:         user_q, Stage 1: Collect individual responses from all council models.      Args: (+3 more)

### Community 25 - "SmartEnrollmentWizard.tsx"
Cohesion: 0.50
Nodes (3): BroadcastChat(), BroadcastChatProps, Message

### Community 26 - "ProductDetails.tsx"
Cohesion: 0.18
Nodes (11): DirectStreamBroadcaster(), DirectStreamBroadcasterProps, RemoteCameraStreamItem(), DirectStreamViewerProps, PostStreamModal(), PostStreamModalProps, Ball3D(), Sparta3DShield() (+3 more)

### Community 27 - "scripts"
Cohesion: 0.08
Nodes (25): build, appId, directories, files, productName, output, dist/**/*, main (+17 more)

### Community 28 - "dependencies"
Cohesion: 0.15
Nodes (13): canvas-confetti, html2canvas, html5-qrcode, http-proxy-middleware, dependencies, canvas-confetti, html2canvas, html5-qrcode (+5 more)

### Community 29 - "auto-commit.sh"
Cohesion: 0.21
Nodes (8): LeaveReviewModal(), LeaveReviewModalProps, ChatProfileDrawer(), ChatProfileDrawerProps, ChatUser, useChatMessages(), UseChatMessagesOptions, supabase

### Community 30 - "sync-v3-metrics.sh"
Cohesion: 0.22
Nodes (8): 2026-08-10, Observation 1: Bento grid 2x column span creates asymmetrical holes when item count is 3, Observation 2: Verify high-value features in source copy before emphasizing them, Observation 3: Mobile UX optimization requires sticky action bar & responsive width bounds, Observation 4: Fullscreen modals require Escape listener, body scroll lock & dynamic dvh bounds, Observation 5: Multi-layer gradient borders and gradient masks elevate card UI from generic templates to premium tier, Observation 6: Reassuring checkout UX replaces aggressive legal disclaimers with care badges & trust anchors, Skill Observation Log

### Community 31 - "AdminNews.tsx"
Cohesion: 0.11
Nodes (23): BaseModel, LLM Council backend package., Conversation, ConversationMetadata, create_conversation(), CreateConversationRequest, get_conversation(), list_conversations() (+15 more)

### Community 32 - "Broadcasts.tsx"
Cohesion: 0.17
Nodes (12): BroadcastArchiveModalProps, BroadcastCountdown(), BroadcastCountdownProps, DirectStreamViewer(), SmoothFlipCounter(), SmoothFlipCounterProps, Broadcasts(), getVideoEmbedUrl() (+4 more)

### Community 35 - "package.json"
Cohesion: 0.29
Nodes (6): 🎯 1. Session Intent & Accomplishments, 📁 2. Complete File Trail (Modified & Created), ⚙️ 3. Task Ops & Next Session Actions Checklist, 🗜️ 4. Context Compression Verification Token, Core Features Delivered:, 🚀 HANDOFF & SESSION MEMORY SUMMARY (Context Compression)

### Community 36 - "adr-compliance.sh"
Cohesion: 0.18
Nodes (7): CoachQuickPlannerProps, QUICK_PRAISES, StudentItem, DailyHubMemo, DailyHubProps, Student, Training

### Community 37 - "swarm-monitor.sh"
Cohesion: 0.23
Nodes (9): ContextMenuPosition, MessageContextMenuProps, TargetBounds, getReactionDef(), Sparta3DReactionIcon(), SPARTA_3D_REACTIONS, SpartaMessageReactionBadges(), SpartaReactionDef (+1 more)

### Community 38 - "AdminUsers.tsx"
Cohesion: 0.17
Nodes (9): ContextMenuItemProps, MessagesSectionProps, GRADIENT_PRESETS, SpartaCreateStoryModal(), SpartaCreateStoryModalProps, SpartaStoriesViewer(), SpartaStoriesViewerProps, SpartaStoryGroup (+1 more)

### Community 39 - "CartContext.tsx"
Cohesion: 0.47
Nodes (5): AdminDirections(), DEFAULT_PROGRAMS, getProgramImage(), PRESET_IMAGES, Program

### Community 41 - "checkpoint-manager.sh"
Cohesion: 0.15
Nodes (11): boyB64, __dirname, __filename, iconFreezeB64, iconGiftB64, iconLicenseB64, iconZeroB64, logoB64 (+3 more)

### Community 42 - "memory.js"
Cohesion: 0.60
Nodes (3): FriendsSection(), FriendsSectionProps, formatLastSeen()

### Community 43 - "claude-flow"
Cohesion: 0.12
Nodes (17): CLAUDE_FLOW_HOOKS_ENABLED, CLAUDE_FLOW_MAX_AGENTS, CLAUDE_FLOW_MEMORY_BACKEND, CLAUDE_FLOW_MODE, CLAUDE_FLOW_TOPOLOGY, DO_NOT_TRACK, FIGMA_ACCESS_TOKEN, FIGMA_API_KEY (+9 more)

### Community 44 - "perf-worker.sh"
Cohesion: 0.17
Nodes (10): awardB64, ballerinaBarreB64, ballerinaCutoutB64, contemporaryCutoutB64, __dirname, dynamicsB64, __filename, logoB64 (+2 more)

### Community 46 - "worker-manager.sh"
Cohesion: 0.17
Nodes (10): bgPhotoB64, __dirname, __filename, iconBalletB64, iconLightningB64, iconRhythmB64, iconSneakerB64, iconStretchB64 (+2 more)

### Community 47 - "react"
Cohesion: 0.17
Nodes (10): bgPhotoB64, __dirname, __filename, iconBalletB64, iconLightningB64, iconRhythmB64, iconSneakerB64, iconStretchB64 (+2 more)

### Community 55 - "AdminAIConsole.tsx"
Cohesion: 0.27
Nodes (9): AdminAIConsole(), AdminAIConsoleProps, AIActionResponse, resolveAIAction(), checkHeadroomHealth(), CompressionStats, CompressMessagesResult, compressPromptMessages() (+1 more)

### Community 57 - "MessagesSection.tsx"
Cohesion: 0.17
Nodes (10): bgFootballB64, bgTennisB64, crestB64, __dirname, __filename, iconGiftB64, iconIceB64, iconLicenseB64 (+2 more)

### Community 58 - "server.js"
Cohesion: 0.29
Nodes (3): app, supabase, upload

### Community 59 - "AdminScanner.tsx"
Cohesion: 0.25
Nodes (6): CoachCalendarProps, QUICK_REASONS, ScheduleOverrideModal(), ScheduleOverrideModalProps, SPARTA_COACHES, createScheduleOverride()

### Community 69 - "statusline-hook.sh"
Cohesion: 0.18
Nodes (9): bgPhotoB64, crestB64, __dirname, __filename, giftB64, iceB64, paths, shieldB64 (+1 more)

### Community 71 - "clean_files.js"
Cohesion: 0.18
Nodes (9): bgPhotoB64, crestB64, __dirname, __filename, giftB64, iceB64, paths, shieldB64 (+1 more)

### Community 75 - "@capacitor/core"
Cohesion: 0.09
Nodes (13): MediaViewerModalProps, categories, NewsModal(), NewsModalProps, CATEGORIES, NewsSection(), stripHtml(), CATEGORY_LABELS (+5 more)

### Community 87 - "cors"
Cohesion: 0.18
Nodes (9): bgPhotoB64, crestB64, __dirname, __filename, giftB64, iceB64, paths, shieldB64 (+1 more)

### Community 89 - "ScheduleSection.tsx"
Cohesion: 0.18
Nodes (9): bgPhotoB64, crestB64, __dirname, __filename, iconGiftB64, iconIceB64, iconLicenseB64, iconTaxB64 (+1 more)

### Community 90 - "electron-is-dev"
Cohesion: 0.17
Nodes (20): add_assistant_message(), add_user_message(), create_conversation(), ensure_data_dir(), get_conversation(), get_conversation_path(), list_conversations(), Any (+12 more)

### Community 92 - "DirectorDashboard.tsx"
Cohesion: 0.18
Nodes (9): bgFootballB64, bgTennisB64, crestB64, __dirname, __filename, iconGiftB64, iconIceB64, iconLicenseB64 (+1 more)

### Community 93 - "@eslint/js"
Cohesion: 0.10
Nodes (19): Architecture, Backend Structure (`backend/`), CLAUDE.md - Technical Notes for LLM Council, Common Gotchas, Data Flow Summary, De-anonymization Strategy, Error Handling Philosophy, Frontend Structure (`frontend/src/`) (+11 more)

### Community 94 - "TopUpModal.tsx"
Cohesion: 0.13
Nodes (15): CoachSection, Dashboard(), DeveloperConsole, DirectorDashboard, ParentDashboard, resizeImage(), STAFF_ROLES, KidDashboard (+7 more)

### Community 95 - "generate-svg-dance-lotus.mjs"
Cohesion: 0.20
Nodes (8): bgPhotoB64, __dirname, __filename, iconBalletB64, iconRhythmB64, iconStretchB64, iconTrophyB64, realQrB64

### Community 96 - "generate-svg-sparta-duo-concept.mjs"
Cohesion: 0.20
Nodes (8): bgConceptB64, __dirname, __filename, iconGiftB64, iconIceB64, iconLicenseB64, iconTaxB64, paths

### Community 97 - "generate-svg-sparta-tennis.mjs"
Cohesion: 0.22
Nodes (7): bgPhotoB64, bokehB64, crestB64, __dirname, __filename, netPhotoB64, paths

### Community 98 - "html2canvas"
Cohesion: 0.25
Nodes (6): boyB64, __dirname, __filename, logoB64, polaroid1B64, polaroid2B64

### Community 99 - "generate-svg-stage-realism.mjs"
Cohesion: 0.25
Nodes (6): ballerinaCutoutB64, bgHallB64, contemporaryCutoutB64, __dirname, __filename, realQrB64

### Community 100 - "qrcode"
Cohesion: 0.29
Nodes (5): qrcode, qrcode, __dirname, __filename, generateQR()

### Community 101 - "export-all-posters-master.mjs"
Cohesion: 0.38
Nodes (6): __dirname, exportAll(), __filename, getBase64(), inlineAllAssets(), tasks

### Community 102 - "generate-svg-dance-lotus-editorial.mjs"
Cohesion: 0.29
Nodes (5): bgPhotoB64, crestB64, __dirname, __filename, realQrB64

### Community 103 - "lottie-react"
Cohesion: 0.19
Nodes (8): api, App(), ChatInterface(), Sidebar(), Stage1(), deAnonymizeText(), Stage2(), Stage3()

### Community 104 - "generate-svg-editorial.mjs"
Cohesion: 0.29
Nodes (5): dancerPhotoB64, __dirname, __filename, logoB64, realQrB64

### Community 105 - "SpartaMediaGalleryModal.tsx"
Cohesion: 0.33
Nodes (4): CATEGORY_LABELS, GalleryMediaItem, SpartaMediaGalleryModal(), SpartaMediaGalleryModalProps

### Community 107 - "generate-svg-complete.mjs"
Cohesion: 0.33
Nodes (4): boyB64, __dirname, __filename, logoB64

### Community 108 - "MediaUploadTrayModal.tsx"
Cohesion: 0.40
Nodes (4): MEDIA_CATEGORIES, MediaUploadItem, MediaUploadTrayModal(), MediaUploadTrayModalProps

### Community 109 - "export-pdf-camp.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportPerfectPdf(), __filename, getBase64()

### Community 110 - "export-pdf-dance.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportDancePdfAndPng(), __filename, getBase64()

### Community 112 - "export-pdf-dance-editorial.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportEditorialDancePoster(), __filename, getBase64()

### Community 113 - "export-pdf-dance-lotus.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportLotusBalletPoster(), __filename, getBase64()

### Community 116 - "export-pdf-dance-lotus-editorial.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportLotusSwissPoster(), __filename, getBase64()

### Community 118 - "@types/three"
Cohesion: 0.20
Nodes (12): Configuration for the LLM Council., generate_conversation_title(), 3-stage LLM Council orchestration., Stage 3: Chairman synthesizes final response.      Args:         user_query:, Generate a short title for a conversation based on the first user message., stage3_synthesize_final(), Any, query_model() (+4 more)

### Community 120 - "export-pdf-dance-magazine.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportDanceMagazinePoster(), __filename, getBase64()

### Community 121 - "export-pdf-dance-modern.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportDanceModernPoster(), __filename, getBase64()

### Community 122 - "export-pdf-sparta-a4.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportA4Posters(), __filename, getBase64()

### Community 123 - "tsx"
Cohesion: 0.22
Nodes (8): 1. Install Dependencies, 2. Configure API Key, 3. Configure Models (Optional), LLM Council, Running the Application, Setup, Tech Stack, Vibe Code Alert

### Community 124 - "export-pdf-sparta-duo-concept.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportConceptRollup(), __filename, getBase64()

### Community 125 - "@typescript-eslint/eslint-plugin"
Cohesion: 0.29
Nodes (6): 1. 🛡️ CONTEXT ECONOMY & SESSION HEALTH (Mandatory Across All Sessions), 2. 🧠 KARPATHY 4-PRINCIPLES FOR CODE QUALITY (`karpathy-coder`), 3. ⚙️ DYNAMIC SKILL ROUTING MATRIX, 4. 🔄 SKILL DISCOVERY PROTOCOL (`find-skills`), 5. 🚀 STANDARDIZED WORKFLOW PROTOCOL, GLOBAL AGENT SYSTEM: SKILLS ROUTER & CONTEXT ECONOMY PROTOCOL

### Community 126 - "export-pdf-sparta-duo-rollup.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportDuoRollup(), __filename, getBase64()

### Community 127 - "export-pdf-sparta-tennis.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportSpartaTennisPoster(), __filename, getBase64()

### Community 128 - "export-pdf-stage-realism.mjs"
Cohesion: 0.50
Nodes (4): __dirname, exportStageRealismPoster(), __filename, getBase64()

### Community 129 - "slice-3d-icons.mjs"
Cohesion: 0.50
Nodes (4): __dirname, __filename, getBase64(), slice3dIcons()

### Community 138 - "AnnouncementModal.tsx"
Cohesion: 0.50
Nodes (3): AnnouncementModal(), AnnouncementModalProps, PRESETS

### Community 139 - "AdminTeam.tsx"
Cohesion: 0.67
Nodes (3): AdminTeam(), Coach, DEFAULT_COACHES

### Community 150 - "figma-generate-banners.js"
Cohesion: 0.83
Nodes (3): createCard(), createRollupCard(), createText()

### Community 152 - "sync-html.mjs"
Cohesion: 0.50
Nodes (3): __dirname, __filename, standaloneSrc

### Community 153 - "Ruflo — Claude Code Configuration"
Cohesion: 0.09
Nodes (22): 3-Tier Model Routing, After Success, Agent Comms (SendMessage-First Coordination), Agent Routing, Agents, Background Workers, Before Any Task, Build & Test (+14 more)

### Community 185 - "NewsSection.tsx"
Cohesion: 0.12
Nodes (26): ExcelImportModal(), ExcelImportModalProps, ImportRow, MergeStrategy, parseSpartaExcel(), QueuedFile, toTitleCase(), formatPhone() (+18 more)

### Community 289 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, Sparta Codebase Fix and Security Implementation Plan, Task 1: Fix `index.html` ImportMap & CDN Conflict, Task 2: Sanitize Hardcoded OpenRouter API Key & Add `.env.example`, Task 3: Sanitize Hardcoded Supabase Credentials & Gemini Startup Crash in `server.js` and `supabase.ts`, Task 4: Add ESLint v9 Flat Config (`eslint.config.js`) and Fix Build Script, Task 5: Update `vite.config.ts` Environment Define

### Community 290 - "AdminReviews.tsx"
Cohesion: 0.19
Nodes (9): getVideoEmbedUrl(), ReviewCard(), ReviewCardProps, ReviewsSectionProps, getVideoEmbedUrl(), ReviewAdminCard(), ReviewAdminCardProps, Review (+1 more)

### Community 342 - "Best Practices"
Cohesion: 0.18
Nodes (10): Community & Social Graph Architecture, Components, Core System Architecture, Data Model & Firestore Mutations, Key Components & Hooks, Messenger & Real-Time Delivery System, Overview, Sparta Sports Center - Project Context & Messenger Architecture (+2 more)

### Community 353 - "Monitoring & Insights"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 397 - "AdminNews.tsx"
Cohesion: 0.22
Nodes (7): COLORS, RichTextEditorProps, AdminNews(), CATEGORIES, getVideoEmbedUrl(), NewsItem, stripHtml()

### Community 669 - "STORYBOARD: Sparta Sports Center Showcase (40s)"
Cohesion: 0.29
Nodes (6): Overview, Scene 1: Hero & Premium Branding (0.0s - 10.0s), Scene 2: Sports Directions & Coaches (10.0s - 20.0s), Scene 3: Community & Messenger Ecosystem (20.0s - 30.0s), Scene 4: Call-to-Action & Closing (30.0s - 40.0s), STORYBOARD: Sparta Sports Center Showcase (40s)

### Community 704 - "Sparta Sports Center - Video Brief"
Cohesion: 0.33
Nodes (5): Customizations & Style, Intent, Scenes Breakdown, Sparta Sports Center - Video Brief, Target Audience

## Knowledge Gaps
- **674 isolated node(s):** `npm_config_update_notifier`, `CLAUDE_FLOW_MODE`, `CLAUDE_FLOW_HOOKS_ENABLED`, `CLAUDE_FLOW_TOPOLOGY`, `CLAUDE_FLOW_MAX_AGENTS` (+669 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **67 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `db` to `LandingPage.tsx`, `LearningService`, `App.tsx`, `useAuth`, `NewsModal.tsx`, `swarm-hooks.sh`, `CoachSection.tsx`, `UIComponents.tsx`, `AdminTeam.tsx`, `FavoritesContext.tsx`, `Dashboard.tsx`, `GroupChat.tsx`, `AdminNews.tsx`, `AdminMessages.tsx`, `UserRequests.tsx`, `ParentDashboard.tsx`, `AuthContext.tsx`, `learning-hooks.sh`, `swarm-comms.sh`, `SmartEnrollmentWizard.tsx`, `ProductDetails.tsx`, `auto-commit.sh`, `Broadcasts.tsx`, `AdminReviews.tsx`, `adr-compliance.sh`, `AdminUsers.tsx`, `CartContext.tsx`, `memory.js`, `router.js`, `session.js`, `AdminShop.tsx`, `NewsSection.tsx`, `AdminScanner.tsx`, `@capacitor/core`, `TopUpModal.tsx`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `concurrently`, `framer-motion`, `firebase`, `scripts`, `standard-checkpoint-hooks.sh`, `validate-v3-config.sh`, `DailyHub.tsx`, `NewsSection.tsx`, `StatsLab.tsx`, `health-monitor.sh`, `pattern-consolidator.sh`, `TrialsTab.tsx`, `ShopReceipt.tsx`, `files`, `AdminTeam.tsx`, `github-safe.js`, `@capacitor/android`, `express`, `github-setup.sh`, `guidance-hook.sh`, `guidance-hooks.sh`, `post-commit`, `pre-commit`, `quick-start.sh`, `setup-mcp.sh`, `update-v3-progress.sh`, `v3.sh`, `v3-quick-status.sh`, `concurrently`, `date-fns`, `emoji-picker-react`, `qrcode`, `react-router-dom`, `@supabase/supabase-js`, `three`, `@types/express`, `uuid`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `html5-qrcode` connect `dependencies` to `LearningService`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `npm_config_update_notifier`, `CLAUDE_FLOW_MODE`, `CLAUDE_FLOW_HOOKS_ENABLED` to the rest of the system?**
  _708 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LandingPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Should `LearningService` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._