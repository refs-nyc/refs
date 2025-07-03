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

  $rules: {
    create: "creator === this.did && ['place', 'artwork', 'other'].includes(type)",
    update: "creator === this.did && ['place', 'artwork', 'other'].includes(type)",
    delete: false,
  },
} as const satisfies ModelInit
