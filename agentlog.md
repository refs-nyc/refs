# Agent Log

## 2024-05-05
- Profile grid now stays hidden until real grid data (either cached or freshly fetched) is applied. Once hydrated we fade/scale the entire grid container in with a 520 ms cubic-out animation so prompts and tiles arrive as a single unit.
- Messaging bootstrap loads conversations with expanded membership data, flattens those memberships into the store and cache, and hydrates previews from that flattened data. Conversation avatars are available on first render instead of arriving after subsequent fetches.
- Grid animation now plays only once per user profile. Subsequent visits reuse cached animation state so the grid stays visible without re-running the intro tween.
- Navigation back button first checks history (router/native) before falling back to profile replacement, and the profile screen now skips the "force grid" reset whenever a pending pager index is queued—so returning from Directories or Want-to-Meet lands on the correct tab.
- Directory view now syncs its People/Popular filter with the global store; when we navigate back from a drilled profile we reapply the last filter (and queue it during fallback) so you land on the same People tab you left.
- Added a dedicated logout bottom sheet (long-press the Refs wordmark) so logout no longer renders an inline overlay and stays consistent with other sheet interactions.
- Font loader no longer blocks the app tree; we render immediately with system fonts and swap in Inter once it's ready, so the splash screen disappears without gating gestures.
- Messaging bootstrap hydrates from cache instantly and defers the multi-query PocketBase fetch until after interactions, keeping the JS queue free during launch.

## 2025-??-??
- Attempted overlay height spacer approach for settings, but it still flashed; backed out.
- Swapped to a dedicated settings bottom sheet: pencil opens the sheet (`BottomSheet`), settings live there, FAB fades via opacity when edit mode is active, so the grid stays untouched and no more black flash.
- Refined the settings sheet snap logic to avoid `CONTENT_HEIGHT` snap errors: compute numeric snap points from measured content/fallback heights, keep the 50px radius, and pad the scroll container so the grid stays editable beneath the open sheet.
- Reinstated the shared `NavigationBackdrop` (ordered beneath sheets) so global dimming stays consistent, while OtherProfile's avatar zoom still registers/unregisters backdrop presses to close cleanly without leaking edit state.
- Push registration now treats Expo/Supabase outages as informational only—skips token writes and logs debug info instead of throwing alerts when the APIs are unavailable.
- Added a lightweight navigation overlay tied to the remove-ref sheet so the header dims while the sheet stays bright; remove-ref sheet now matches the community interest sheet styling (fixed snap, rounded 50px, consistent backdrop).
- Added a tiny idle-task queue (`features/utils/idleQueue.ts`) and now feed warmups enqueue one profile at a time—each preload only fetches six grid/backlog items so JS stays responsive.
- MyProfile skips the redundant post-interaction refresh and instead queues a background fetch once cached data is on screen, keeping the screen tappable instantly.
- Referencers sheet now seeds the list with the interest creator (and the viewer if subscribed) so a brand new community always shows at least the host.
- While aligning the profile grid we tried three approaches that did **not** fix the right-edge drift:
  - Added padding directly on the animated grid wrapper (`paddingHorizontal: s.$1 + 6` then `-2`), but the absolute overlay still pinned the inner grid to the right.
  - Offsetting the absolute container with manual `left/right` values and later converting to wrapper padding simply changed the overlay bounds while the `Grid` component continued using its own internal padding, so the tiles never shifted.
  - Syncing the outer wrapper to copy the nav inset without mirroring whatever `Grid` does on main; result was still right-aligned because `Grid`'s internal layout (and possibly its prompt placeholders) control the true tile width.
