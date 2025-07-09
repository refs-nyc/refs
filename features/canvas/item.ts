import type { ModelInit } from '@canvas-js/core'

export const item = {
  // the id format is creator/<unique string>
  // this is so that we can enforce the create/update rules
  // i.e. an item can only be updated by its creator
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
  create: "id.split('/')[0] == creator && creator === this.did",
  update: "id.split('/')[0] == creator && creator === this.did",
  delete: 'creator === this.did',
}
