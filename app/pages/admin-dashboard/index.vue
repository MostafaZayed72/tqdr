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
])

const user = useSupabaseUser()
const recentShops = ref([])
const loading = ref(true)

const dateFilter = ref('month')
const customRange = ref({ start: '', end: '' })
const showDatePicker = ref(false)

const getDateRange = () => {
  const now = new Date()
  let start = new Date()
  
  if (dateFilter.value === 'today') {
    start.setHours(0, 0, 0, 0)
  } else if (dateFilter.value === 'week') {
    start.setDate(now.getDate() - 7)
  } else if (dateFilter.value === 'month') {
    start.setMonth(now.getMonth() - 1)
  } else if (dateFilter.value === 'custom' && customRange.value.start) {
    return { 
      start: new Date(customRange.value.start).toISOString(),
      end: customRange.value.end ? new Date(customRange.value.end).toISOString() : now.toISOString()
    }
  }
  
  return { start: start.toISOString(), end: now.toISOString() }
}

const fetchStats = async () => {
  try {
    loading.value = true
    const { start, end } = getDateRange()
    
    // 1. Total Shops (Global or by date)
    const { count: shopsCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'shop_owner')
      .gte('created_at', start)
      .lte('created_at', end)
    
    // 2. Total Customers
    const { count: customersCount } = await client
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end)
    
    // 3. Total Transaction Volume
    const { data: transactions } = await client
      .from('transactions')
      .select('amount')
      .gte('created_at', start)
      .lte('created_at', end)
    
    const totalVolume = transactions?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

    stats.value[0].value = shopsCount?.toString() || '0'
    stats.value[1].value = customersCount?.toString() || '0'
    stats.value[2].value = `${totalVolume.toLocaleString()} ${t('common.currency')}`

    // 4. Recent Shops (Always show latest 5 regardless of filter)
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
watch([dateFilter, customRange], fetchStats)
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header & Date Filter -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">{{ $t('dashboard.welcome') }}, {{ $t('nav.admin_panel') }} 🛡️</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">إليك تقرير شامل عن أداء المنصة بالكامل.</p>
      </div>
      
      <div class="flex flex-col md:flex-row items-end md:items-center gap-3">
        <!-- Date Selector Dropdown -->
        <div class="relative group min-w-[200px]">
          <Calendar class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 z-10" />
          <select 
            v-model="dateFilter"
            class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl pr-12 pl-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 appearance-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm"
          >
            <option value="today">إحصائيات اليوم</option>
            <option value="week">آخر أسبوع</option>
            <option value="month">آخر شهر</option>
            <option value="custom">نطاق مخصص</option>
          </select>
        </div>

        <!-- Custom Range Inputs -->
        <div v-if="dateFilter === 'custom'" class="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
          <input 
            v-model="customRange.start"
            type="date"
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-emerald-500/20"
          />
          <span class="text-slate-400 text-xs font-bold">إلى</span>
          <input 
            v-model="customRange.end"
            type="date"
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
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
    <div class="max-w-4xl">
      <!-- Recent Participants -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Store class="w-5 h-5 text-emerald-500" />
            أحدث المشتركين
          </h3>
          <NuxtLink to="/admin-dashboard/shops" class="text-sm font-bold text-emerald-500 hover:bg-emerald-500/10 px-3 py-1 rounded-lg transition-colors">المزيد</NuxtLink>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div v-if="recentShops.length === 0 && !loading" class="col-span-full text-center py-12 text-slate-500 font-medium bg-slate-50 dark:bg-white/5 rounded-[32px]">
            لا يوجد مشتركين جدد حالياً.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
