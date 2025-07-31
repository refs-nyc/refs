# 🤖 agent.readme.md — Refs Project

You are the acting principal engineer for the Refs project.  
You are careful, curious, and opinionated.  
Your job is to reason about the codebase, preserve its coherence, and protect the developer experience for human contributors.

This document defines how all coding agents should interact with the Refs codebase. These rules ensure safe collaboration, consistent logic, and simulated memory over time.

---

## ✅ Coding Principles

- **Clarity > cleverness.** Write human-readable code, even at the cost of brevity.
- **One task at a time.** Keep pull requests tightly scoped.
- **Atomic improvements.** Only touch the files necessary for your current task.
- **Ask if unsure.** If a pattern or behavior is ambiguous, prompt for confirmation or log a question.
- **Summarize learning.** When you discover an unstated rule or pattern, add it to the memory log.

---

## 🛑 Constraints

- ❌ Never auto-commit or write directly to the main branch.
- ❌ Never refactor files outside the immediate task unless explicitly allowed.
- ❌ Never rename shared components, slices, or hooks without confirmation.
- ❌ Never modify global styles, routing, or state unless scoped and safe.
- ❌ Never create circular dependencies across `/features`, `/ui`, or `/stores`.

---

## 🎛️ Preferences

- **Language:** TypeScript only
- **Framework:** React Native via Expo
- **Navigation:** Expo Router
- **State:** Zustand with modular slices
- **Styling:** Tailwind (via nativewind) with atomic class usage
- **Component pattern:** Functional React components with typed props
- **Data flow:** API calls through PocketBase service layer
- **Animations:** React Native Reanimated, prefer performant motion
- **Package Manager:** pnpm (never use npm or npx)

**Naming Conventions:**
- Components: `PascalCase.tsx`
- Hooks/utilities: `useX.ts` / `doThing.ts`
- UI atoms go in `/ui/atoms/`
- Feature-specific logic stays inside its own folder under `/features/*`

---

## 📐 Task Type Guidelines

- ✳️ **Small UI/component edits** → OK to execute immediately, log summary
- ⚠️ **Refactors or shared logic** → Propose via inline comment, log rationale
- 🧠 **Pattern shifts or state model changes** → Pause, propose, and ask for confirmation

---

# 🧠 Agent Memory Log

## 🎯 Mission: Integrate Search Flow from PR #301 into Clean Main Branch

### ✅ COMPLETED TASKS

#### **Core Infrastructure**
- ✅ **COMPLETED**: 7-string generation and embedding system is fully operational
- ✅ **COMPLETED**: All existing items (~364) have been processed with 7-strings and embeddings
- ✅ **COMPLETED**: Edge Function deployed and tested with OpenAI integration
- ✅ **COMPLETED**: PocketBase hooks updated to trigger Supabase operations
- ✅ **COMPLETED**: Semantic search functionality working with embeddings
- ✅ **COMPLETED**: TypeScript errors and merge conflicts resolved
- ✅ **COMPLETED**: Search flow integration with real data working correctly

#### **Data Synchronization**
- ✅ **COMPLETED**: Sync all users from PocketBase to Supabase (50 users now properly synced)
- ✅ **COMPLETED**: User name synchronization - fixed display names in search results
- ✅ **COMPLETED**: Spirit vector generation for 28 users with proper concatenation approach
- ✅ **COMPLETED**: 4-tier search ranking system implemented and working

#### **Search System**
- ✅ **COMPLETED**: 4-tier ranking system: Exact matches → High similarity (>0.7) → Closest hits → Spirit vector fallback
- ✅ **COMPLETED**: Embedding standardization to handle length mismatches
- ✅ **COMPLETED**: Spirit vector similarity calculation for Tier 4 ranking
- ✅ **COMPLETED**: Search results display proper user names instead of IDs
- ✅ **COMPLETED**: Search header shows "People into" consistently
- ✅ **COMPLETED**: UserListItem component displays proper names

#### **UI/UX Improvements**
- ✅ **COMPLETED**: Fixed SearchResultsSheet header to show "People into" instead of dynamic text
- ✅ **COMPLETED**: Fixed username display in search results to show real names instead of IDs
- ✅ **COMPLETED**: UserListItem component properly displays user names

### 🔧 TECHNICAL ACHIEVEMENTS

#### **Data Pipeline**
- **PocketBase → Supabase Sync**: Successfully synced 50 users with proper name mapping
- **Name Field Mapping**: Fixed `firstName` + `lastName` → `name` field in Supabase
- **Search Data Flow**: PocketBase items → Supabase embeddings → Search API → UI display

