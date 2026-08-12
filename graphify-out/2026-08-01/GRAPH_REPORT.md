# Graph Report - .  (2026-08-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1067 nodes · 1739 edges · 138 communities (73 shown, 65 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f604c1c3`
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
- dotenv
- electron-is-dev
- emoji-picker-react
- eslint
- @eslint/js
- eslint-plugin-react
- framer-motion
- @google/generative-ai
- gsap
- html2canvas
- html5-qrcode
- http-proxy-middleware
- jspdf
- jspdf-autotable
- lottie-react
- lucide-react
- multer
- firebase
- qrcode.react
- react-dom
- react-player
- react-router-dom
- @react-three/fiber
- recharts
- @supabase/supabase-js
- three
- @types/canvas-confetti
- @types/express
- @types/three
- uuid
- postcss
- prettier-plugin-tailwindcss
- tailwindcss
- tsx
- typescript-eslint
- @typescript-eslint/eslint-plugin
- @typescript-eslint/parser
- vite
- @vitejs/plugin-react
- wait-on

## God Nodes (most connected - your core abstractions)
1. `db` - 68 edges
2. `useAuth()` - 65 edges
3. `JsonFileBackend` - 19 edges
4. `swarm-hooks.sh script` - 19 edges
5. `LearningService` - 18 edges
6. `Button()` - 17 edges
7. `compilerOptions` - 16 edges
8. `HNSWIndex` - 15 edges
9. `scripts` - 12 edges
10. `react` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Navbar()` --calls--> `useAuth()`  [EXTRACTED]
  components/LandingPage.tsx → context/AuthContext.tsx
- `Hero()` --calls--> `useAuth()`  [EXTRACTED]
  components/LandingPage.tsx → context/AuthContext.tsx
- `LandingPage()` --calls--> `useAuth()`  [EXTRACTED]
  components/LandingPage.tsx → context/AuthContext.tsx
- `MembershipModal()` --calls--> `useAuth()`  [EXTRACTED]
  components/MembershipModal.tsx → context/AuthContext.tsx
- `NewsModal()` --calls--> `useAuth()`  [EXTRACTED]
  components/NewsModal.tsx → context/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (138 total, 65 thin omitted)

### Community 0 - "LandingPage.tsx"
Cohesion: 0.05
Nodes (37): COACHES, FAQS, FEATURES, getPriceInfo(), Hero(), LandingPage(), NAV_ITEMS, Navbar() (+29 more)

### Community 1 - "LearningService"
Cohesion: 0.07
Nodes (12): CONFIG, DATA_DIR, DB_PATH, __dirname, EmbeddingService, __filename, HNSWIndex, initializeDatabase() (+4 more)

### Community 2 - "App.tsx"
Cohesion: 0.05
Nodes (34): AdminAchievements, AdminBans, AdminBroadcasts, AdminComments, AdminDashboard, AdminDirections, AdminFinance, AdminGroups (+26 more)

### Community 3 - "JsonFileBackend"
Cohesion: 0.09
Nodes (21): DATA_DIR, dim(), __dirname, doImport(), doStatus(), doSync(), __filename, gracefulExit() (+13 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (27): ./*, DOM, DOM.Iterable, ES2022, node, scratch, scripts, tmp (+19 more)

### Community 5 - "useAuth"
Cohesion: 0.09
Nodes (20): App(), BannedScreen(), BannedScreenProps, BroadcastChat(), BroadcastChatProps, Message, BroadcastReactions(), BroadcastReactionsProps (+12 more)

### Community 6 - "NewsModal.tsx"
Cohesion: 0.09
Nodes (13): MediaViewerModalProps, categories, NewsModal(), NewsModalProps, CATEGORIES, NewsSection(), stripHtml(), CATEGORY_LABELS (+5 more)

### Community 7 - "swarm-hooks.sh"
Cohesion: 0.22
Nodes (22): accept_handoff(), broadcast_context(), broadcast_pattern(), complete_handoff(), get_agents(), get_consensus_status(), get_messages(), get_pattern_broadcasts() (+14 more)

### Community 8 - "CoachSection.tsx"
Cohesion: 0.14
Nodes (15): ChatParticipant, MessagesTabProps, CoachChat(), CoachChatProps, CoachSection(), CoachSectionProps, DEFAULT_EXERCISES, EXERCISE_CATEGORIES (+7 more)

### Community 9 - "UIComponents.tsx"
Cohesion: 0.13
Nodes (11): CoachCalendarProps, FriendsSectionProps, LinkingRequest, MembershipReceiptProps, ProgressSectionProps, Button(), ButtonProps, CardProps (+3 more)

### Community 10 - "db"
Cohesion: 0.10
Nodes (8): db, AdminDirections(), DEFAULT_PROGRAMS, Program, COLORS, Expense, Transaction, PromoCode

### Community 11 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, electron-builder, electron-serve, eslint-plugin-react-hooks, globals, devDependencies, autoprefixer, electron-builder (+11 more)

### Community 12 - "FavoritesContext.tsx"
Cohesion: 0.17
Nodes (12): CartSidebar(), SEO(), SEOProps, CartProvider(), useCart(), FavoritesContext, FavoritesContextType, FavoritesProvider() (+4 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.13
Nodes (10): AdminLayout(), DirectorDashboard, STAFF_ROLES, NotificationCategory, NotificationsModalProps, ActivitySectionProps, LinkingRequestBanner(), ThemeToggle() (+2 more)

### Community 14 - "GroupChat.tsx"
Cohesion: 0.12
Nodes (7): CreatePollModalProps, copyImageToClipboard(), downloadFile(), GroupChat(), GroupChatProps, ParticipantItemProps, PollMessageProps

### Community 15 - "metrics-db.mjs"
Cohesion: 0.21
Nodes (16): calculateModuleProgress(), checkSecurityFile(), countFilesAndLines(), countProcesses(), DB_PATH, dbDir, __dirname, exportToJSON() (+8 more)

### Community 16 - "statusline.js"
Cohesion: 0.21
Nodes (15): BANNER_VERSION, c, CONFIG, { execSync, execFileSync }, fs, generateJSON(), generateStatusline(), getLearningStats() (+7 more)

### Community 17 - "shop.ts"
Cohesion: 0.15
Nodes (11): SizeAdvisorProps, xlsx, AdminGroups(), BanDetails, ExperienceLevel, ReviewReply, ScheduleItem, SizeData (+3 more)

### Community 18 - "AdminMessages.tsx"
Cohesion: 0.14
Nodes (10): ReplyTemplatesModalProps, Template, SpartaVideoPlayerProps, AdminMessages(), COLORS, isOnline(), Message, MessageHistory (+2 more)

### Community 19 - "UserRequests.tsx"
Cohesion: 0.20
Nodes (12): ContactModal(), ContactModalProps, MessageHistory, Ticket, MessageHistory, Ticket, UserRequests(), UserRequestsProps (+4 more)

### Community 20 - "ParentDashboard.tsx"
Cohesion: 0.24
Nodes (10): AttendanceSectionProps, LinkChildModal(), LinkChildModalProps, ParentDashboard(), ParentDashboardProps, findChildToLink(), getChildrenProfiles(), linkParentToChild() (+2 more)

### Community 21 - "AuthContext.tsx"
Cohesion: 0.16
Nodes (11): ProfileViewModalProps, AuthContext, AuthContextType, AuthProvider(), app, auth, firebaseConfig, googleProvider (+3 more)

### Community 22 - "learning-hooks.sh"
Cohesion: 0.43
Nodes (12): error(), get_stats(), log(), record_usage(), run_benchmark(), search_patterns(), session_end(), session_start() (+4 more)

### Community 23 - "swarm-comms.sh"
Cohesion: 0.32
Nodes (13): batch_add(), batch_flush(), batch_flush_all(), broadcast_pattern_async(), enqueue(), get_comms_stats(), pool_acquire(), pool_init() (+5 more)

### Community 24 - "daemon-manager.sh"
Cohesion: 0.49
Nodes (12): error(), is_running(), log(), restart_all(), daemon-manager.sh script, show_status(), start_all(), start_metrics_daemon() (+4 more)

### Community 25 - "SmartEnrollmentWizard.tsx"
Cohesion: 0.23
Nodes (9): AuthModal(), AuthModalProps, EXPERIENCE_LEVELS, GOALS, MOTIVATIONS, SmartEnrollmentWizard(), SmartEnrollmentWizardProps, TEMPERAMENTS (+1 more)

### Community 26 - "ProductDetails.tsx"
Cohesion: 0.24
Nodes (5): ReviewMediaModalProps, VideoPlayerProps, supabase, Review, SizeChart

### Community 27 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, android:add, android:open, android:sync, build, dev, electron:build, electron:dev (+4 more)

### Community 28 - "dependencies"
Cohesion: 0.18
Nodes (11): canvas-confetti, @capacitor/cli, formidable, dependencies, canvas-confetti, @capacitor/cli, formidable, @react-three/drei (+3 more)

### Community 29 - "auto-commit.sh"
Cohesion: 0.42
Nodes (9): auto_commit(), batch_commit(), error(), file_commit(), has_changes(), log(), push_only(), auto-commit.sh script (+1 more)

### Community 30 - "sync-v3-metrics.sh"
Cohesion: 0.22
Nodes (3): log(), sync-v3-metrics.sh script, sync_metrics()

### Community 31 - "AdminNews.tsx"
Cohesion: 0.22
Nodes (7): COLORS, RichTextEditorProps, AdminNews(), CATEGORIES, getVideoEmbedUrl(), NewsItem, stripHtml()

### Community 32 - "Broadcasts.tsx"
Cohesion: 0.31
Nodes (6): BroadcastArchiveModalProps, AdminBroadcasts(), getVideoEmbedUrl(), Broadcasts(), useViewers(), Broadcast

### Community 33 - "AchievementsList.tsx"
Cohesion: 0.24
Nodes (6): AchievementCardProps, AchievementsListProps, Viewer3D, Viewer3D, AchievementDefinition, UserAchievement

### Community 34 - "storage.ts"
Cohesion: 0.25
Nodes (8): MagicTransfer(), MagicTransferProps, TransferMode, TrialModal(), TrialModalProps, performEmergencyCleanup(), performHardReset(), safeLocalStorage

### Community 35 - "package.json"
Cohesion: 0.18
Nodes (10): build, appId, directories, productName, output, main, name, private (+2 more)

### Community 36 - "adr-compliance.sh"
Cohesion: 0.24
Nodes (4): ADRS, check_compliance(), adr-compliance.sh script, should_run()

### Community 37 - "swarm-monitor.sh"
Cohesion: 0.49
Nodes (8): check_once(), error(), log(), monitor_continuous(), swarm-monitor.sh script, success(), update_activity_metrics(), warn()

### Community 38 - "AdminUsers.tsx"
Cohesion: 0.29
Nodes (6): StatsSectionProps, AdminUsers(), User, UserItem, UserRole, UserStatus

### Community 39 - "CartContext.tsx"
Cohesion: 0.31
Nodes (7): ShopToastContainer(), ShopToastProps, ToastType, CartContext, CartContextType, CartItem, Product

### Community 41 - "checkpoint-manager.sh"
Cohesion: 0.42
Nodes (8): clean_checkpoints(), diff_checkpoint(), list_checkpoints(), rollback_checkpoint(), checkpoint-manager.sh script, show_checkpoint(), show_help(), show_summary()

### Community 42 - "memory.js"
Cohesion: 0.22
Nodes (6): commands, fs, MEMORY_DIR, MEMORY_FILE, path, value

### Community 43 - "claude-flow"
Cohesion: 0.22
Nodes (8): CLAUDE_FLOW_HOOKS_ENABLED, CLAUDE_FLOW_MAX_AGENTS, CLAUDE_FLOW_MEMORY_BACKEND, CLAUDE_FLOW_MODE, CLAUDE_FLOW_TOPOLOGY, npm_config_update_notifier, cmd, claude-flow

### Community 44 - "perf-worker.sh"
Cohesion: 0.36
Nodes (4): run_benchmarks(), run_deep_benchmark(), perf-worker.sh script, should_run()

### Community 45 - "router.js"
Cohesion: 0.29
Nodes (6): AGENT_CAPABILITIES, buildPattern(), COMPILED_PATTERNS, escapeRegex(), NOTE: This is *not* a learned model. It is a heuristic table; "confidence", TASK_PATTERNS

### Community 46 - "worker-manager.sh"
Cohesion: 0.57
Nodes (7): force_all(), log(), run_all_workers(), run_daemon(), run_worker(), worker-manager.sh script, status_all()

### Community 47 - "react"
Cohesion: 0.25
Nodes (7): Dashboard(), ProfileViewModal(), RequestDetailsModal(), RequestDetailsModalProps, react, AdminShop(), react

### Community 48 - "security-scanner.sh"
Cohesion: 0.38
Nodes (3): run_scan(), security-scanner.sh script, should_run()

### Community 49 - "session.js"
Cohesion: 0.29
Nodes (5): commands, fs, path, SESSION_DIR, SESSION_FILE

### Community 50 - "AdminShop.tsx"
Cohesion: 0.52
Nodes (5): JERSEY_ADULT, JERSEY_CHILD, PANTS_CHILD, SHORTS_ADULT, SHORTS_CHILD

### Community 51 - "ddd-tracker.sh"
Cohesion: 0.47
Nodes (3): ddd-tracker.sh script, should_run(), track_ddd()

### Community 52 - "learning-optimizer.sh"
Cohesion: 0.53
Nodes (4): optimize_patterns(), run_sona_training(), learning-optimizer.sh script, should_run()

### Community 53 - "standard-checkpoint-hooks.sh"
Cohesion: 0.60
Nodes (5): post_edit_checkpoint(), pre_edit_checkpoint(), session_end_checkpoint(), standard-checkpoint-hooks.sh script, task_checkpoint()

### Community 54 - "validate-v3-config.sh"
Cohesion: 0.60
Nodes (5): log_error(), log_info(), log_success(), log_warning(), validate-v3-config.sh script

### Community 55 - "AdminAIConsole.tsx"
Cohesion: 0.60
Nodes (4): AdminAIConsole(), AdminAIConsoleProps, AIActionResponse, resolveAIAction()

### Community 56 - "DailyHub.tsx"
Cohesion: 0.33
Nodes (4): DailyHubMemo, DailyHubProps, Student, Training

### Community 57 - "MessagesSection.tsx"
Cohesion: 0.33
Nodes (3): ContextMenuItemProps, MessagesSection(), MessagesSectionProps

### Community 58 - "server.js"
Cohesion: 0.33
Nodes (3): app, supabase, upload

### Community 60 - "StatsLab.tsx"
Cohesion: 0.40
Nodes (3): CoachHistoryStats, SkillsDistribution, StatsLabProps

### Community 61 - "health-monitor.sh"
Cohesion: 0.83
Nodes (3): check_health(), health-monitor.sh script, should_run()

### Community 62 - "pattern-consolidator.sh"
Cohesion: 0.83
Nodes (3): consolidate_patterns(), pattern-consolidator.sh script, should_run()

### Community 63 - "TrialsTab.tsx"
Cohesion: 0.50
Nodes (3): TrialRequest, TrialsTab(), TrialsTabProps

### Community 66 - "files"
Cohesion: 0.50
Nodes (4): electron, files, electron, dist/**/*

### Community 67 - "AdminTeam.tsx"
Cohesion: 0.67
Nodes (3): AdminTeam(), Coach, DEFAULT_COACHES

## Knowledge Gaps
- **321 isolated node(s):** `ADRS`, `__filename`, `__dirname`, `PROJECT_ROOT`, `DATA_DIR` (+316 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `shop.ts`, `package.json`, `react`, `@capacitor/android`, `express`, `@capacitor/core`, `concurrently`, `cors`, `date-fns`, `dotenv`, `emoji-picker-react`, `framer-motion`, `@google/generative-ai`, `gsap`, `html2canvas`, `html5-qrcode`, `http-proxy-middleware`, `jspdf`, `jspdf-autotable`, `lottie-react`, `lucide-react`, `multer`, `firebase`, `qrcode.react`, `react-dom`, `react-player`, `react-router-dom`, `@react-three/fiber`, `recharts`, `@supabase/supabase-js`, `three`, `@types/canvas-confetti`, `@types/express`, `@types/three`, `uuid`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `db` connect `db` to `LandingPage.tsx`, `App.tsx`, `useAuth`, `NewsModal.tsx`, `CoachSection.tsx`, `UIComponents.tsx`, `FavoritesContext.tsx`, `Dashboard.tsx`, `GroupChat.tsx`, `shop.ts`, `AdminMessages.tsx`, `UserRequests.tsx`, `ParentDashboard.tsx`, `AuthContext.tsx`, `SmartEnrollmentWizard.tsx`, `ProductDetails.tsx`, `AdminNews.tsx`, `Broadcasts.tsx`, `AchievementsList.tsx`, `storage.ts`, `AdminUsers.tsx`, `react`, `AdminShop.tsx`, `MessagesSection.tsx`, `AdminScanner.tsx`, `AdminTeam.tsx`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `useAuth` to `LandingPage.tsx`, `App.tsx`, `storage.ts`, `NewsModal.tsx`, `CartContext.tsx`, `CoachSection.tsx`, `AdminUsers.tsx`, `UIComponents.tsx`, `FavoritesContext.tsx`, `Dashboard.tsx`, `react`, `AdminMessages.tsx`, `UserRequests.tsx`, `AuthContext.tsx`, `SmartEnrollmentWizard.tsx`, `ProductDetails.tsx`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `ADRS`, `__filename`, `__dirname` to the rest of the system?**
  _322 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LandingPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05143191116306254 - nodes in this community are weakly interconnected._
- **Should `LearningService` be split into smaller, more focused modules?**
  _Cohesion score 0.07092198581560284 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04983388704318937 - nodes in this community are weakly interconnected._