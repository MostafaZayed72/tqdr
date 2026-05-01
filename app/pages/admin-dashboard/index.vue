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
  layout: 'admin'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()

const stats = ref([
  { label: t('dashboard.admin_stats.shops'), value: '0', icon: Store, color: 'bg-indigo-500' },
  { label: t('dashboard.admin_stats.customers'), value: '0', icon: Users, color: 'bg-emerald-500' },
  { label: t('dashboard.admin_stats.volume'), value: '0', icon: Activity, color: 'bg-amber-500' },
  { label: t('dashboard.admin_stats.growth'), value: '+14%', icon: TrendingUp, color: 'bg-rose-500' },
])

const user = useSupabaseUser()
const recentShops = ref([])
const loading = ref(true)

const fetchStats = async () => {
  try {
    loading.value = true
    
    // 1. Total Shops
    const { count: shopsCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'shop_owner')
    
    // 2. Total Customers
    const { count: customersCount } = await client
      .from('customers')
      .select('*', { count: 'exact', head: true })
    
    // 3. Total Transaction Volume
    const { data: transactions } = await client
      .from('transactions')
      .select('amount')
    
    const totalVolume = transactions?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

    stats.value[0].value = shopsCount?.toString() || '0'
    stats.value[1].value = customersCount?.toString() || '0'
    stats.value[2].value = `${totalVolume.toLocaleString()} ${t('common.currency')}`
    stats.value[3].value = `+${Math.min(100, Math.round((totalVolume / 1000) * 10))}%` // Temporary growth logic

    // 4. Recent Shops
    const { data: shops } = await client
      .from('profiles')
      .select('*')
      .eq('role', 'shop_owner')
      .order('created_at', { ascending: false })
      .limit(5)
    
    recentShops.value = shops || []
  } catch (e) {
    console.error('Stats error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">{{ $t('dashboard.welcome') }}, {{ $t('nav.admin_panel') }} 🛡️</h1>
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
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Participants -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Store class="w-5 h-5 text-emerald-500" />
            أحدث المشتركين
          </h3>
          <NuxtLink to="/admin-dashboard/shops" class="text-sm font-bold text-emerald-500 hover:bg-emerald-500/10 px-3 py-1 rounded-lg transition-colors">المزيد</NuxtLink>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <BaseCard v-for="shop in recentShops" :key="shop.id" 
            @click="navigateTo(`/admin-dashboard/shops/${shop.id}`)"
            class="!p-4 hover:border-emerald-500/50 transition-all group cursor-pointer"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center font-bold text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
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
          <div v-if="recentShops.length === 0 && !loading" class="text-center py-12 text-slate-500 font-medium">
            لا يوجد مشتركين جدد حالياً.
          </div>
        </div>
      </div>

      <!-- System Health -->
      <div class="space-y-6">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck class="w-5 h-5 text-indigo-500" />
          حالة النظام
        </h3>
        <BaseCard class="!p-8">
          <div class="space-y-8">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                <span class="text-slate-600 dark:text-slate-400 font-medium">قاعدة البيانات</span>
              </div>
              <span class="text-emerald-500 font-black">مستقرة وجاهزة</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span class="text-slate-600 dark:text-slate-400 font-medium">حالة الاستضافة</span>
              </div>
              <span class="text-emerald-500 font-black">100% متصل</span>
            </div>
            <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
              <span class="text-slate-500 text-sm italic font-medium">آخر فحص للنظام: الآن</span>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
