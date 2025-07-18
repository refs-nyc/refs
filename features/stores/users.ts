import { pocketbase } from '../pocketbase'
import { StateCreator } from 'zustand'
import { Profile, StagedProfileFields } from '../types'
import type { StoreSlices } from './types'
import type { SessionSigner } from '@canvas-js/interfaces'
import { canvasApp } from '../canvas/state'
import { getCurrentSessionSignerFromMagic } from '../magic'
import { formatDateString } from '../utils'

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
  setSessionSigner: (signer: SessionSigner) => void

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
      const sessionSigner = await getCurrentSessionSignerFromMagic()
      const userDid = await sessionSigner.getDid()
      const profile = await canvasApp.db.get<Profile>('profile', userDid)
      set({ user: profile, sessionSigner, isInitialized: true })
    } catch (e) {
      // no user found, so we're not logged in
      set({ user: null, sessionSigner: null, isInitialized: true })
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
      const { sessionSigner } = get()
      if (!sessionSigner) throw new Error('not logged in')

      await canvasApp.as(sessionSigner).updateProfileLocation(location)
    } catch (err) {
      console.error(err)
      throw err
    }
  },
  getUserByDid: async (did: string) => {
    const user = await canvasApp.db.get<Profile>('profile', did)
    if (!user) throw new Error('Profile not found')
    return user
  },
  getUsersByDids: async (dids: string[]) => {
    const users: Profile[] = []
    for (const did of dids) {
      const user = await canvasApp.db.get<Profile>('profile', did)
      if (user) users.push(user)
    }
    return users
  },
  getRandomUser: async () => {
    const allUsers = await canvasApp.db.query<Profile>('profile', {})
    const randomIndex = Math.floor(Math.random() * allUsers.length)
    return allUsers[randomIndex]
  },
  //
  // Requirement: staged user
  //
  register: async () => {
    const { stagedProfileFields } = get()

    const { firstName, lastName, location, image, sessionSigner } = stagedProfileFields

    if (!sessionSigner) throw new Error('Session signer is required')

    const userDid = await sessionSigner.getDid()

    try {
      const profile = {
        did: userDid,
        firstName: firstName!,
        lastName: lastName!,
        location: location!,
        image: image!,
        created: formatDateString(new Date()),
        updated: formatDateString(new Date()),
      }

      await canvasApp.as(sessionSigner).createProfile(profile)

      set(() => ({
        user: profile,
      }))
      return profile
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  //
  //
  //
  login: async (sessionSigner: SessionSigner) => {
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
  setSessionSigner: (signer: SessionSigner) => {
    set({ sessionSigner: signer })
  },
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
})
