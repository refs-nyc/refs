<template>
  <div class="sidebar-logo">
    <img
      v-if="!isDark"
      src="/icon_logo.png"
      alt="Logo"
      class="logo-img"
    />
    <img
      v-else
      src="/icon_logo_dark.png"
      alt="Logo Dark"
      class="logo-img"
    />
  </div>
</template>

<script setup lang="ts">
import { useData } from 'vitepress'
const { isDark } = useData()
</script>

<style scoped>
.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 0 1rem 0;
}
.logo-img {
  max-width: 36px;
  height: auto;
  display: block;
}
</style> 