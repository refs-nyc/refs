import type { SessionSigner } from '@canvas-js/interfaces'

import { getEncryptionPublicKey } from '../encryption'
import { StateCreator } from 'zustand'
import type { RefsCanvas } from '../canvas/contract'
import { getCurrentJsonRpcSignerFromMagic, getEncryptionWallet, magic } from '../magic'
import { Profile, StagedProfileFields } from '../types'
import type { StoreSlices } from './types'
import { Wallet } from 'ethers'
import { createRef, MutableRefObject } from 'react'
import { SIWESigner } from '@canvas-js/signer-ethereum'
import { JsonRpcSigner } from '@ethersproject/providers'

const subscriptions = createRef<number[]>() as MutableRefObject<number[]>
subscriptions.current = []

export type UserSlice = {
  usersSubscriptions: MutableRefObject<number[]>
  subscribeToUsers: () => void
  unsubscribeFromUsers: () => void

  profilesByUserDid: Record<string, Profile>
  updateProfiles: (profiles: Profile[]) => void

  stagedProfileFields: StagedProfileFields
  user: Profile | null
  isInitialized: boolean
  register: () => Promise<Profile>
  updateUserLocation: (location: string) => Promise<void>
  updateStagedProfileFields: (formFields: StagedProfileFields) => void
  getUserByDid: (did: string) => Profile
  getUsersByDids: (dids: string[]) => Profile[]
  getRandomUser: () => Promise<Profile>
  login: (signer: JsonRpcSigner) => Promise<void>
  sessionSigner: SessionSigner | null
  encryptionWallet: Wallet | null

  canvasActions: ReturnType<RefsCanvas['as']> | null

  logout: () => void
  init: () => Promise<void>
}

export const createUserSlice: StateCreator<StoreSlices, [], [], UserSlice> = (set, get) => ({
  usersSubscriptions: subscriptions,
  subscribeToUsers: () => {
    const { canvasApp, updateProfiles, usersSubscriptions } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const profileSubscription = canvasApp.db.subscribe('profile', {}, (results) =>
      updateProfiles(results as Profile[])
    )

    usersSubscriptions.current = [profileSubscription.id]
  },
  unsubscribeFromUsers: () => {
    const { canvasApp, usersSubscriptions } = get()
    if (!canvasApp) {
      // canvas app doesn't exist, so we have already unsubscribed
      usersSubscriptions.current = []
      return
    }

    for (const subscription of usersSubscriptions.current) {
      canvasApp?.db.unsubscribe(subscription)
    }

    usersSubscriptions.current = []
  },

  profilesByUserDid: {},
  updateProfiles: (profiles: Profile[]) => {
    const profilesByUserDid: Record<string, Profile> = {}
    for (const profile of profiles) {
      profilesByUserDid[profile.did] = profile
    }
    set({ profilesByUserDid })
  },

  stagedProfileFields: {},
  user: null, // user is ALWAYS the user of the app, this is only set if the user is logged in
  isInitialized: false,
  encryptionWallet: null,
  //
  //
  //
  init: async () => {
    const { canvasApp, profilesByUserDid } = get()
    try {
      if (!canvasApp) {
        throw new Error('Canvas not initialized yet!')
      }

      const jsonRpcSigner = getCurrentJsonRpcSignerFromMagic()
      const sessionSigner = new SIWESigner({ signer: jsonRpcSigner })
      const userDid = await sessionSigner.getDid()
      const profile = profilesByUserDid[userDid]

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
  getUserByDid: (did: string) => {
    const { profilesByUserDid } = get()

    const user = profilesByUserDid[did]

    if (!user) throw new Error('Profile not found')
    return user
  },
  getUsersByDids: (dids: string[]) => {
    const { canvasApp, profilesByUserDid } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const users: Profile[] = []
    for (const did of dids) {
      const user = profilesByUserDid[did]
      if (user) users.push(user)
    }
    return users
  },
  getRandomUser: async () => {
    const { profilesByUserDid } = get()

    const allUsers = Object.values(profilesByUserDid)
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

    const { firstName, lastName, location, image, jsonRpcSigner } = stagedProfileFields

    if (!jsonRpcSigner) throw new Error('JSON RPC signer is required')

    try {
      const createProfileArgs = {
        firstName: firstName!,
        lastName: lastName!,
        location: location!,
        image: image!,
      }

      const encryptionWallet = await getEncryptionWallet(jsonRpcSigner)
      // publicEncryptionKey = the public part of the keypair
      const encryptionPublicKey = getEncryptionPublicKey(encryptionWallet.privateKey.slice(2))

      const sessionSigner = new SIWESigner({ signer: jsonRpcSigner })
      const { result: newProfile } = await canvasApp
        .as(sessionSigner)
        .createProfile(createProfileArgs, encryptionPublicKey)

      set(() => ({
        canvasActions: canvasApp.as(sessionSigner),
        encryptionWallet,
        sessionSigner,
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
  login: async (signer) => {
    const { canvasApp, profilesByUserDid } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const sessionSigner = new SIWESigner({ signer })
    // request a session
    await sessionSigner.newSession(canvasApp.topic)

    // get the profile from modeldb
    const userDid = await sessionSigner.getDid()
    const profile = profilesByUserDid[userDid]

    if (!profile) {
      throw new Error('Profile not found')
    }

    const encryptionWallet = await getEncryptionWallet(signer)

    set({
      canvasActions: canvasApp.as(sessionSigner),
      encryptionWallet,
      sessionSigner,
      user: profile,
    })
  },
  sessionSigner: null,
  //
  //
  //
  logout: () => {
    magic.user.logout()
    set(() => ({
      user: null,
      sessionSigner: null,
      encryptionWallet: null,
      stagedUser: {},
      isInitialized: true,
    }))
  },

  canvasActions: null,
})
