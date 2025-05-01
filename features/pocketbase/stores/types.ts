import * as PBTypes from './pocketbase-types'

// Logged out user
export type EmptyProfile = {}

export type StagedRef = Partial<PBTypes.RefsRecord>
export type StagedItem = Partial<PBTypes.ItemsRecord>

export type CompleteRef = PBTypes.RefsRecord
export type Profile = PBTypes.UsersRecord
export type Item = PBTypes.ItemsRecord

export type ExpandedProfile = PBTypes.UsersResponse<{ items: PBTypes.ItemsRecord[] }>
export type ExpandedItem = PBTypes.ItemsResponse<{
  ref: PBTypes.RefsRecord
  creator: PBTypes.UsersRecord
  children: PBTypes.ItemsRecord[]
}>

export type GridTileType = 'add' | 'image' | 'text' | 'list' | ''

export type Conversation = PBTypes.ConversationsRecord
export type Message = PBTypes.MessagesRecord
export type Reaction = PBTypes.ReactionsRecord
export type Save = PBTypes.SavesRecord

export type ConversationWithMemberships = PBTypes.ConversationsResponse<{
  memberships_via_conversation: ExpandedMembership[]
}>
export type ExpandedMembership = PBTypes.MembershipsResponse<{ user: PBTypes.UsersRecord }>
export type ExpandedReaction = PBTypes.ReactionsResponse<{ user: PBTypes.UsersRecord }>
export type ExpandedSave = PBTypes.SavesResponse<{ user: PBTypes.UsersRecord }>
