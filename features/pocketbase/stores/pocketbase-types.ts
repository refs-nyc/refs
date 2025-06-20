/**
 * This file was @generated using pocketbase-typegen
 */

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
  Signups = 'Signups',
  Authorigins = '_authOrigins',
  Externalauths = '_externalAuths',
  Mfas = '_mfas',
  Otps = '_otps',
  Superusers = '_superusers',
  Conversations = 'conversations',
  Items = 'items',
  Memberships = 'memberships',
  Messages = 'messages',
  Profiles = 'profiles',
  Reactions = 'reactions',
  Refs = 'refs',
  Saves = 'saves',
  Test = 'test',
  Users = 'users',
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

type ExpandType<T> = unknown extends T
  ? T extends unknown
    ? { expand?: unknown }
    : { expand: T }
  : { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
  id: RecordIdString
  collectionId: string
  collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
  email: string
  emailVisibility: boolean
  username: string
  verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export enum SignupsOsOptions {
  'android' = 'android',
  'ios' = 'ios',
}
export type SignupsRecord = {
  cell?: string
  created?: IsoDateString
  email?: string
  id: string
  os?: SignupsOsOptions
  updated?: IsoDateString
}

export type AuthoriginsRecord = {
  collectionRef: string
  created?: IsoDateString
  fingerprint: string
  id: string
  recordRef: string
  updated?: IsoDateString
}

export type ExternalauthsRecord = {
  collectionRef: string
  created?: IsoDateString
  id: string
  provider: string
  providerId: string
  recordRef: string
  updated?: IsoDateString
}

export type MfasRecord = {
  collectionRef: string
  created?: IsoDateString
  id: string
  method: string
  recordRef: string
  updated?: IsoDateString
}

export type OtpsRecord = {
  collectionRef: string
  created?: IsoDateString
  id: string
  password: string
  recordRef: string
  sentTo?: string
  updated?: IsoDateString
}

export type SuperusersRecord = {
  created?: IsoDateString
  email: string
  emailVisibility?: boolean
  id: string
  password: string
  tokenKey: string
  updated?: IsoDateString
  verified?: boolean
}

export type ConversationsRecord = {
  created?: IsoDateString
  id: string
  is_direct?: boolean
  title?: string
}

export type ItemsRecord = {
  backlog?: boolean
  children?: RecordIdString[]
  created?: IsoDateString
  creator?: RecordIdString
  deleted?: IsoDateString
  id: string
  image?: string
  list?: boolean
  location?: string
  order?: number
  parent?: RecordIdString
  ref?: RecordIdString
  text?: string
  updated?: IsoDateString
  url?: string
}

export type MembershipsRecord = {
  archived?: boolean
  conversation: RecordIdString
  created?: IsoDateString
  id: string
  last_read?: IsoDateString
  updated?: IsoDateString
  user: RecordIdString
}

export type MessagesRecord = {
  conversation?: RecordIdString
  created?: IsoDateString
  id: string
  image?: string
  replying_to?: RecordIdString
  sender: RecordIdString
  text?: string
}

export type ProfilesRecord = {
  created?: IsoDateString
  firstName: string
  geolocation?: string
  id: string
  image?: string
  items?: RecordIdString[]
  lastName: string
  location?: string
  updated?: IsoDateString
  userName: string
}

export type ReactionsRecord = {
  created?: IsoDateString
  emoji: string
  id: string
  message: RecordIdString
  updated?: IsoDateString
  user: RecordIdString
}

export enum RefsTypeOptions {
  'place' = 'place',
  'artwork' = 'artwork',
  'other' = 'other',
}
export type RefsRecord = {
  created?: IsoDateString
  creator?: RecordIdString
  deleted?: IsoDateString
  id: string
  image?: string
  location?: string
  meta?: string
  title?: string
  type?: RefsTypeOptions
  updated?: IsoDateString
  url?: string
  showInTicker?: boolean
}

export type SavesRecord = {
  created?: IsoDateString
  id: string
  saved_by: RecordIdString
  updated?: IsoDateString
  user: RecordIdString
}

export type TestRecord = {
  created?: IsoDateString
  id: string
  updated?: IsoDateString
}

export type UsersRecord = {
  created?: IsoDateString
  email: string
  emailVisibility?: boolean
  firstName?: string
  id: string
  image?: string
  items?: RecordIdString[]
  lastName?: string
  lat?: number
  location?: string
  lon?: number
  password: string
  pushToken?: string
  tokenKey: string
  updated?: IsoDateString
  userName: string
  verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type SignupsResponse<Texpand = unknown> = Required<SignupsRecord> & BaseSystemFields<Texpand>
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> &
  BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> &
  BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> &
  AuthSystemFields<Texpand>
export type ConversationsResponse<Texpand = unknown> = Required<ConversationsRecord> &
  BaseSystemFields<Texpand>
export type ItemsResponse<Texpand = unknown> = Required<ItemsRecord> & BaseSystemFields<Texpand>
export type MembershipsResponse<Texpand = unknown> = Required<MembershipsRecord> &
  BaseSystemFields<Texpand>
export type MessagesResponse<Texpand = unknown> = Required<MessagesRecord> &
  BaseSystemFields<Texpand>
export type ProfilesResponse<Texpand = unknown> = Required<ProfilesRecord> &
  BaseSystemFields<Texpand>
export type ReactionsResponse<Texpand = unknown> = Required<ReactionsRecord> &
  BaseSystemFields<Texpand>
export type RefsResponse<Texpand = unknown> = Required<RefsRecord> & BaseSystemFields<Texpand>
export type SavesResponse<Texpand = unknown> = Required<SavesRecord> & BaseSystemFields<Texpand>
export type TestResponse<Texpand = unknown> = Required<TestRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
  Signups: SignupsRecord
  _authOrigins: AuthoriginsRecord
  _externalAuths: ExternalauthsRecord
  _mfas: MfasRecord
  _otps: OtpsRecord
  _superusers: SuperusersRecord
  conversations: ConversationsRecord
  items: ItemsRecord
  memberships: MembershipsRecord
  messages: MessagesRecord
  profiles: ProfilesRecord
  reactions: ReactionsRecord
  refs: RefsRecord
  saves: SavesRecord
  test: TestRecord
  users: UsersRecord
}

export type CollectionResponses = {
  Signups: SignupsResponse
  _authOrigins: AuthoriginsResponse
  _externalAuths: ExternalauthsResponse
  _mfas: MfasResponse
  _otps: OtpsResponse
  _superusers: SuperusersResponse
  conversations: ConversationsResponse
  items: ItemsResponse
  memberships: MembershipsResponse
  messages: MessagesResponse
  profiles: ProfilesResponse
  reactions: ReactionsResponse
  refs: RefsResponse
  saves: SavesResponse
  test: TestResponse
  users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
  collection(idOrName: 'Signups'): RecordService<SignupsResponse>
  collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
  collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
  collection(idOrName: '_mfas'): RecordService<MfasResponse>
  collection(idOrName: '_otps'): RecordService<OtpsResponse>
  collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
  collection(idOrName: 'conversations'): RecordService<ConversationsResponse>
  collection(idOrName: 'items'): RecordService<ItemsResponse>
  collection(idOrName: 'memberships'): RecordService<MembershipsResponse>
  collection(idOrName: 'messages'): RecordService<MessagesResponse>
  collection(idOrName: 'profiles'): RecordService<ProfilesResponse>
  collection(idOrName: 'reactions'): RecordService<ReactionsResponse>
  collection(idOrName: 'refs'): RecordService<RefsResponse>
  collection(idOrName: 'saves'): RecordService<SavesResponse>
  collection(idOrName: 'test'): RecordService<TestResponse>
  collection(idOrName: 'users'): RecordService<UsersResponse>
}
