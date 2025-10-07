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

## 2025-??-??
- While aligning the profile grid we tried three approaches that did **not** fix the right-edge drift:
  - Added padding directly on the animated grid wrapper (`paddingHorizontal: s.$1 + 6` then `-2`), but the absolute overlay still pinned the inner grid to the right.
  - Offsetting the absolute container with manual `left/right` values and later converting to wrapper padding simply changed the overlay bounds while the `Grid` component continued using its own internal padding, so the tiles never shifted.
  - Syncing the outer wrapper to copy the nav inset without mirroring whatever `Grid` does on main; result was still right-aligned because `Grid`’s internal layout (and possibly its prompt placeholders) control the true tile width.
- Need to diff `Grid.tsx` between main and this branch—likely the internal spacing or content width differs there. Any future alignment tweak should modify `Grid` itself (or its parent layout) rather than stacking more padding around the absolute container.
- Reintroduced padding on the outer profile container (`paddingHorizontal: s.$1 + 6`) and removed ad-hoc padding from the grid wrapper/overlay so the layout matches `main`. Floating FAB now offsets using the same inset; grid still needs validation on device to confirm centering.
- Final fix for right-edge drift: leave container padding at `s.$1 + 6` and explicitly pass `rowJustify="center"` to `<Grid />` so each row centers within the available width (matching `main`).
- Matched the refreshed profile header layout on `OtherProfile`, including the slimmer Inter Medium 13pt location label, and added a tap-to-zoom avatar overlay with a spring scale/opacity animation to preview other users' photos without leaving the screen.
- Introduced `c.newDark` (`#707070`) for primary headers (profile names, Edge Directory, Edge Corkboard, messages) and tightened avatar styling with concentric circular strokes on both self and other profile screens.
- Updated `c.surface2` to `#F4F1E9` to align background accents across prompts, placeholder chips, and avatar rings with the latest palette.
- Centered directory/want-to-meet list styling: default names now render in black, subtitles in `c.newDark`, and corkboard instructional copy swaps to `c.newDark` for consistency across guidance text.
- Matched vertical spacing between name/location rows in directory and Want To Meet pills by giving `UserListItem` the same 2px stack gap used in directory rows.
- Aligned want-to-meet name typography with the directory list by bumping `UserListItem`’s non-small name font to `(s.$09 + 1)` so both tabs read identically.
- Synced avatar and padding dims across directory/Want To Meet by setting `UserListItem`’s large avatar to 60px with matching `s.$075` paddings; rows now match the directory pill measurements.
- Added inline quick-save ribbon to directory rows: custom bookmark outline uses `c.newDark`, fills when saved, and toggles via `addSave`/`removeSave` without leaving the list.
- Replaced Ionicons bookmark with a rounded SVG version sized ~30×36px for better proportions and visibility.
- Synced directory vs. Want To Meet display logic: combined first+last names where available, location fallback now "Elsewhere", and `UserListItem` shares the same defaults so both tabs stay consistent.
- Navigation heart now just opens its sheet (no save badge/animation) as we prepare to repurpose it into a feed.
- Optimistic saves now animate instantly: directory bookmark scales on tap, the Want To Meet count pulses on change, and the saves store keeps optimistic placeholders while the network call completes.
- Saves bottom sheet is currently a placeholder (no list) so the heart entry can evolve into a future feed without showing stale data.
- Directory avatar zoom now drives `otherProfileBackdropAnimatedIndex` so the global nav dimming animates in sync with the overlay; we tween that shared value to `0`/`-1` alongside the opacity/scale springs to keep dismissal and backdrop lighting perfectly aligned.
