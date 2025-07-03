import type { ModelInit } from '@canvas-js/core'

export const item = {
  id: 'primary',
  creator: '@profile',
  ref: '@ref',
  parent: '@item?',

  image: 'string?',
  url: 'string?',
  text: 'string?',

  list: 'boolean?',
  backlog: 'boolean?',
  order: 'number?',

  created: 'string?',
  deleted: 'string?',
  updated: 'string?',

  $indexes: ['id'],
} as const satisfies ModelInit

export const itemRules = {
  create: "id === creator + '/' + ref && creator === this.did",
  update: "id === creator + '/' + ref && creator === this.did",
  delete: 'creator === this.did',
}
