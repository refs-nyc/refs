import { item } from './item'
import { profile } from './profile'
import { ref } from './ref'

import { Contract, ModelSchema } from '@canvas-js/core'

export default class Refs extends Contract<typeof Refs.models> {
  static models = {
    item,
    profile,
    ref,
  } satisfies ModelSchema
}
