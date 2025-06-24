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

  $rules: {
    create: 'id === this.did',
    update: 'id === this.did',
    delete: false,
  },
} as const satisfies ModelInit
