import { item } from './item'
import { profile } from './profile'
import { ref } from './ref'
import { Contract, DeriveModelTypes, ModelSchema } from '@canvas-js/core'
import { Canvas } from '@canvas-js/core/sync'

export const models = {
  item,
  profile,
  ref,
} as const satisfies ModelSchema

export type ModelTypes = DeriveModelTypes<typeof models>

export default class Refs extends Contract<typeof Refs.models> {
  static models = {
    item,
    profile,
    ref,
  } satisfies ModelSchema
}

export const canvasApp = new Canvas({ topic: 'alpha.refs.nyc', contract: Refs })
