/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Signups = "Signups",
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	Items = "items",
	Profiles = "profiles",
	Refs = "refs",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export enum SignupsOsOptions {
	"android" = "android",
	"ios" = "ios",
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
	ref?: RecordIdString
	text?: string
	updated?: IsoDateString
	url?: string
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

export enum RefsTypeOptions {
	"place" = "place",
	"artwork" = "artwork",
	"other" = "other",
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
}

export type UsersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	firstName?: string
	geolocation?: string
	id: string
	image?: string
	items?: RecordIdString[]
	lastName?: string
	location?: string
	password: string
	pushToken?: string
	tokenKey: string
	updated?: IsoDateString
	userName: string
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type SignupsResponse<Texpand = unknown> = Required<SignupsRecord> & BaseSystemFields<Texpand>
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type ItemsResponse<Texpand = unknown> = Required<ItemsRecord> & BaseSystemFields<Texpand>
export type ProfilesResponse<Texpand = unknown> = Required<ProfilesRecord> & BaseSystemFields<Texpand>
export type RefsResponse<Texpand = unknown> = Required<RefsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	Signups: SignupsRecord
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	items: ItemsRecord
	profiles: ProfilesRecord
	refs: RefsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	Signups: SignupsResponse
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	items: ItemsResponse
	profiles: ProfilesResponse
	refs: RefsResponse
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
	collection(idOrName: 'items'): RecordService<ItemsResponse>
	collection(idOrName: 'profiles'): RecordService<ProfilesResponse>
	collection(idOrName: 'refs'): RecordService<RefsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
