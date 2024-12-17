export const models = {
  profiles: {
    did: 'primary',
    firstName: 'string',
    lastName: 'string',
    userName: 'string',
    location: 'string?',
    geolocation: 'string?',
    image: 'string?',
    items: '@items[]',
  },

  // Canonical information

  refs: {
    id: 'primary',
    title: 'string',
    createdAt: 'number',
    firstReferral: '@profile?',
    image: 'string?',
    location: 'string?',
    deletedAt: 'number?',
    referrals: '@profiles[]',
  },

  // Copies of above

  items: {
    id: 'primary',
    ref: '@refs',
    createdAt: 'number',
    image: 'string?',
    location: 'string?',
    text: 'string?',
    url: 'string?',
    children: '@items[]',
    deletedAt: 'number?',
    order: 'number', // range 0 - 11
    backlog: 'number', // 0 or 1
  },

  // Later, @raymond to rewrite: https://docs.canvas.xyz/examples-encrypted-chat.html

  messages: {
    id: 'primary', // id should always be `${userA}/${userB}` where userA is lexicographically first compared to userB
    message: 'string',
    createdAt: 'number',
  },
} as const
