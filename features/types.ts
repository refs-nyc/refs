import * as PBTypes from '@/features/pocketbase/pocketbase-types'

export type CompleteRef = PBTypes.RefsRecord
export type Profile = PBTypes.UsersRecord
export type Item = PBTypes.ItemsRecord

export type ExpandedProfile = PBTypes.UsersResponse<{ items: PBTypes.ItemsRecord[] }>
export type ExpandedItem = PBTypes.ItemsResponse<{
  ref: PBTypes.RefsRecord
  creator: PBTypes.UsersRecord
  items_via_parent: Array<PBTypes.ItemsResponse<{
    ref: PBTypes.RefsRecord
  }>> // list children with expanded refs
}>

export type GridTileType = 'add' | 'image' | 'text' | 'list' | 'placeholder' | 'prompt' | ''

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

// these are the fields that are provided by the user in the new/update ref form
export type StagedItemFields = {
  title?: string // only used when creating a new ref
  meta?: string // only used when creating a new ref
  text: string
  url: string
  image: string
  promptContext?: string // NEW: the prompt the user replied to
  list?: boolean
  parent?: string
  order?: number
}

export type StagedRefFields = {
  title?: string
  url?: string
  meta?: string
  image?: string
}
