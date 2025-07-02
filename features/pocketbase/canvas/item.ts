import type { ModelInit } from '@canvas-js/core'

export const item = {
  id: 'primary',
  creator: '@profile',
  ref: '@ref',
  parent: '@item?',

  image: 'string?',
  location: 'string?',
  url: 'string?',
  text: 'string?',

  list: 'boolean?',
  backlog: 'boolean?',
  order: 'number?',

  created: 'string?',
  deleted: 'string?',
  updated: 'string?',

  $indexes: ['id'],
  $rules: {
    create: "id === creator + '/' + ref && creator === this.did",
    update: "id === creator + '/' + ref && creator === this.did",
    delete: 'creator === this.did',
  },
} as const satisfies ModelInit
