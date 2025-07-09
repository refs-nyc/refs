import type { ModelInit } from '@canvas-js/core'

export const ref = {
  // id has the format creator/<unique string>
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
  create: 'id.split("/")[0] == creator && creator === this.did',
  update: 'id.split("/")[0] == creator && creator === this.did',
  delete: false,
}
