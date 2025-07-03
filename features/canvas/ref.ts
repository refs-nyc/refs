import type { ModelInit } from '@canvas-js/core'

export const ref = {
  id: 'primary',
  creator: '@profile?',

  title: 'string?',
  image: 'string?',
  url: 'string?',
  meta: 'string?',

  created: 'string?',
  updated: 'string?',
  deleted: 'string?',
} as const satisfies ModelInit

export const refRules = {
  create: 'creator === this.did',
  update: 'creator === this.did',
  delete: false,
}
