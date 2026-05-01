<script setup lang="ts">
const { locale } = useI18n()
const isDark = ref(true)

onMounted(() => {
  const dark = useDark()
  isDark.value = dark.value
  
  const stored = localStorage.getItem('vueuse-color-scheme')
  if (!stored) dark.value = true
})

useHead({
  htmlAttrs: {
    lang: computed(() => locale.value),
    dir: computed(() => locale.value === 'ar' ? 'rtl' : 'ltr'),
  },
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
