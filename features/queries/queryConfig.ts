export const QUERY_WINDOWS = {
  directory: {
    staleTime: 30_000,
    gcTime: 15 * 60_000,
  },
  messagingPreviews: {
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  },
  messagingThread: {
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  },
  profile: {
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  },
  wantToMeet: {
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  },
  interests: {
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  },
}
