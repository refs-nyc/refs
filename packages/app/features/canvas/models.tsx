export const models = {
  profiles: {
    did: 'primary',
    firstname: 'string',
    lastname: 'string',
    username: 'string',
    location: 'string?',
    geolocation: 'string?',
    image: 'string?',
    items: '@items[]',
  },
  items: {
    id: 'primary',
    title: 'string',
    text: 'string?',
    image: 'string?',
    location: 'string?',
    url: 'string?',
    children: '@items[]',
    createdAt: 'number', // sort by last created at first
    deletedAt: 'number?', // sort by last created at first
  },
  // Later, @raymond to rewrite: https://docs.canvas.xyz/examples-encrypted-chat.html
  messages: {
    id: 'primary', // id should always be `${userA}/${userB}` where userA is lexicographically first compared to userB
    message: 'string',
    createdAt: 'number',
  },
} as const