- Need to diff `Grid.tsx` between main and this branch—likely the internal spacing or content width differs there. Any future alignment tweak should modify `Grid` itself (or its parent layout) rather than stacking more padding around the absolute container.
- Reintroduced padding on the outer profile container (`paddingHorizontal: s.$1 + 6`) and removed ad-hoc padding from the grid wrapper/overlay so the layout matches `main`. Floating FAB now offsets using the same inset; grid still needs validation on device to confirm centering.
- Final fix for right-edge drift: leave container padding at `s.$1 + 6` and explicitly pass `rowJustify="center"` to `<Grid />` so each row centers within the available width (matching `main`).
- Matched the refreshed profile header layout on `OtherProfile`, including the slimmer Inter Medium 13pt location label, and added a tap-to-zoom avatar overlay with a spring scale/opacity animation to preview other users' photos without leaving the screen.
- Introduced `c.newDark` (`#707070`) for primary headers (profile names, Edge Directory, Edge Corkboard, messages) and tightened avatar styling with concentric circular strokes on both self and other profile screens.
- Updated `c.surface2` to `#F4F1E9` to align background accents across prompts, placeholder chips, and avatar rings with the latest palette.
- Centered directory/want-to-meet list styling: default names now render in black, subtitles in `c.newDark`, and corkboard instructional copy swaps to `c.newDark` for consistency across guidance text.
- Matched vertical spacing between name/location rows in directory and Want To Meet pills by giving `UserListItem` the same 2px stack gap used in directory rows.
- Aligned want-to-meet name typography with the directory list by bumping `UserListItem`'s non-small name font to `(s.$09 + 1)` so both tabs read identically.
- Synced avatar and padding dims across directory/Want To Meet by setting `UserListItem`'s large avatar to 60px with matching `s.$075` paddings; rows now match the directory pill measurements.
- Added inline quick-save ribbon to directory rows: custom bookmark outline uses `c.newDark`, fills when saved, and toggles via `addSave`/`removeSave` without leaving the list.
- Replaced Ionicons bookmark with a rounded SVG version sized ~30×36px for better proportions and visibility.
- Synced directory vs. Want To Meet display logic: combined first+last names where available, location fallback now "Elsewhere", and `UserListItem` shares the same defaults so both tabs stay consistent.
- Navigation heart now just opens its sheet (no save badge/animation) as we prepare to repurpose it into a feed.
- Added perf-only instrumentation for the profile hydrator (`core/preload-controller.ts`) and `fetchProfileData` so perf runs log start/end timings plus sub-steps (PocketBase fetch, profile/backlog item loads, snapshot writes); this surfaced the 12.8 s stall inside `fetchProfileData`.
- Added cache-first profile header plumbing: new `fetchProfileHeaderSafe` reuses query/MMKV snapshots before hitting PocketBase, boot snapshots now seed the header query, and `MyProfile` persists the header alongside the full profile payload so cold boot skips the 12 s user lookup.
- Profile hydrator now completes in ~30 ms (header cached, lists disabled) and Metro logging was patched to resolve segmented modules (including id 12986) so we can chase the remaining 13 s stall on the next pass.
- Optimistic saves now animate instantly: directory bookmark scales on tap, the Want To Meet count pulses on change, and the saves store keeps optimistic placeholders while the network call completes.
- Saves bottom sheet is currently a placeholder (no list) so the heart entry can evolve into a future feed without showing stale data.
- Directory avatar zoom now drives `otherProfileBackdropAnimatedIndex` so the global nav dimming animates in sync with the overlay; we tween that shared value to `0`/`-1` alongside the opacity/scale springs to keep dismissal and backdrop lighting perfectly aligned.
- Messages screen exit now hands navigation off after a 160 ms fade-out, using the `SwipeToGoBack` hook-in to let the underlying profile surface fade back in without timers or extra effects.
- Fixed "Rendered fewer hooks than expected" error when navigating to community chats by moving all React hooks in `/app/messages/[conversationId]/index.tsx` to be called BEFORE any conditional returns, ensuring hooks are always called in the same order per React's rules.
- Corrected timestamp format for community chat preview messages: replaced `.toISOString()` with PocketBase's expected format (`'yyyy-MM-dd HH:mm:ss.SSSZ'`) by converting the `T` separator to a space, eliminating "Invalid DateTime" errors in the messages list.
- Fixed chat header jumping issue in `MessagesScreen`: replaced `SafeAreaView` with absolute positioning and negative `top` offset with a regular `View` that uses `insets.top` directly in `paddingTop`. The header now stays in position from the start without any jump or shift when entering a chat.
- Implemented message input bar as absolutely positioned at bottom of screen to prevent it from being pushed off-screen by message content; swapped FlatList padding (inverted lists use `paddingTop` for visual bottom space).
- **RESOLVED**: Directory "Everyone" tab was showing empty in production due to silent error handling and potential empty cache issues:
  - Root cause 1: Silent catch block in `fetchPage` (line 783) was swallowing all errors without logging - added detailed error logging
  - Root cause 2: Cache validation was not checking for empty arrays - empty cache `[]` would pass validation and return 0 users
  - Fixed by adding `cachedUsers.length > 0` check before using cached data
  - Added comprehensive logging throughout directory fetch flow to debug future issues
  - Verified: Production DB has 16 users with `show_in_directory=true`, API queries work correctly, field exists in schema