#### **Search Ranking System**
- **Tier 1**: Exact matches (refs found in user's items)
- **Tier 2**: High similarity users (>0.7 threshold, ranked by hits then spirit vector)
- **Tier 3**: Closest hit users (ranked by spirit vector similarity)
- **Tier 4**: Spirit vector fallback (fills remaining slots up to 60 users)

#### **Embedding System**
- **7-string Generation**: OpenAI GPT-4o generates contextual descriptions
- **Embedding Creation**: `text-embedding-3-small` for semantic search
- **Spirit Vectors**: Concatenated 7-strings from user's top-12 grid items
- **Standardization**: Length truncation to handle embedding mismatches

### 🎯 KEY INSIGHTS & LESSONS LEARNED

#### **Major Challenges Overcome**
1. **User Data Sync Issues**: Initially only 2 users in Supabase vs 50 in PocketBase
   - **Root Cause**: Column name mismatches (`avatarURL` vs `avatarurl`, missing `username`)
   - **Solution**: Created proper sync script with correct field mapping

2. **Embedding Length Mismatches**: "Vectors must have the same length" errors
   - **Root Cause**: Different embedding models producing different vector lengths
   - **Solution**: Implemented standardization by truncating to shorter length

3. **Spirit Vector Generation Problems**: `null` values in combined vectors
   - **Root Cause**: Attempted to average embeddings instead of concatenating text
   - **Solution**: Concatenate raw 7-string text, then generate single embedding

4. **Username Display Issues**: Showing user IDs instead of real names
   - **Root Cause**: Name fields not properly synced from PocketBase to Supabase
   - **Solution**: Sync `firstName` + `lastName` → `name` field, update search display logic

#### **Key Misconceptions Corrected**
1. **Spirit Vector Approach**: Initially tried averaging embeddings, corrected to text concatenation
2. **Embedding Strategy**: Thought standardization wasn't needed, discovered it's crucial
3. **Data Flow Understanding**: Underestimated complexity of PocketBase → Supabase sync
4. **Name Field Usage**: Confused `userName` (username) vs `name` (display name) fields

#### **What Succeeded**
1. **4-tier Ranking System**: Provides comprehensive search results with proper prioritization
2. **Spirit Vector Generation**: 28 users now have spirit vectors for better ranking
3. **Proper Data Pipeline**: Real-time sync between PocketBase and Supabase
4. **Search Integration**: Full end-to-end search flow working with real data
5. **Name Display Fix**: Users now see proper names instead of IDs in search results

### 📊 CURRENT STATUS

#### **Database State**
- **PocketBase**: 50 users, ~364 items with 7-strings and embeddings
- **Supabase**: 50 users synced, proper name fields, 28 users with spirit vectors
- **Search System**: Fully operational with 4-tier ranking

#### **Search Performance**
- **Tier 1**: Exact matches working correctly
- **Tier 2**: High similarity threshold (0.7) with proper ranking
- **Tier 3**: Closest hit ranking with spirit vector tiebreaker
- **Tier 4**: Spirit vector fallback filling remaining slots

#### **UI/UX Status**
- **Search Results**: Displaying proper user names
- **Search Header**: Shows "People into" consistently
- **UserListItem**: Properly displays user names
- **Search Flow**: End-to-end functionality working

### 🎉 MISSION ACCOMPLISHED

The search flow from PR #301 has been successfully integrated into the clean main branch with the following achievements:

1. ✅ **Complete Data Pipeline**: PocketBase → Supabase sync working
2. ✅ **Advanced Search System**: 4-tier ranking with spirit vectors
3. ✅ **Proper Name Display**: Users see real names instead of IDs
4. ✅ **UI Consistency**: Search header and results display correctly
5. ✅ **Search Navigation Fixed**: Users can now click on search results to view profiles
6. ✅ **Search Performance Optimized**: Fixed lag by making API calls non-blocking and reducing animation time
7. ✅ **Search Mode Performance Optimized**: Fixed jagged button lag by implementing lazy loading and memoization
8. ✅ **Ref Selection Performance Optimized**: Fixed lag when clicking/unclicking refs by optimizing selection logic and memoization
9. ✅ **App Initialization Performance Fixed**: Eliminated 3-second blocking delay by making API calls non-blocking
10. ✅ **Navigation Performance Fixed**: Optimized message counting and profile data loading to eliminate blocking
11. ✅ **Search Results Interaction Fixed**: Made search results immediately clickable with placeholder data
12. ✅ **MyProfile Performance Fixed**: Made refreshGrid non-blocking to eliminate jagged button lag
13. ✅ **Search Mode Performance Fixed**: Made fetchSearchHistory non-blocking to eliminate sheet opening lag
14. ✅ **Grid Selection Performance Fixed**: Optimized array operations for faster ref selection
15. ✅ **Search History Re-implemented**: Enhanced with ref titles, thumbnails, and cached results for instant restoration
16. ✅ **Search History API Fixed**: Resolved 500 errors and JSON parsing issues with backward compatibility
17. ✅ **Search History API Structure Fixed**: Updated to match actual matchmaking server API format
18. ✅ **Search History Thumbnails Added**: Database schema updated with ref_images column for proper thumbnail display
19. ✅ **Production Ready**: All systems operational and tested
20. 🚀 **Performance Optimization Phase**: Comprehensive performance improvements implemented:
    - **Image Loading**: Optimized SimplePinataImage with better caching and error handling
    - **Grid Performance**: Improved selection logic using Sets for O(1) operations
    - **Message Loading**: Batched conversation loading to prevent UI blocking
    - **User Store**: Removed heavy expand operations from init
    - **Search Results**: Limited profile fetching to 10 results for better performance
    - **Navigation**: Optimized newMessages calculation with efficient loops
    - **Image Preloading**: Added ImagePreloader component for critical images
    - **Performance Monitoring**: Added performance monitoring utility
    - **Lazy Loading**: Created LazyLoader component for heavy components

The search functionality is now fully operational and ready for production use!
