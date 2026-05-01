<script setup lang="ts">
import { 
  Store, 
  Users, 
  Activity, 
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()

const stats = ref([
  { label: 'إجمالي المحلات', value: '0', icon: Store, color: 'bg-indigo-500' },
  { label: 'إجمالي العملاء', value: '0', icon: Users, color: 'bg-emerald-500' },
  { label: 'حجم العمليات', value: '0', icon: Activity, color: 'bg-amber-500' },
  { label: 'النمو الشهري', value: '+14%', icon: TrendingUp, color: 'bg-rose-500' },
])

const recentShops = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { count: shopsCount } = await client.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'shop_owner')
    const { count: customersCount } = await client.from('customers').select('*', { count: 'exact', head: true })
    const { data: transactions } = await client.from('transactions').select('amount')
    
    const totalVolume = transactions?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

    stats.value[0].value = shopsCount?.toString() || '0'
    stats.value[1].value = customersCount?.toString() || '0'
    stats.value[2].value = `${totalVolume.toLocaleString()} ${t('common.currency')}`

    const { data: shops } = await client
      .from('profiles')
      .select('*')
      .eq('role', 'shop_owner')
      .order('created_at', { ascending: false })
      .limit(5)
    
    recentShops.value = shops || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">مرحباً، مسؤول النظام 🛡️</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">إليك تقرير شامل عن أداء المنصة بالكامل.</p>
      </div>
      
      <div class="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full text-sm font-bold">
        <Activity class="w-4 h-4" />
        النظام يعمل بكفاءة عالية
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <BaseCard v-for="stat in stats" :key="stat.label" class="relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <div :class="`p-3 ${stat.color} text-white rounded-2xl shadow-lg shadow-current/20`">
            <component :is="stat.icon" class="w-6 h-6" />
          </div>
          <ArrowUpRight class="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
        </div>
        <div class="mt-4">
          <p class="text-slate-500 dark:text-slate-400 font-medium text-sm">{{ stat.label }}</p>
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ stat.value }}</h3>
        </div>
      </BaseCard>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Performance Chart -->
      <div class="lg:col-span-2 space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">أداء المنصة</h3>
          <div class="flex items-center gap-2">
            <button class="px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg">أسبوعي</button>
            <button class="px-3 py-1 text-xs font-bold bg-emerald-500 text-slate-950 rounded-lg">شهري</button>
          </div>
        </div>
        
        <BaseCard class="h-[400px] flex items-center justify-center relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent"></div>
          <div class="text-center space-y-4 relative z-10">
            <BarChart3 class="w-16 h-16 text-emerald-500/20 mx-auto" />
            <p class="text-slate-400 font-medium italic">رسم بياني تفاعلي (قريباً)</p>
          </div>
        </BaseCard>
      </div>

      <!-- System Health & Recent -->
      <div class="space-y-6">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">حالة النظام</h3>
        <BaseCard>
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-400">قاعدة البيانات</span>
              <span class="flex items-center gap-2 text-emerald-500 font-bold">
                <div class="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                مستقرة
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-400">الاستضافة</span>
              <span class="text-emerald-500 font-bold">100% متصل</span>
            </div>
          </div>
        </BaseCard>

        <div class="flex items-center justify-between mt-8">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">أحدث المشتركين</h3>
          <NuxtLink to="/admin/shops" class="text-sm font-bold text-emerald-500 hover:underline">المزيد</NuxtLink>
        </div>

        <div class="space-y-4">
          <BaseCard v-for="shop in recentShops" :key="shop.id" class="!p-4 hover:border-emerald-500/50 transition-colors group">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center font-bold text-slate-500">
                  {{ shop.email.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h4 class="font-bold text-sm text-slate-900 dark:text-white leading-none">{{ shop.shop_name || shop.email.split('@')[0] }}</h4>
                  <p class="text-[10px] text-slate-500 mt-1">{{ new Date(shop.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') }}</p>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-300 group-hover:translate-x-[-4px] transition-transform" />
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
  </div>
</template>