- **CRITICAL FIX**: Registration flow was completely broken - UnifiedOnboarding was calling `registerUser({params})` but `register()` doesn't accept parameters; it reads from `stagedUser` in the store. Fixed by calling `updateStagedUser()` first to stage the data, then calling `register()` with no parameters. This was preventing ALL new user signups.
- Fixed password field autofill issues: Changed `textContentType` from `'oneTimeCode'` to `'newPassword'`/`'password'` and `autoComplete` from `'off'` to `'password'` so iOS properly suggests strong passwords and password managers work correctly.
- Push notifications are iOS-only for now; Expo token registration runs via `RegisterPushNotifications` and stores the token on the user record for future server-side sends.
- Refreshed the app icon to use the venn diagram mark on the `c.surface` background so TestFlight builds reflect the latest brand palette.
- Supabase now mirrors PocketBase push tokens: added `users.push_token`, and the client updates both stores whenever registration succeeds (or clears).
- Introduced Supabase Edge Function `notifications` to send Expo pushes given a batch of recipient user IDs; PocketBase hooks (messages/items/memberships) call it for DMs, ref matches, copying from a profile, and community joins.
- Push notifications now prompt contextually after important actions (first DM, creating/joining chats) using smart permission checking: undetermined shows custom sheet, granted registers silently, denied prompts to open iOS settings. Removed the old push notification toggle from onboarding since permissions are now contextually requested.
- Implemented notification tap handling: message notifications navigate to conversation, ref activity notifications navigate to actor's profile, community join notifications navigate to group chat.
- Added iOS notification threading: messages group by conversationId, ref activity groups by refId so users see organized notification stacks instead of spam.
- Fixed double-notification bug: users who own a ref no longer receive both "copied from your grid" AND "also added this ref" notifications.
- **CRITICAL ARCHITECTURE: Global Bottom Sheet Dimming**
  - The app uses a centralized dimming system with `NavigationBackdrop` (`zIndex: 1000`) rendered at root level in `_layout.tsx`, positioned between `<Navigation>` and `<Stack>`.
  - All global sheets (Saves, Referencers, AddRefSheet, NewRefSheet, LogoutSheet, ProfileDetailsSheet, ProfileSettingsSheet, CommunityFormSheet, DirectMessageComposer, GroupMessageComposer, RemoveInterestSheet) MUST be rendered at root level in `_layout.tsx` AFTER the NavigationBackdrop.
  - Each sheet uses `animatedIndex` tied to a shared backdrop value (`moduleBackdropAnimatedIndex`, `detailsBackdropAnimatedIndex`, `otherProfileBackdropAnimatedIndex`, or `removeRefSheetBackdropAnimatedIndex`) from the store.
  - Sheets must have `zIndex: 10000` and `containerStyle={{ zIndex: 10000 }}` to appear above the NavigationBackdrop.
  - The NavigationBackdrop interpolates all backdrop animated indices to create a unified dim overlay that covers everything except elevated sheets.
  - **NEVER** render confirmation sheets or any global UI inside screen components—they will be trapped under the NavigationBackdrop and appear dimmed. Always add new global sheets to `_layout.tsx` and wire them through the store.
  - Sheet backdrop components should use BottomSheetBackdrop with `disappearsOnIndex={-1}` and `appearsOnIndex={0}` for proper coordination.
  - This architecture ensures the header and background dim in unison while sheets remain bright and properly elevated.
## 2025-01-31
- Added TanStack Query infrastructure with MMKV persistence and bootstrap wiring.
- Swapped Directory/Community feed to use useInfiniteQuery with background ref hydration.
- Preparing to migrate MyProfile grid, Want-to-Meet, and Messages to Query for instant hydration.
## 2025-02-01
- MyProfile now sources data via `useQuery(['profile', userName])`, writes back into TanStack cache, and keeps the legacy simpleCache/Zustand consumers hydrated.
- Auto-move backlog routine runs as an idle task post-hydration and invalidates the query to pick up promoted tiles without re-running the old refreshGrid pipeline.
- Profile mutations (avatar upload, remove/move actions) patch the query cache optimistically and fall back to invalidation to stay in sync with the server.
- Conversations list now hydrates through TanStack Query (`useConversationPreviews`) while keeping the legacy store mirrors in sync, so the messaging bootstrap no longer fans out through simpleCache writes on load.
- Messaging bootstrap now reads conversations from TanStack Query with persisted pages, updates store state from query snapshots, and PocketBase realtime pushes new messages/memberships into the query cache (and store) without hammering AsyncStorage.
- preload controller now prefetches directory + messaging queries sequentially (respecting the 3/2/1 concurrency plan) so launch work stays bounded.
## 2025-02-02
- Finished the query migration: directory, want-to-meet, community interest pills, MyProfile, and messaging previews now hydrate directly from TanStack Query instead of duplicating server arrays inside Zustand.
- Rebuilt the messaging store to keep only UI state; message delivery, read receipts, saves, and previews are now driven through query cache updates and realtime patches.
- Expanded `preloadInitial()` to run priority buckets (3/2/1) and added realtime hydration (`startRealtime`) so saves/messages sync straight into the cache with minimal invalidation.
- Fixed the message thread re-render loop by subscribing on focus, patching the thread cache via a per-conversation mutex, and touching conversation previews without full invalidations.

