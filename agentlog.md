# Agent Log

## 2024-05-05
- Profile grid now stays hidden until real grid data (either cached or freshly fetched) is applied. Once hydrated we fade/scale the entire grid container in with a 520 ms cubic-out animation so prompts and tiles arrive as a single unit.
- Messaging bootstrap loads conversations with expanded membership data, flattens those memberships into the store and cache, and hydrates previews from that flattened data. Conversation avatars are available on first render instead of arriving after subsequent fetches.
- Grid animation now plays only once per user profile. Subsequent visits reuse cached animation state so the grid stays visible without re-running the intro tween.
- Navigation back button first checks history (router/native) before falling back to profile replacement, and the profile screen now skips the “force grid” reset whenever a pending pager index is queued—so returning from Directories or Want-to-Meet lands on the correct tab.
- Directory view now syncs its People/Popular filter with the global store; when we navigate back from a drilled profile we reapply the last filter (and queue it during fallback) so you land on the same People tab you left.
- Added a dedicated logout bottom sheet (long-press the Refs wordmark) so logout no longer renders an inline overlay and stays consistent with other sheet interactions.
- Font loader no longer blocks the app tree; we render immediately with system fonts and swap in Inter once it’s ready, so the splash screen disappears without gating gestures.
- Messaging bootstrap hydrates from cache instantly and defers the multi-query PocketBase fetch until after interactions, keeping the JS queue free during launch.

## 2025-10-03 – messaging bootstrap delay debugging
- Observed cold-start logs where `messages.fetchInitial.start` fires ~35 s after launch (when user taps Messages) despite defer hooks; initial load still shows blank messages screen until bootstrap completes. Need to trace scheduling to ensure `ensureMessagesBootstrap` is the only trigger and that conversation hydration updates state as expected.

## 2025-10-03 – deferred messaging/bootstrap + lazy full bundle
- Stopped profile bundles from fetching full grid/backlog during launch; added `hasFullGrid/hasFullBacklog` flags and `ensureFullGrid/ensureBacklog` helpers that fetch on demand (edit mode & backlog sheet).
- Updated MyProfile/backlog UI to hydrate previews immediately and only request full data when user enters edit or opens the backlog sheet.
- Reworked messaging bootstrap: no automatic fetch at launch, expose `ensureMessagesBootstrap` and trigger it from `MessagesScreen`; removed 3.5 s delay timer.
