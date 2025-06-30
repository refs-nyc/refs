import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Refs',
  base: '/refs/',
  description: 'A social graph protocol powering the phonebook for the internet.',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [],

    sidebar: [{ text: 'Refs', link: '/' }],
    outline: false,
  },
})