## 2025-02-03
- **Spec recap – “Buttery Boot & Data Orchestration”:** establish a persistent TanStack Query client (MMKV-backed), wrap the app in `QueryClientProvider`, build compact query adapters for Directory/Want-to-Meet/My Profile/Interest pills/Threads, introduce `preload-controller` with bucketed warmups + realtime, keep screens mounted with `react-native-screens` freeze, move server data out of Zustand slices, cap background concurrency, tune SWR windows, and stabilize messaging rerenders (focus-driven subscriptions, per-thread locking, stable props).
- **Current delivery:** TanStack Query now backs Directory/Want-to-Meet/Profile/Interest/Messaging data; Zustand slices retain only UI state. `preloadInitial()` runs prioritized buckets post-interactions and `startRealtime()` patches Query caches (saves/messages) without large invalidations. Messaging threads subscribe on focus, apply per-thread cache patches, and keep previews in sync. Want-to-Meet + directories hydrate directly from Query adapters, and global consumers have been updated accordingly.
- **Still outstanding for the full refactor:** run the buttery boot validation pass (cold boot timing via the new log, background resume, realtime message/save checks) and ship the QA summary before handing off.
- Added boot instrumentation hooks that wrap each warmup task with `withTiming` and print a structured `Boot timings` log in Metro so we can spot any JS-thread hogs instantly.
- Query windows and prefetcher concurrency now respect the plan (3/2/1 buckets + tuned stale/gc times) to keep cold boots predictable.
- Reworked realtime subscriptions to use PocketBase’s topic filters per collection; directory/saves/messages listeners now patch TanStack caches without throwing `ClientResponseError` warnings or hammering the bridge.
- Conversation list + navigation badges now mirror TanStack unread counts, letting realtime patches update UI instantly without recomputing memberships.
- Messaging skeleton prefetch now hydrates asynchronously (lightweight page during boot, full preview fetch afterward) so the first touch isn’t blocked by inbox hydration.
## 2025-02-04
- Idle queue now coordinates cache writes: InteractionManager gates work, each job is spaced by 12 ms, and `getIdleQueueStats()` exposes backlog metrics. Dev builds log the queue snapshot right after boot timings so we can watch for stalls.
- `simpleCache.set` enqueues writes on that idle queue with labeled jobs, eliminating the synchronous AsyncStorage cascade that was freezing touches after profile mount.
- Removed the unauthorized directory realtime wiring from `startRealtime()`; only saves/messages listeners run now, stopping the 15 s PocketBase auth retry spam.
- Messaging realtime sticks to per-conversation guards on the client (no server wildcard filter), preventing the prior subscription failures while still avoiding cross-thread churn.
- Added timing + size instrumentation to `simpleCache.get/set` and idle queue tasks so we can pinpoint any remaining AsyncStorage hotspots in the buttery boot flow.
- Wrapped PocketBase realtime subscription setup in timers to capture the 10 s failure window the user hits; logs show exactly how long the handshake hangs before the server rejects access.
- Confirmed directory hydration pulls from cache immediately (<20 ms); the lingering input freeze aligns with realtime auth failures, not storage I/O.
- Removed the collection-wide realtime subscriptions that were stalling boot; Want-to-Meet now relies on TanStack revalidation (15 s cadence + focus refresh) and conversation previews poll every 15 s while preserving optimistic updates.
- Patched MyProfile hydration: load cached snapshot first, removed the stray `userName` effect, and disabled all automatic background refresh. `fetchProfileData` now runs only on explicit user actions (e.g., manual refresh).
- Skipped profile prefetch during boot; `preloadInitial()` no longer issues `getProfileItems`/`getBacklogItems` so there’s no 16 s stall on cold start.

## 2025-02-04
- Patched MyProfile to hydrate strictly from cache; `fetchProfileData` stays disabled until the user requests a refresh.
- Removed the legacy `getProfileItems()` preloader from `UserProfileScreen` so cold boots no longer spawn 16-second PocketBase scans in the background.

- Profile grid/backlog fetch now short-circuits to the cached snapshot when loading your own profile; the heavy PocketBase queries only run when cache is empty or when we explicitly request a refresh.

## 2025-10-13
- Reworked `getProfileItems/getBacklogItems` to accept `{ userId, userName, forceNetwork }`, prefer id-based filters, and push freshly fetched results back into `simpleCache` so cache hits stay warm without re-querying PocketBase.
- Updated all profile consumers (TanStack query adapter, sheets, detail screen, create flows, directory warmups) to pass the resolved user id; interactive surfaces now request `forceNetwork` and sync cache writes so stale 6-item snapshots get replaced.
- Added `[boot-trace] directoryWarmup:*` instrumentation and idle-queue caching in `features/communities/feed-screen.tsx`; warmups short-circuit on cache hits but queue a background refresh when we hydrate from disk.
- MyProfile and OtherProfile now schedule an idle network refresh whenever they boot from partial cache data, ensuring grids hydrate to all 12 tiles without reviving the 16 s boot stall.
- Deleted the legacy directory preloader from `features/user/profile-screen.tsx`; that InteractionManager task was still firing a 20-user/60-item PocketBase sweep on cold boot and keeping gestures frozen for ~15s even after the grid rendered.
- Added `core/instrumentation/jsQueueMonitor.ts` and wiring in `_layout` to trace JS queue lag plus every `InteractionManager.runAfterInteractions` job, so we can prove whether anything’s monopolising the bridge when gestures feel frozen.
- Removed the deprecated SearchResultsSheet/SearchMode stack entirely; boot no longer mounts the unused component or its cached-search hydrator.

## Boot Lag Findings 10-13-25

