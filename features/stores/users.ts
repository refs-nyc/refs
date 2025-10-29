import { StateCreator } from 'zustand'
import { Profile, ExpandedProfile } from '../types'
import { UsersRecord } from '../pocketbase/pocketbase-types'
import { ClientResponseError } from 'pocketbase'
import type { StoreSlices } from './types'
import { pocketbase } from '../pocketbase'
import { InteractionManager } from 'react-native'
import { updateShowInDirectory } from './items'
import { clearPersistedQueryClient } from '@/core/queryClient'
const OFF_AUTH_RESTORE = process.env.EXPO_PUBLIC_OFF_AUTH_RESTORE === '1'
const deleteCollectionRecords = async (collectionName: string, filter: string) => {
  try {
    const service = pocketbase.collection(collectionName)
    const records = await service.getFullList<{ id: string }>(200, {
      filter,
      fields: 'id',
    })
    for (const record of records) {
      try {
        await service.delete(record.id)
      } catch (error) {
        console.warn('[account-delete] record delete failed', { collectionName, id: record.id, error })
      }
    }
  } catch (error) {
    console.warn('[account-delete] fetch failed', { collectionName, error })
  }
}

export type DirectoryUser = {
  id: string
  userName: string
  name: string
  neighborhood: string
  avatar_url: string
  topRefs: string[]
  _latest?: number
}

export type UserSlice = {
  stagedUser: Partial<Profile> & { password?: string; passwordConfirm?: string }
  user: Profile | null
  isInitialized: boolean
  blockedUsers: Record<string, string>
  register: () => Promise<ExpandedProfile>
  updateUser: (fields: Partial<Profile>) => Promise<Profile>
  updateStagedUser: (formFields: Partial<Profile> & { password?: string; passwordConfirm?: string }) => void
  loginWithPassword: (email: string, password: string) => Promise<any>
  getUserByEmail: (email: string) => Promise<Profile>
  getUserByUserName: (userName: string) => Promise<Profile>
  getUsersByIds: (ids: string[]) => Promise<Profile[]>
  getRandomUser: () => Promise<Profile>
  login: (userName: string) => Promise<Profile>
  logout: () => void
  init: () => Promise<void>
  loadBlockedUsers: () => Promise<void>
  blockUser: (userId: string) => Promise<void>
  unblockUser: (userId: string) => Promise<void>
  isUserBlocked: (userId?: string | null) => boolean
  deleteAccount: (options: { password: string }) => Promise<void>
  submitUserReport: (payload: {
    targetUserId: string
    conversationId?: string | null
    messageId?: string | null
    reason: string
    details?: string
    includeRecentMessages?: boolean
  }) => Promise<void>
}

