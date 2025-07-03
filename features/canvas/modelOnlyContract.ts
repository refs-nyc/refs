import { item, itemRules } from './item'
import { profile, profileRules } from './profile'
import { ref, refRules } from './ref'

import { Contract, ModelSchema } from '@canvas-js/core'

export default class Refs extends Contract<typeof Refs.models> {
  static models = {
    item: { ...item, $rules: itemRules },
    profile: { ...profile, $rules: profileRules },
    ref: { ...ref, $rules: refRules },
  } satisfies ModelSchema
}