[High] Directory warmups are monopolising the JS queue: features/communities/feed-screen.tsx:358-432 schedules up to 12 warmups immediately, and each warmup calls simpleCache.set three times. Because simpleCache.set re-enqueues every write via enqueueIdleTask (features/cache/simpleCache.ts:73-94), the very first warmup spawns more idle jobs that themselves run synchronous JSON.stringify + AsyncStorage.setItem. In the Metro trace you grabbed we end up with 81 cache:set:* jobs and a 15 s js-queue:lag spike while those payloads (up to 33 KB per grid/backlog set) are serialised. The fix isn’t another guard; we need to stop recursing through the idle queue (detect “already idle” and write inline, or move the serializer off-thread), and we should only launch a couple of warmups once the Directory tab is actually focused instead of blasting 12 users at boot. Seeding the TanStack caches directly would also let us skip the AsyncStorage duplication that’s causing the synchronous work.
[High] Messaging hydration is still a monolith: core/preload-controller.ts:64-95 fires a full fetchInfiniteQuery 1.2 s after launch, and fetchConversationsPage hydrates every conversation by running buildPreview (features/queries/messaging.ts:117-133). Each preview hits PocketBase one or two extra times, so a 20-thread inbox means 40+ network turns plus JSON work while the navigation tree is still mounting. We need to split this the way the prior agent outlined—keep the skeleton prefetch, hydrate only the first few threads up front, and queue the rest through the idle queue with a hard concurrency cap so the app can finish booting.
[Medium] We’re double-fetching directory top refs: prefetchDirectoryTopRefs (core/preload-controller.ts:118-127) pulls the first 12 users’ tiles before the screen even renders, then flushTopRefQueue in features/communities/feed-screen.tsx:486-515 repeats the same work in batches of three. That’s extra network + cache churn right when the warmups above are already hammering the idle queue. Once we stage the warmups, we should drop the global prefetch and let the per-user queue top off TanStack cache entries instead.
[Medium] MyProfile always queues a force-network refresh when the grid isn’t full (ui/profiles/MyProfile.tsx:1014-1032). That call goes through fetchProfileData (features/queries/profile.ts:21-53), which re-runs the same getProfileItems/getBacklogItems pair the warmups already executed, kicking off even more simpleCache.set jobs. We should gate this behind a “cache miss” signal or reuse the TanStack data the warmup just produced so we aren’t duplicating work during boot.

## Next steps you can take:

Refactor simpleCache.set so writes executed from an idle-task context stay synchronous (or chunked) instead of enqueueing recursively; then cap/defers directory warmups until the Directory screen is active and seed the React Query caches with the warmup results.
Restructure prefetchMessaging to keep the existing skeleton load but hydrate only the top N conversations inline, pushing the rest into enqueueIdleTask with a single-flight throttle.
Remove the redundant prefetchDirectoryTopRefs call once the new warmup flow populates directoryKeys.all, and make the MyProfile “force refresh” consume that cached data (only falling back to forceNetwork if the query cache is stale)."

## 2025-10-13
- Wired the perf harness into the codebase (`core/perf/harness.ts`) and gated it with `EXPO_PUBLIC_PERF_HARNESS`. Harness instruments boot invariants, require-time cost, JSON/AsyncStorage payload size, React Query writes, effect timings, and JS event-loop lag.
- Running with the harness enabled immediately surfaced:
  - `[RQ HEAVY WRITE]` & `[JSON BIG stringify]` at `hydrateMessagesFirstPage` → `queryClient.setQueryData` writing ~117 KB conversation blobs.
  - `[JSON BIG stringify]` & `[JSON BIG parse]` in `snapshotStore.putSnapshot/getSnapshots` → same payload persisted via AsyncStorage during boot.
  - `[lag] long task ~13s` aligning with the messaging hydrate/snapshot writes, confirming they monopolize the JS thread.
- No other new offenders were flagged; the AppState warning was a side-effect of throwing inside the boot window.

Follow-up (perf harness diagnostics):
- Disabled messaging hydrator/snapshots (`EXPO_PUBLIC_DISABLE_BOOT_MESSAGING=1`). Long stall shifted to `hydrate:wantToMeet`, showing it blocks ~15 s on boot.
- Added `EXPO_PUBLIC_DISABLE_BOOT_WANT_TO_MEET=1`; remaining 13–15 s stall traced to `hydrate:profile:self` via enhanced InteractionManager logs (`origin: commitHookEffectListMount…`).
- Conclusion: self-profile hydrator still runs via InteractionManager and blocks the JS thread. Next flag will target this path so we can confirm lag disappears before refactoring the preload.

### Next steps (perf instrumentation)
1. Wire `EXPO_PUBLIC_DISABLE_BOOT_PROFILE` to skip `hydrate:profile:self` and confirm JS-queue lag disappears entirely.
2. Once proven, refactor boot preload flow: keep messaging/want-to-meet/profile hydrators off the bridge (smaller payloads, post-paint execution, MMKV persistence).
3. Re-run harness with flags off; verify `[lag]`, `[JSON BIG]`, `[RQ HEAVY WRITE]` remain quiet.

### Culprits to eradicate (tracked)
- `hydrate:messages:firstPage` → 117 KB JS stringify + snapshot writes (flagged, disabled via `EXPO_PUBLIC_DISABLE_BOOT_MESSAGING`).
- `hydrate:wantToMeet` → 15 s InteractionManager stall (flagged, disabled via `EXPO_PUBLIC_DISABLE_BOOT_WANT_TO_MEET`).
- `hydrate:profile:self` → 15 s InteractionManager stall (currently flagged with `EXPO_PUBLIC_DISABLE_BOOT_PROFILE`).
- `ProfileScreen useQuery(fetchProfileData)` → 15 s stall when React Query runs on mount. Dev flag `EXPO_PUBLIC_DISABLE_PROFILE_SCREEN_QUERY` now disables the screen-level query/force-refresh effects so we can validate improvements in isolation.
- Profile screen snapshot hydration still hit AsyncStorage; now guarded when `EXPO_PUBLIC_DISABLE_PROFILE_SCREEN_QUERY=1` so we can prove the lag is gone before rebuilding the bootstrap properly.

