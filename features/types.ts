import { DeriveModelTypes } from '@canvas-js/core'
import type { SessionSigner } from '@canvas-js/interfaces'
import RefsContract from './canvas/contract'

type ContractModelTypes = DeriveModelTypes<typeof RefsContract.models>

export type Item = ContractModelTypes['item']
export type Ref = ContractModelTypes['ref']
export type Profile = ContractModelTypes['profile']

export type ExpandedProfile = Profile & {
  items: Item[]
}

export type ExpandedItem = Item & {
  expand: { ref: Ref; creator: Profile; items_via_parent: ItemWithRef[] }
}

export type ItemWithRef = Item & {
  expand: { ref: Ref }
}

export type GridTileType = 'add' | 'image' | 'text' | 'list' | 'placeholder' | ''

export type Membership = ContractModelTypes['membership']
export type Conversation = ContractModelTypes['conversation']
export type Message = ContractModelTypes['message']
export type Reaction = ContractModelTypes['reaction']
export type Save = ContractModelTypes['save']

export type ConversationWithMemberships = Conversation & {
  expand: { memberships_via_conversation: ExpandedMembership[] }
}
export type ExpandedMembership = Membership & {
  expand: { user: Profile }
}
export type ExpandedReaction = Reaction & {
  expand: { user: Profile }
}
export type ExpandedSave = Save & {
  expand: { user: Profile }
}

// these are the fields that are provided by the user in the new/update ref form
export type StagedItemFields = {
  title?: string // only used when creating a new ref
  meta?: string // only used when creating a new ref
  text: string
  url: string
  image: string
  promptContext?: string // NEW: the prompt the user replied to
  list?: boolean
  parent: string | null
}

export type StagedRefFields = {
  title?: string
  url?: string
  meta?: string
  image?: string
}

export type StagedProfileFields = {
  sessionSigner?: SessionSigner
  firstName?: string
  lastName?: string
  location?: string
  image?: string
}
