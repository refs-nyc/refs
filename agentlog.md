# Agent Log

## 2024-05-05
- Profile grid now stays hidden until real grid data (either cached or freshly fetched) is applied. Once hydrated we fade/scale the entire grid container in with a 520 ms cubic-out animation so prompts and tiles arrive as a single unit.
- Messaging bootstrap loads conversations with expanded membership data, flattens those memberships into the store and cache, and hydrates previews from that flattened data. Conversation avatars are available on first render instead of arriving after subsequent fetches.
- Grid animation now plays only once per user profile. Subsequent visits reuse cached animation state so the grid stays visible without re-running the intro tween.
- Navigation back button first checks `router.canGoBack()` before falling back to profile replacement, preserving directory context when drilling into other profiles.