## 2025-10-14
- Added verbose perf instrumentation inside `useProfileEffect` so every MyProfile mount effect logs a start/end pair (gated by `EXPO_PUBLIC_PERF_HARNESS`). All profile passive effects now resolve in <1 ms, confirming they are not the blocking work.
- Patched `idleQueue`, `hydratorQueue`, and the preload/ensureAuth InteractionManager calls to stamp readable labels/metadata on every `runAfterInteractions` and to log enqueue/start/finish so long jobs can be traced to their source.
- Extended the JS queue monitor to include module ids/names (when Metro exposes them) and dump the first unresolved id, revealing that the 12–13 s stall still originates from the `commitHookEffectListMount` path (module ~12986) rather than the idle queue jobs we now label.
- Attempted to query Metro's module registry directly (`logModuleMap`) to resolve ids → file paths, but the registry executes module factories; when we probed it the native bridge threw "Tried to register two views with the same name" (id 361768). Rolled back that helper to keep boot stable.
- Next step: use Metro's symbolication endpoint (`/symbolicate`) or a bundle sourcemap dump to resolve module 12986/78163 to file paths without executing the modules.
- Raised the snapshot guardrail to 40 KB and refuse to run the messaging hydrator when the serialized payload exceeds that budget; React Query snapshots now skip the write and log `[preload] hydrateMessagesFirstPage skipped (oversize)` instead of blocking the bridge for seconds.
- Slimmed boot caches: compacted profile grid/backlog items down to the fields we render (id/title/thumb metadata) before persisting, and trimmed conversation/membership DTOs so the non-hydrated messaging page stores only ids, titles, and lightweight participant info.
- Trimmed want-to-meet boot fetches to a single 20-item page with just the user fields needed for the sheet (id/name/avatar), replacing the previous `getFullList` + full user expand that pulled entire records.
- Deferred want-to-meet and messaging preloads until their screens request them; boot no longer enqueues those hydrator jobs, so the queue only runs the directory warmup and stays responsive after first paint.
- Messaging and want-to-meet screens now call the new prefetch helpers via `useFocusEffect`, so the data loads only when those views are visible (and we still reuse the lightweight snapshot when returning).
- Pinata image signing no longer blocks boot: `useSignedImageUrl` now renders the original thumb immediately and defers signature fetches through the idle queue, so high-res URLs hydrate lazily without monopolising the JS thread.
- Throttled Pinata signature traffic (two concurrent requests max) and deduped idle-queue work so we never schedule dozens of signing jobs at once.
- Moved community-subscription Supabase fetches behind the corkboard screen focus effect; they only run once the user opens the community view instead of during profile boot.
- Added a dev-only `installBootFetchLogger` wrapper that records every network response during the first 5 s and flags payloads over 1 MB, giving us hard evidence of boot bandwidth before we clamp endpoints.
- Centralized image thumbnailing (`features/media/thumb.ts`) and routed grid tiles/avatars through it so boot requests pull 200×200 WebP assets instead of full-res originals.
- Dropped hydrator queue concurrency to 1 to stop parallel JSON writes; now only one boot job can run at a time pending further gating.
- Evidence: perf harness still flags long tasks (~95 s) tied to `hydrate:wantToMeet`, proving we must defer/trim that hydrator next. Messaging writes are now below the JSON-tripwire threshold and no longer emit `[JSON BIG]`.
- Priorities (active):
- Dropped hydrator queue concurrency to 1 to stop parallel JSON writes; now only one boot job can run at a time pending further gating.
- Evidence: cold + warm boots now unblock in ~1–2 s; any residual lag is idle signing work rather than boot hydrators.

### 2025-10-15 (perf summary for next agent)
- Boot-paint workflow: hydrate directory + self-profile only; messaging and want-to-meet prefetch helpers run on screen focus (`useFocusEffect`). Boot shouldn’t enqueue any other hydrators.
- Snapshot budget: capped at 40 KB. If a serialized payload exceeds the guardrail we skip the write and log `[preload] … skipped (oversize)`.
- Thumbnail delivery: `features/media/thumb.ts` builds 200×200 WebP URLs; grid tiles/avatars call `getThumbUrl` so initial paint uses lightweight assets.
- Image signing: `SimplePinataImage` defers signatures to idle jobs, skips signing when the max dimension ≤ 80px, and uses AbortControllers so route blur/scroll cancels in-flight work. `features/stores/images.ts` enforces a global token bucket (max 2 running, 8 queued), dedupes requests, debounces rewinds, and persists an AsyncStorage LRU (100 entries).
- Feed/D directory warmups: run only when those screens mount; `community_subscriptions` Supabase reads live behind the corkboard focus effect.
- Diagnostics: enable `EXPO_PUBLIC_PERF_HARNESS=1` for cold boots; the harness prints `[boot:net]` within the first 5 s and idle queue stats when drain completes. Expect total boot bytes ≈3–4 KB (thumbnails + small API responses).
- Remaining watch-outs:
  * If idle logs show `image:signed` flooding again, check that new screens use `SimplePinataImage` and don’t call `getSignedUrl` directly.
  * Keep symbolication/dev logging wrapped in `__DEV__` so release builds stay quiet.
  * RCTView shadow warning: ensure any view with `shadow*` props has `backgroundColor` set (or move the shadow to a small wrapper) to avoid layout cost.
