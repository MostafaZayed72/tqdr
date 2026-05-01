<script setup lang="ts">
import { Menu, X, LogIn } from 'lucide-vue-next'

const isMenuOpen = ref(false)
const { locale } = useI18n()

const navLinks = [
  { nameKey: 'landing.nav.home', href: '#home' },
  { nameKey: 'landing.nav.how_it_works', href: '#features' },
  { nameKey: 'landing.nav.features', href: '#shops' },
  { nameKey: 'landing.nav.faq', href: '#faq' },
  { nameKey: 'landing.nav.contact', href: '#contact' },
]
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-[#020c02] font-['Tajawal']" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-[100] bg-white/80 dark:bg-[#020c02]/80 backdrop-blur-lg border-b border-gray-100 dark:border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex justify-between items-center h-20">
          <NuxtLink to="/" class="flex items-center gap-3">
            <img src="/logo.png" alt="Tqdr Plus Logo" class="h-16 w-auto" />
          </NuxtLink>

          <!-- Desktop Nav -->
          <div class="hidden md:flex items-center gap-8">
            <a 
              v-for="link in navLinks" 
              :key="link.href" 
              :href="link.href"
              class="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"
            >
              {{ $t(link.nameKey) }}
            </a>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-4">
            <ThemeLangSwitcher />
            <NuxtLink 
              to="/login"
              class="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-500 hover:bg-green-400 text-black font-black text-sm transition-all shadow-lg shadow-green-500/20"
            >
              <LogIn class="w-4 h-4" />
              <span>{{ $t('landing.nav.login') }}</span>
            </NuxtLink>
            
            <button @click="isMenuOpen = !isMenuOpen" class="md:hidden p-2 text-gray-600 dark:text-gray-400">
              <Menu v-if="!isMenuOpen" class="w-6 h-6" />
              <X v-else class="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Menu -->
      <div v-if="isMenuOpen" class="md:hidden bg-white dark:bg-[#020c02] border-t border-gray-100 dark:border-white/5 p-4 space-y-4 animate-fade-in">
        <a 
          v-for="link in navLinks" 
          :key="link.href" 
          :href="link.href"
          @click="isMenuOpen = false"
          class="block px-4 py-2 text-lg font-bold text-gray-700 dark:text-gray-300"
        >
          {{ $t(link.nameKey) }}
        </a>
        <NuxtLink 
          to="/login"
          class="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-green-500 text-black font-black"
        >
          <LogIn class="w-5 h-5" />
          <span>{{ $t('landing.nav.login') }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Page Content -->
    <main class="pt-20">
      <slot />
    </main>

    <TheFooter />
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
