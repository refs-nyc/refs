import { pocketbase } from '../pocketbase'
import { StateCreator } from 'zustand'
import { Profile, StagedProfileFields } from '../types'
import type { StoreSlices } from './types'
import type { SessionSigner } from '@canvas-js/interfaces'
import { getCurrentSessionSignerFromMagic } from '../magic'
import { formatDateString } from '../utils'
import type { RefsCanvas } from '../canvas/contract'

export type UserSlice = {
  stagedProfileFields: StagedProfileFields
  user: Profile | null
  isInitialized: boolean
  register: () => Promise<Profile>
  updateUserLocation: (location: string) => Promise<void>
  updateStagedProfileFields: (formFields: StagedProfileFields) => void
  getUserByDid: (did: string) => Promise<Profile>
  getUsersByDids: (dids: string[]) => Promise<Profile[]>
  getRandomUser: () => Promise<Profile>
  login: (sessionSigner: SessionSigner) => Promise<void>
  sessionSigner: SessionSigner | null

  canvasActions: ReturnType<RefsCanvas['as']> | null

  logout: () => void
  init: () => Promise<void>
}

export const createUserSlice: StateCreator<StoreSlices, [], [], UserSlice> = (set, get) => ({
  stagedProfileFields: {},
  user: null, // user is ALWAYS the user of the app, this is only set if the user is logged in
  isInitialized: false,
  //
  //
  //
  init: async () => {
    try {
      const canvasApp = get().canvasApp
      if (!canvasApp) {
        throw new Error('Canvas not initialized yet!')
      }
      const sessionSigner = await getCurrentSessionSignerFromMagic()
      const userDid = await sessionSigner.getDid()
      const profile = await canvasApp.db.get<Profile>('profile', userDid)

      set({
        user: profile,
        canvasActions: canvasApp.as(sessionSigner),
        sessionSigner,
        isInitialized: true,
      })
    } catch (e) {
      // no user found, so we're not logged in
      set({ user: null, canvasActions: null, sessionSigner: null, isInitialized: true })
    }
  },
  //
  //
  //
  updateStagedProfileFields: (formFields: StagedProfileFields) => {
    set((state) => ({
      stagedProfileFields: { ...state.stagedProfileFields, ...formFields },
    }))
  },
  //
  //
  //
  updateUserLocation: async (location: string) => {
    try {
      const { canvasActions } = get()
      if (!canvasActions) throw new Error('Canvas actions not initialized')

      await canvasActions.updateProfileLocation(location)
    } catch (err) {
      console.error(err)
      throw err
    }
  },
  getUserByDid: async (did: string) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const user = await canvasApp.db.get<Profile>('profile', did)
    if (!user) throw new Error('Profile not found')
    return user
  },
  getUsersByDids: async (dids: string[]) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const users: Profile[] = []
    for (const did of dids) {
      const user = await canvasApp.db.get<Profile>('profile', did)
      if (user) users.push(user)
    }
    return users
  },
  getRandomUser: async () => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const allUsers = await canvasApp.db.query<Profile>('profile', {})
    const randomIndex = Math.floor(Math.random() * allUsers.length)
    return allUsers[randomIndex]
  },
  //
  // Requirement: staged user
  //
  register: async () => {
    const { stagedProfileFields, canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const { firstName, lastName, location, image, sessionSigner } = stagedProfileFields

    if (!sessionSigner) throw new Error('Session signer is required')

    try {
      const createProfileArgs = {
        firstName: firstName!,
        lastName: lastName!,
        location: location!,
        image: image!,
        created: formatDateString(new Date()),
        updated: formatDateString(new Date()),
      }

      const { result: newProfile } = await canvasApp
        .as(sessionSigner)
        .createProfile(createProfileArgs)

      set(() => ({
        user: newProfile,
      }))
      return newProfile
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  //
  //
  //
  login: async (sessionSigner: SessionSigner) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    // request a session
    await sessionSigner.newSession(canvasApp.topic)

    // get the profile from modeldb
    const userDid = await sessionSigner.getDid()
    const profile = await canvasApp.db.get<Profile>('profile', userDid)

    if (!profile) {
      throw new Error('Profile not found')
    }

    set({
      user: profile,
      sessionSigner,
    })
  },
  sessionSigner: null,
  //
  //
  //
  logout: () => {
    set(() => ({
      user: null,
      sessionSigner: null,
      stagedUser: {},
      isInitialized: true,
    }))

    pocketbase.realtime.unsubscribe()
    pocketbase.authStore.clear()
  },

  canvasActions: null,
})