## Harness
/* eslint-disable no-console */
/**
 * Perf Harness — cold-start root-cause tripwires for React Native
 * Usage:
 *   import { enablePerfHarness } from '@/core/perfHarness';
 *   enablePerfHarness({
 *     reactQueryClient: queryClient,
 *     enableRequireProbe: true,
 *     enableIOTripwires: true,
 *     enableLagProbe: true,
 *     maxJsonBytes: 50_000,
 *     maxRequireMs: 50,
 *     bootWindowMs: 2000,
 *     verbose: true,
 *   });
 *   // In your root layout/component:
 *   useEffect(() => { requestAnimationFrame(markFirstPaint); }, []);
 */

import type { QueryClient } from '@tanstack/react-query';
import * as React from 'react';

/* ------------------------------------------------------------------------------------
 * Boot invariant: throws if a forbidden path runs before first paint
 * ---------------------------------------------------------------------------------- */
export const bootInvariant = {
  prePaint: true,
  markPaint() {
    this.prePaint = false;
    console.log('[perf] first-paint marked');
  },
};
export const markFirstPaint = () => bootInvariant.markPaint();

export function assertPostPaint(label: string) {
  if (bootInvariant.prePaint) {
    const err = new Error(`[BOOT VIOLATION] ${label} ran before first paint`);
    // Print a compact stack to surface the caller
    console.error(err.stack);
    throw err;
  }
}

/* ------------------------------------------------------------------------------------
 * Small helpers
 * ---------------------------------------------------------------------------------- */
const now = () => {
  // RN: performance.now may exist; Date.now fallback is fine for ms granularity
  // @ts-ignore
  return globalThis?.performance?.now?.() ?? Date.now();
};
const stack = (lines = 8) =>
  new Error().stack?.split('\n').slice(2, 2 + lines).join('\n') ?? '(no stack)';

/* ------------------------------------------------------------------------------------
 * Require() probe: catches slow module init / module-scope side effects
 * ---------------------------------------------------------------------------------- */
let _requirePatched = false;
function patchRequireProbe(maxRequireMs = 50, verbose = false) {
  if (_requirePatched || typeof (globalThis as any).require !== 'function') return;
  const _orig = (globalThis as any).require;
  (globalThis as any).require = (id: string) => {
    const t0 = Date.now();
    const mod = _orig(id);
    const dt = Date.now() - t0;
    if (dt > maxRequireMs) {
      console.warn(`[REQUIRE SLOW] ${id} ${dt}ms\n${stack(6)}`);
    } else if (verbose && dt > 0) {
      // Useful to see pocketbase/polyfills appear at boot
      if (id.includes('pocketbase') || id.includes('polyfill')) {
        console.log(`[require] ${id} ${dt}ms`);
      }
    }
    return mod;
  };
  _requirePatched = true;
}

/* ------------------------------------------------------------------------------------
 * JSON + Storage tripwires: log size + stack for heavy ops (especially pre-paint)
 * ---------------------------------------------------------------------------------- */
type AsyncStorageLike = {
  setItem: (k: string, v: string) => Promise<void>;
  getItem: (k: string) => Promise<string | null>;
};

let _jsonPatched = false;
let _storagePatched = false;
function patchJSONTripwires(maxBytes = 50_000) {
  if (_jsonPatched) return;
  const _stringify = JSON.stringify;
  const _parse = JSON.parse;

  (JSON as any).stringify = (v: any, ...rest: any[]) => {
    const s = _stringify(v, ...rest);
    if (s && s.length > maxBytes) {
      const prefix = bootInvariant.prePaint ? '[JSON BIG pre-paint]' : '[JSON BIG]';
      console.warn(`${prefix} stringify ${s.length}B\n${stack(6)}`);
    }
    return s;
  };

  (JSON as any).parse = (s: string, ...rest: any[]) => {
    const t0 = Date.now();
    const out = _parse(s, ...rest);
    const dt = Date.now() - t0;
    if (s && s.length > maxBytes) {
      const prefix = bootInvariant.prePaint ? '[JSON BIG pre-paint]' : '[JSON BIG]';
      console.warn(`${prefix} parse ${s.length}B in ${dt}ms\n${stack(6)}`);
    }
    return out;
  };

  _jsonPatched = true;
}

async function patchAsyncStorageTripwires(maxBytes = 50_000) {
  if (_storagePatched) return;
  let AsyncStorage: AsyncStorageLike | null = null;
  try {
    // Lazy import so the harness itself doesn't force AsyncStorage require at file-top
    AsyncStorage = await import('@react-native-async-storage/async-storage') as any;
  } catch {
    // Not present; skip
    return;
  }
  if (!AsyncStorage?.setItem) return;

  const _setItem = AsyncStorage.setItem.bind(AsyncStorage);
  const _getItem = AsyncStorage.getItem.bind(AsyncStorage);

  (AsyncStorage as any).setItem = async (k: string, v: string) => {
    const size = v?.length ?? 0;
    const pre = bootInvariant.prePaint ? 'pre-paint ' : '';
    const t0 = Date.now();
    const res = await _setItem(k, v);
    const dt = Date.now() - t0;
    if (size > maxBytes || dt > 50) {
      console.warn(
        `[AS WRITE ${pre}] key=${k} size=${size}B took ${dt}ms\n${stack(6)}`
      );
    }
    return res;
  };

  (AsyncStorage as any).getItem = async (k: string) => {
    const t0 = Date.now();
    const out = await _getItem(k);
    const dt = Date.now() - t0;
    if ((out?.length ?? 0) > maxBytes || dt > 50) {
      const pre = bootInvariant.prePaint ? 'pre-paint ' : '';
      console.warn(
        `[AS READ ${pre}] key=${k} size=${out?.length ?? 0}B took ${dt}ms\n${stack(
          6
        )}`
      );
    }
    return out;
  };

  _storagePatched = true;
}

