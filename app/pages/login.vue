<script setup lang="ts">
definePageMeta({
  layout: false
})

const { t, locale } = useI18n()
const client = useSupabaseClient()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  try {
    loading.value = true
    errorMsg.value = ''
    
    const { data, error } = await client.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw error

    if (!data.user?.id) {
      throw new Error('Authentication failed: No user ID returned')
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      // If no profile, we can't determine role
      await client.auth.signOut()
      throw new Error('لم يتم العثور على صلاحيات لهذا الحساب. يرجى التواصل مع الإدارة.')
    }

    const role = profile.role

    if (role === 'admin') {
      await navigateTo('/admin-dashboard')
    } else if (role === 'shop_owner') {
      await navigateTo('/merchant')
    } else if (role === 'customer') {
      await navigateTo('/customers')
    } else {
      await navigateTo('/')
    }
  } catch (e: any) {
    errorMsg.value = e.message || t('auth.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-['Tajawal'] transition-colors duration-500" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <!-- Background Glow Effects -->
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-[120px] animate-pulse"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>

    <div class="absolute top-6 right-6 z-20">
      <ThemeLangSwitcher />
    </div>

    <div class="w-full max-w-md relative z-10 animate-slide-up">
      <div class="text-center mb-8">
        <img src="/logo.png" alt="Logo" class="w-24 h-24 mx-auto mb-4 drop-shadow-xl" />
        <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">
          {{ $t('brand.name') }} <span class="text-emerald-500">{{ $t('brand.suffix') }}</span>
        </h1>
        <p class="text-slate-500 dark:text-slate-400">{{ $t('brand.description') }}</p>
      </div>

      <!-- Login Card -->
      <div class="glass-card p-8 rounded-[40px]">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">{{ $t('auth.login') }}</h2>
        
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">{{ $t('auth.email') }}</label>
            <input 
              v-model="email"
              type="email" 
              required
              class="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-emerald-500/50 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">{{ $t('auth.password') }}</label>
            <input 
              v-model="password"
              type="password" 
              required
              class="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-emerald-500/50 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
              placeholder="••••••••"
            />
          </div>

          <div v-if="errorMsg" class="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-2xl animate-fade-in">
            {{ errorMsg }}
          </div>

          <button 
            type="submit"
            :disabled="loading"
            class="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black py-5 rounded-2xl transition-all transform active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
            <span>{{ loading ? $t('auth.logging_in') : $t('auth.login_btn') }}</span>
          </button>
        </form>

        <div class="mt-8 text-center text-slate-400 text-xs font-medium">
          {{ $t('auth.rights') }} &copy; {{ new Date().getFullYear() }} {{ $t('brand.name') }} {{ $t('brand.suffix') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.1); }
}
</style>