export const createUserSlice: StateCreator<StoreSlices, [], [], UserSlice> = (set, get) => ({
  stagedUser: {},
  user: null, // user is ALWAYS the user of the app, this is only set if the user is logged in
  isInitialized: false,
  blockedUsers: {},
  //
  //
  //
  init: async () => {
    const startedAt = Date.now()
    console.log('[boot-trace] user.init:start')
    try {
      const primeBackgroundData = () => {
        const warmFeedFromCache = get().ensureFeedHydrated
        const refreshFeed = get().refreshFeed
        setTimeout(() => {
          const feedStart = Date.now()
          if (typeof warmFeedFromCache === 'function') {
            warmFeedFromCache({ refresh: false }).catch((error: unknown) => {
              console.warn('Initial feed cache hydration failed', error)
            })
          }

          if (typeof refreshFeed === 'function') {
            // First feed refresh happens when the sheet/home feed triggers it.
          }
          if (__DEV__) {
            console.log('[boot-trace] user.init:primeBackgroundData scheduled', Date.now() - feedStart, 'ms')
          }
        }, 0)
      }

      // Mark as initialized immediately to allow UI to be responsive
      set(() => ({
        isInitialized: true,
        homePagerIndex: 0,
        profileNavIntent: null,
      }))


      // If PocketBase has a valid auth store, sync it with our store
      if (!OFF_AUTH_RESTORE && pocketbase.authStore.isValid && pocketbase.authStore.record) {
        try {
          // Optimize by not expanding items on init - load them separately if needed
          const record = await pocketbase
            .collection<Profile>('users')
            .getOne(pocketbase.authStore.record.id)

          set(() => ({
            user: record,
            homePagerIndex: 0,
            profileNavIntent: null,
          }))

          primeBackgroundData()
          await get().loadBlockedUsers()
        } catch (error) {
          console.error('Failed to sync user state:', error)
          // If we can't get the user record, clear the auth store
          pocketbase.authStore.clear()
          set(() => ({
            user: null,
            homePagerIndex: 0,
            profileNavIntent: null,
            blockedUsers: {},
          }))
        }
      } else {
        // No valid auth, mark as initialized with no user
        set(() => ({
          user: null,
          homePagerIndex: 0,
          profileNavIntent: null,
          blockedUsers: {},
        }))
      }
    } catch (error) {
      console.error('Init error:', error)
      set(() => ({
        user: null,
        homePagerIndex: 0,
        profileNavIntent: null,
        blockedUsers: {},
      }))
    }
    console.log('[boot-trace] user.init:complete', Date.now() - startedAt, 'ms')
  },
  //
  //
  //
  loadBlockedUsers: async () => {
    const currentUserId = pocketbase.authStore.record?.id
    if (!currentUserId) {
      set(() => ({ blockedUsers: {} }))
      return
    }

    try {
      const records = await pocketbase
        .collection('blocked_users')
        .getFullList(200, {
          filter: pocketbase.filter('blocker = {:uid}', { uid: currentUserId }),
        })

      const next: Record<string, string> = {}
      for (const record of records || []) {
        const blockedId = (record as any)?.blocked
        if (blockedId) {
          next[String(blockedId)] = record.id
        }
      }

      set(() => ({ blockedUsers: next }))
    } catch (error) {
      console.warn('Failed to load blocked users', error)
      set(() => ({ blockedUsers: {} }))
    }
  },
  blockUser: async (userId: string) => {
    const currentUserId = pocketbase.authStore.record?.id
    if (!currentUserId || !userId || currentUserId === userId) {
      return
    }

    const existing = get().blockedUsers[userId]
    if (existing) {
      return
    }

    try {
      const record = await pocketbase.collection('blocked_users').create({
        blocker: currentUserId,
        blocked: userId,
      })

      set((state) => ({
        blockedUsers: { ...state.blockedUsers, [userId]: record.id },
      }))
    } catch (error) {
      console.warn('Failed to block user', error)
      throw error
    }
  },
  unblockUser: async (userId: string) => {
    const currentUserId = pocketbase.authStore.record?.id
    if (!currentUserId || !userId) {
      return
    }

    const existing = get().blockedUsers[userId]
    if (!existing) {
      return
    }

    try {
      await pocketbase.collection('blocked_users').delete(existing)

      set((state) => {
        const next = { ...state.blockedUsers }
        delete next[userId]
        return { blockedUsers: next }
      })
    } catch (error) {
      console.warn('Failed to unblock user', error)
      throw error
    }
  },
  isUserBlocked: (userId?: string | null) => {
    if (!userId) return false
    return Boolean(get().blockedUsers[userId])
  },
  //
  //
  //
  updateStagedUser: (formFields: Partial<Profile> & { password?: string; passwordConfirm?: string }) => {
    set((state) => ({
      stagedUser: { ...state.stagedUser, ...formFields },
    }))

    const updatedState = get().stagedUser

    return updatedState
  },
  //
  //
  //
  updateUser: async (fields: Partial<Profile>) => {
    try {
      if (!pocketbase.authStore.record) {
        throw new Error('not logged in')
      }

      const record = await pocketbase
        .collection<UsersRecord>('users')
        .update(pocketbase.authStore.record.id, { ...fields })

      // Update local store so UI reflects changes immediately
      set((state) => ({
        user: state.user ? { ...state.user, ...record } : record,
      }))

      // If avatar/image was updated, check if we should update show_in_directory flag
      if (fields.image || fields.avatar_url) {
        const userId = pocketbase.authStore.record.id
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            updateShowInDirectory(userId).catch(error => {
              console.warn('Failed to update show_in_directory:', error)
            })
          })
        })
      }

      return record
    } catch (err) {
      console.error(err)
      throw err
    }
  },
  //
  //
  //
  getUserByEmail: async (email: string) => {
    const userRecord = await pocketbase
      .collection<Profile>('users')
      .getFirstListItem(`email = "${email}"`)
    set(() => ({
      stagedUser: userRecord,
    }))

    return userRecord
  },
  getUserByUserName: async (userName: string) => {
    const userRecord = await pocketbase
      .collection<Profile>('users')
      .getFirstListItem(`userName = "${userName}"`)
    return userRecord
  },
  getUsersByIds: async (ids: string[]) => {
    const filter = ids.map((id) => `id="${id}"`).join(' || ')
    return await pocketbase.collection('users').getFullList<Profile>({
      filter: filter,
    })
  },
  getRandomUser: async () => {
    const result = await pocketbase.collection('users').getList<Profile>(1, 1, {
      filter: 'items:length > 5',
      sort: '@random',
    })
    return result.items[0]
  },
  //
  // Requirement: staged user
  //
  register: async () => {
    // Build a clean create payload; avoid leaking system fields like id/created/updated
    const staged = get().stagedUser as any
    const finalUser: any = {
      email: staged?.email,
      emailVisibility: true,
      password: staged?.password,
      passwordConfirm: staged?.passwordConfirm,
      firstName: staged?.firstName,
      lastName: staged?.lastName,
      image: staged?.image,
      location: staged?.location,
      lat: staged?.lat,
      lon: staged?.lon,
      userName: staged?.userName,
    }

    if (!finalUser) throw Error('No user data')
    if (!finalUser.email) throw Error('User must have email')

    const userPassword = get().stagedUser.password
    if (!userPassword) throw Error('User must have password')

    // Generate a username (match legacy behavior: lowercase firstName + 4-char suffix)
    if (!finalUser.userName) {
      const firstNamePart = finalUser.firstName ? (finalUser.firstName as string).toLowerCase() : 'user'
      const shortUuid = Math.random().toString(36).substring(2, 6) // 4 chars
      finalUser.userName = `${firstNamePart}-${shortUuid}`
    }

    try {
      const record = await pocketbase
        .collection('users')
        .create<ExpandedProfile>(finalUser, { expand: 'items,items.ref' })

      await get().loginWithPassword(finalUser.email, userPassword)

      set(() => ({
        user: record,
      }))
      await get().loadBlockedUsers()
      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  //
  //
  //
  loginWithPassword: async (email: string, password: string) => {
    const response = await pocketbase
      .collection<UsersRecord>('users')
      .authWithPassword(email, password)
    set(() => ({
      user: response.record,
    }))
    await get().loadBlockedUsers()
    return response.record
  },
  //
  //
  //
  login: async (userName: string) => {
    try {
      const record = await pocketbase
        .collection<Profile>('users')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

      // Get the user's email from the record
      if (!record.email) {
        throw new Error('User has no email')
      }

      // Get the password from staged user
      const password = get().stagedUser.password
      if (!password) {
        throw new Error('No password provided')
      }

      // Authenticate with PocketBase
      await pocketbase.collection('users').authWithPassword(record.email, password)

      set(() => ({
        user: record,
      }))
      await get().loadBlockedUsers()
      return record
    } catch (error) {
      if ((error as ClientResponseError).status === 404) {
        try {
          const record = await get().register()

          set(() => ({
            user: record,
          }))
          await get().loadBlockedUsers()

          return record
        } catch (err) {
          console.error(err)
        }
      }
      console.error(error)
      throw error
    }
  },
  //
  //
  //
  logout: () => {
    set(() => ({
      user: null,
      stagedUser: {},
      isInitialized: true,
      blockedUsers: {},
    }))

    const resetFeed = get().resetFeed
    if (typeof resetFeed === 'function') {
      resetFeed()
    }

    clearPersistedQueryClient()

    pocketbase.realtime.unsubscribe()
    pocketbase.authStore.clear()
  },
  deleteAccount: async ({ password }) => {
    const user = get().user
    const authRecord = pocketbase.authStore.record

    if (!user || !authRecord?.id) {
      throw new Error('You must be signed in to delete your account.')
    }

    if (!user.email) {
      throw new Error('Unable to locate your email address. Please try again later.')
    }

    const trimmedPassword = password.trim()
    if (!trimmedPassword) {
      throw new Error('Please re-enter your password to continue.')
    }

    const userId = authRecord.id

    try {
      await pocketbase.collection('users').authWithPassword(user.email, trimmedPassword)
    } catch (error) {
      if ((error as ClientResponseError)?.status === 400) {
        throw new Error('Incorrect password. Please try again.')
      }
      throw error
    }

    try {
      await deleteCollectionRecords('reactions', `user = "${userId}"`)
      await deleteCollectionRecords('messages', `sender = "${userId}"`)
      await deleteCollectionRecords('memberships', `user = "${userId}"`)
      await deleteCollectionRecords('saves', `saved_by = "${userId}"`)
      await deleteCollectionRecords('saves', `user = "${userId}"`)
      await deleteCollectionRecords('items', `creator = "${userId}"`)
      await deleteCollectionRecords('refs', `creator = "${userId}"`)
      await deleteCollectionRecords('blocked_users', `blocked = "${userId}"`)

      await pocketbase.collection('users').delete(userId)
      get().logout()
    } catch (error) {
      throw error
    }
  },
  submitUserReport: async ({
    targetUserId,
    conversationId,
    messageId,
    reason,
    details,
    includeRecentMessages,
  }) => {
    const reporterId = pocketbase.authStore.record?.id

    if (!reporterId) {
      throw new Error('You need to be signed in to report someone.')
    }

    if (!targetUserId) {
      throw new Error('Select a user to report.')
    }

    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      throw new Error('Select a reason for this report.')
    }

    let contextPayload: unknown = null
    const shouldIncludeMessages = Boolean(includeRecentMessages && conversationId)

    if (shouldIncludeMessages) {
      try {
        const messages = await pocketbase.collection('messages').getList(1, 10, {
          filter: `conversation = "${conversationId}"`,
          sort: '-created',
          fields: 'id,text,sender,created',
        })

        contextPayload = messages.items
          .map((msg: any) => ({
            id: msg.id,
            sender: msg.sender,
            text: msg.text ?? '',
            created: msg.created,
          }))
          .reverse()
      } catch (error) {
        console.warn('[report-user] failed to collect context', error)
      }
    }

    const payload: Record<string, unknown> = {
      reporter: reporterId,
      target_user: targetUserId,
      reason: trimmedReason,
      details: details?.trim() || '',
      include_recent_messages: shouldIncludeMessages,
      context: contextPayload,
      status: 'open',
    }

    if (conversationId) {
      payload.conversation = conversationId
    }
    if (messageId) {
      payload.message = messageId
    }

    await pocketbase.collection('user_reports').create(payload)
  },
})