/* ------------------------------------------------------------------------------------
 * Event-loop lag sampler: prints any >250ms long tasks (JS stuck)
 * ---------------------------------------------------------------------------------- */
let _lagProbeStarted = false;
function startLagProbe(thresholdMs = 250) {
  if (_lagProbeStarted) return;
  _lagProbeStarted = true;
  let last = now();
  const tick = () => {
    const t = now();
    const lag = t - last - 16; // 60fps nominal
    if (lag > thresholdMs) {
      console.warn(`[lag] long task ~${Math.round(lag)}ms (prePaint=${bootInvariant.prePaint})`);
    }
    last = t;
    setTimeout(tick, 16);
  };
  tick();
}

/* ------------------------------------------------------------------------------------
 * Effect probe: quick way to tag slow mount/passive effects with timings + stack
 * ---------------------------------------------------------------------------------- */
export function effectProbe(name: string, fn: () => any, deps: React.DependencyList) {
  React.useEffect(() => {
    const t0 = Date.now();
    const ret = fn();
    const dt = Date.now() - t0;
    if (dt > 50) {
      const pre = bootInvariant.prePaint ? 'pre-paint ' : '';
      console.warn(`[EFFECT SLOW ${pre}] ${name} ${dt}ms\n${stack(6)}`);
    }
    return ret;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ------------------------------------------------------------------------------------
 * React Query heavy-write sentinel: flags large setQueryData payloads with stacks
 * ---------------------------------------------------------------------------------- */
let _rqPatched = false;
function patchReactQuerySetQueryData(client: QueryClient, maxBytes = 80_000) {
  if (_rqPatched) return;
  const _set = client.setQueryData.bind(client);
  (client as any).setQueryData = (key: any, val: any, ...rest: any[]) => {
    let approx = -1;
    try {
      approx = JSON.stringify(val)?.length ?? -1;
    } catch {}
    if (approx > maxBytes) {
      const pre = bootInvariant.prePaint ? 'pre-paint ' : '';
      console.warn(
        `[RQ HEAVY WRITE ${pre}] key=${safeKey(key)} size≈${approx}\n${stack(6)}`
      );
    }
    return _set(key, val, ...rest);
  };
  _rqPatched = true;
}
const safeKey = (k: any) => {
  try { return JSON.stringify(k); } catch { return String(k); }
};

/* ------------------------------------------------------------------------------------
 * Public API — enable/disable pieces
 * ---------------------------------------------------------------------------------- */
export type PerfHarnessOptions = {
  reactQueryClient?: QueryClient;
  enableRequireProbe?: boolean;
  enableIOTripwires?: boolean;
  enableLagProbe?: boolean;
  bootWindowMs?: number;
  maxJsonBytes?: number;
  maxRequireMs?: number;
  verbose?: boolean;
};

export async function enablePerfHarness(opts: PerfHarnessOptions = {}) {
  const {
    reactQueryClient,
    enableRequireProbe = true,
    enableIOTripwires = true,
    enableLagProbe: lagOn = true,
    bootWindowMs = 2000,
    maxJsonBytes = 50_000,
    maxRequireMs = 50,
    verbose = false,
  } = opts;

  if (enableRequireProbe) patchRequireProbe(maxRequireMs, verbose);
  if (enableIOTripwires) {
    patchJSONTripwires(maxJsonBytes);
    await patchAsyncStorageTripwires(maxJsonBytes);
  }
  if (reactQueryClient) patchReactQuerySetQueryData(reactQueryClient);
  if (lagOn) startLagProbe(250);

  // Optional: auto-flip prePaint to false after a boot window
  setTimeout(() => {
    if (bootInvariant.prePaint) {
      console.log('[perf] auto-ending boot pre-paint window');
      bootInvariant.prePaint = false;
    }
  }, bootWindowMs);
}

/* ------------------------------------------------------------------------------------
 * Handy one-liners for suspects (call inside those functions to PROVE causality)
 * ---------------------------------------------------------------------------------- */
export function assertPostPaint_snapshotWrite(key: string) {
  assertPostPaint(`putSnapshot(${key})`);
}
export function assertPostPaint_messaging(label: string) {
  assertPostPaint(`messaging.${label}`);
}
export function assertPostPaint_previewBuild() {
  assertPostPaint('buildPreview');
}

/* ------------------------------------------------------------------------------------
 * Boot TTI markers (tiny helper)
 * ---------------------------------------------------------------------------------- */
export const perfMarks = new Map<string, number>();
export const mark = (label: string) => perfMarks.set(label, Date.now());
export const done = (label: string) => {
  const t0 = perfMarks.get(label);
  const dt = typeof t0 === 'number' ? Date.now() - t0 : 0;
  console.log(`[boot] ${label} ${dt}ms`);
  return dt;
};
