import type { ModelInit } from '@canvas-js/core'

export const connection = {
  id: 'primary',
  creator: '@profile',
  ref: '@ref',

  image: 'string?',
  location: 'string?',
  url: 'string?',
  text: 'string?',
  children: '@connection[]',

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
