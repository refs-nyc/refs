import type { ModelInit } from '@canvas-js/core'

export const profile = {
  id: 'primary',
  userName: 'string',

  firstName: 'string',
  lastName: 'string',
  geolocation: 'string?',
  location: 'string?',
  image: 'string?',

  created: 'string?',
  updated: 'string?',
} as const satisfies ModelInit

export const profileRules = {
  create: 'id === this.did',
  update: 'id === this.did',
  delete: false,
}
