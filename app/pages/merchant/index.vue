<script setup lang="ts">
import { 
  Users, 
  Wallet, 
  Activity, 
  ArrowUpRight,
  Plus,
  ArrowRight,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-vue-next'

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'))

definePageMeta({
  layout: 'merchant'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()
const user = useSupabaseUser()

// Basic Stats
const stats = ref([
  { label: 'إجمالي العملاء', value: '0', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'إجمالي الأرصدة', value: '0', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'إيداعات اليوم', value: '0', icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { label: 'سحوبات اليوم', value: '0', icon: Activity, color: 'text-red-500', bg: 'bg-red-500/10' },
])

const recentTransactions = ref([])
const offerStats = ref([])
const loading = ref(true)

// Chart Data
const customerChart = ref({
  series: [],
  options: {
    labels: [],
    colors: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'],
    chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
    plotOptions: { pie: { donut: { size: '75%' } } },
    legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
    dataLabels: { enabled: false },
    stroke: { show: false }
  }
})

const balanceChart = ref({
  series: [{ name: 'الرصيد الحقيقي', data: [] }],
  options: {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#10b981'],
    plotOptions: { bar: { borderRadius: 12, columnWidth: '50%', distributed: true } },
    xaxis: { 
      categories: [],
      labels: { style: { colors: '#94a3b8', fontWeight: 600 } }
    },
    yaxis: { labels: { style: { colors: '#94a3b8' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { show: false },
    dataLabels: { 
      enabled: true,
      formatter: (val) => val.toLocaleString() + ' ر.س',
      offsetY: -20,
      style: { fontSize: '12px', colors: ["#304758"] }
    }
  }
})

const activityChart = ref({
  series: [
    { name: 'إيداعات', data: [] },
    { name: 'سحوبات', data: [] }
  ],
  options: {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#10b981', '#ef4444'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 4 },
    xaxis: { 
      categories: [],
      labels: { style: { colors: '#94a3b8' } }
    },
    yaxis: { labels: { style: { colors: '#94a3b8' } } },
    legend: { position: 'top', labels: { colors: '#94a3b8' } },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
  }
})

const fetchDashboardData = async () => {
  const { data: { user: currentUser } } = await client.auth.getUser()
  if (!currentUser) return
  
  try {
    loading.value = true
    
    // 1. Fetch Basic Totals
    const { count: customersCount } = await client
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('shop_owner_id', currentUser.id)

    const { data: balanceData } = await client
      .from('customers')
      .select('balance')
      .eq('shop_owner_id', currentUser.id)
    const totalBalance = balanceData?.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0) || 0

    // 2. Fetch Offers & Detailed Data
    const { data: offers } = await client.from('subscription_offers').select('*').eq('shop_owner_id', currentUser.id)
    const { data: subData } = await client.from('customer_subscriptions').select('offer_id, customer_id').eq('shop_owner_id', currentUser.id).eq('status', 'active')
    const { data: txData } = await client.from('transactions').select('amount, type, offer_id, created_at').eq('shop_owner_id', currentUser.id)

    // Calculate Offer Statistics
    const statsByOffer = offers?.map(offer => {
      const subCount = new Set(subData?.filter(s => s.offer_id === offer.id).map(s => s.customer_id)).size
      const balance = txData?.filter(t => t.offer_id === offer.id).reduce((acc, tx) => acc + (tx.type === 'deposit' ? Number(tx.amount) : -Number(tx.amount)), 0) || 0
      return { ...offer, subCount, balance }
    }) || []
    offerStats.value = statsByOffer

    // Calculate Prepaid Data (Ensure it matches the total balance card)
    const subBalancesTotal = statsByOffer.reduce((acc, o) => acc + o.balance, 0)
    const prepaidBalance = totalBalance - subBalancesTotal

    const subCustomerIds = new Set(subData?.map(s => s.customer_id) || [])
    const prepaidCount = (customersCount || 0) - subCustomerIds.size

    // 3. Update Charts with Granular Data
    customerChart.value.series = [prepaidCount, ...statsByOffer.map(o => o.subCount)]
    customerChart.value.options = {
      ...customerChart.value.options,
      labels: ['دفع مقدم', ...statsByOffer.map(o => o.name)]
    }

    balanceChart.value.series[0].data = [prepaidBalance, ...statsByOffer.map(o => o.balance)]
    balanceChart.value.options = {
      ...balanceChart.value.options,
      xaxis: {
        ...balanceChart.value.options.xaxis,
        categories: ['أرصدة مقدمة', ...statsByOffer.map(o => o.name)]
      }
    }

    // 4. Today's Precise Stats
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayTxs = txData?.filter(tx => new Date(tx.created_at) >= todayStart)
    const todayDeposits = todayTxs?.filter(t => t.type === 'deposit').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    const todayWithdrawals = todayTxs?.filter(t => t.type === 'withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

    stats.value[0].value = (customersCount || 0).toString()
    stats.value[1].value = `${totalBalance.toLocaleString()} ${t('common.currency')}`
    stats.value[2].value = `${todayDeposits.toLocaleString()} ${t('common.currency')}`
    stats.value[3].value = `${todayWithdrawals.toLocaleString()} ${t('common.currency')}`

    // 5. Weekly Activity
    const days = []
    const deposits = []
    const withdrawals = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      days.push(d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }))
      const dayTxs = txData?.filter(tx => new Date(tx.created_at).toDateString() === d.toDateString())
      deposits.push(dayTxs?.filter(t => t.type === 'deposit').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0)
      withdrawals.push(dayTxs?.filter(t => t.type === 'withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0)
    }
    activityChart.value.series[0].data = deposits
    activityChart.value.series[1].data = withdrawals
    activityChart.value.options.xaxis.categories = days

    // 6. Recent Transactions
    const { data: recentTxs } = await client
      .from('transactions')
      .select('*, customer:customers(name)')
      .eq('shop_owner_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(4)
    recentTransactions.value = recentTxs || []

  } catch (e) {
    console.error('Dashboard Fetch Error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboardData)
</script>

<template>
  <div class="space-y-12 animate-fade-in pb-20">
    <!-- Welcome Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
          <span>أهلاً بك، {{ user?.email?.split('@')[0] }}</span>
          <span class="animate-bounce">👋</span>
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-3 font-medium text-lg">تحليل ذكي وشامل لأداء متجرك الحقيقي اليوم.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <NuxtLink to="/customers" class="flex items-center gap-4 px-10 py-5 bg-emerald-500 text-slate-950 rounded-[32px] font-black hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/30 active:scale-95 group">
          <Plus class="w-7 h-7 group-hover:rotate-90 transition-transform" />
          <span>عميل جديد</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Main Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      <div v-for="stat in stats" :key="stat.label" class="bg-white dark:bg-slate-900 p-10 rounded-[48px] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:border-emerald-500/20 transition-all duration-500 relative overflow-hidden group">
        <div :class="stat.bg" class="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-1000"></div>
        <div class="relative z-10">
          <div :class="stat.bg" class="w-16 h-16 rounded-3xl flex items-center justify-center mb-8 transition-all group-hover:rotate-12 group-hover:scale-110 shadow-lg">
            <component :is="stat.icon" :class="stat.color" class="w-8 h-8" />
          </div>
          <h3 class="text-slate-400 dark:text-slate-500 font-bold mb-3 text-xs uppercase tracking-[0.2em]">{{ stat.label }}</h3>
          <p class="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- Detailed Offer Cards Section -->
    <div v-if="offerStats.length > 0" class="space-y-6">
      <div class="flex items-center gap-3 px-2">
        <Sparkles class="w-6 h-6 text-amber-500" />
        <h2 class="text-2xl font-black text-slate-900 dark:text-white">تفاصيل الاشتراكات النشطة</h2>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div 
          v-for="offer in offerStats" 
          :key="offer.id" 
          class="bg-gradient-to-br from-slate-900 to-slate-800 p-10 rounded-[48px] border border-white/5 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-500"
        >
          <div class="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors"></div>
          
          <div class="relative z-10 flex flex-col h-full">
            <div class="flex justify-between items-start mb-8">
              <div class="p-4 bg-white/5 rounded-3xl border border-white/10 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-500">
                <Layers class="w-6 h-6" />
              </div>
              <span class="px-5 py-2 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-black ring-1 ring-emerald-500/30">نشط الآن</span>
            </div>

            <h3 class="text-2xl font-black text-white mb-2">{{ offer.name }}</h3>
            <p class="text-slate-400 text-sm font-medium mb-8">توزيع حقيقي لبيانات العرض</p>

            <div class="grid grid-cols-2 gap-6 mt-auto">
              <div class="p-6 bg-white/5 rounded-[32px] border border-white/5">
                <p class="text-[10px] text-slate-500 font-bold uppercase mb-2">المشتركين</p>
                <p class="text-3xl font-black text-white">{{ offer.subCount }}</p>
              </div>
              <div class="p-6 bg-white/5 rounded-[32px] border border-white/5">
                <p class="text-[10px] text-slate-500 font-bold uppercase mb-2">الرصيد</p>
                <p class="text-2xl font-black text-emerald-400">{{ offer.balance.toLocaleString() }} <span class="text-[10px] opacity-60">ر.س</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Activity History - Main Chart -->
      <BaseCard class="lg:col-span-8 border-white/5 shadow-2xl !p-10">
        <div class="flex items-center justify-between mb-10">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-amber-500/10 rounded-[24px]">
              <TrendingUp class="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <h3 class="text-2xl font-black text-slate-900 dark:text-white">حركة المتجر والسيولة</h3>
              <p class="text-sm text-slate-500 font-medium">متابعة الإيداعات والسحوبات خلال الأسبوع</p>
            </div>
          </div>
        </div>
        <div class="h-[400px]">
          <ClientOnly>
            <ApexChart 
              height="100%" 
              width="100%"
              type="area"
              :options="activityChart.options" 
              :series="activityChart.series" 
            />
            <template #fallback>
              <div class="h-full flex items-center justify-center text-slate-400 font-bold italic">جاري معالجة البيانات وتحميل الرسم...</div>
            </template>
          </ClientOnly>
        </div>
      </BaseCard>

      <!-- Customer Breakdown -->
      <BaseCard class="lg:col-span-4 border-white/5 shadow-2xl !p-10">
        <div class="flex items-center gap-4 mb-10">
          <div class="p-4 bg-blue-500/10 rounded-[24px]">
            <PieIcon class="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white">تجزئة العملاء</h3>
            <p class="text-sm text-slate-500 font-medium">حسب نوع الاشتراك</p>
          </div>
        </div>
        <div class="h-[300px]">
          <ClientOnly>
            <ApexChart 
              height="100%" 
              width="100%"
              type="donut"
              :options="customerChart.options" 
              :series="customerChart.series" 
            />
          </ClientOnly>
        </div>
        <div class="mt-8 space-y-4">
          <div v-for="(val, idx) in customerChart.series" :key="idx" class="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: customerChart.options.colors[idx] }"></div>
              <span class="text-sm font-bold text-slate-600 dark:text-slate-300">{{ customerChart.options.labels[idx] }}</span>
            </div>
            <span class="font-black text-slate-900 dark:text-white">{{ val }}</span>
          </div>
        </div>
      </BaseCard>

      <!-- Balance Breakdown - Full Width Bar -->
      <BaseCard class="lg:col-span-12 border-white/5 shadow-2xl !p-10">
        <div class="flex items-center gap-4 mb-10">
          <div class="p-4 bg-emerald-500/10 rounded-[24px]">
            <BarChart3 class="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white">تحليل توزيع الأرصدة الحقيقية</h3>
            <p class="text-sm text-slate-500 font-medium">مقارنة بين أرصدة الدفع المقدم وأرصدة الاشتراكات المختلفة</p>
          </div>
        </div>
        <div class="h-[350px]">
          <ClientOnly>
            <ApexChart 
              height="100%" 
              width="100%"
              type="bar"
              :options="balanceChart.options" 
              :series="balanceChart.series" 
            />
          </ClientOnly>
        </div>
      </BaseCard>
    </div>

    <!-- Recent Transactions Section -->
    <BaseCard class="!p-0 overflow-hidden border-white/5 shadow-2xl">
      <div class="p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
        <div class="flex items-center gap-5">
          <div class="p-4 bg-emerald-500/10 rounded-[24px]">
            <Activity class="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <h3 class="text-3xl font-black text-slate-900 dark:text-white">أحدث العمليات</h3>
            <p class="text-base text-slate-500 font-medium">متابعة لحظية وشاملة لآخر حركات المتجر</p>
          </div>
        </div>
        <NuxtLink to="/transactions" class="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-sm rounded-[20px] border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-all shadow-sm">
          عرض سجل العمليات الكامل
        </NuxtLink>
      </div>
      
      <div class="overflow-x-auto">
        <div v-if="loading" class="p-24 text-center text-slate-400">
          <div class="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
          <p class="font-black text-xl">جاري مزامنة أحدث البيانات...</p>
        </div>
        <div v-else-if="recentTransactions.length === 0" class="p-24 text-center text-slate-500">
          <div class="flex flex-col items-center gap-6 opacity-30">
            <Activity class="w-24 h-24" />
            <p class="text-2xl font-bold">لا توجد عمليات مسجلة حالياً.</p>
          </div>
        </div>
        <div v-else class="min-w-[1000px]">
          <table class="w-full text-right">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 text-slate-500 text-sm font-bold border-b border-slate-100 dark:border-white/5">
                <th class="px-10 py-6">العميل</th>
                <th class="px-10 py-6">النوع</th>
                <th class="px-10 py-6">المبلغ</th>
                <th class="px-10 py-6">التوقيت</th>
                <th class="px-10 py-6 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              <tr v-for="tx in recentTransactions" :key="tx.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                <td class="px-10 py-8">
                  <p class="font-black text-slate-900 dark:text-white text-lg">{{ tx.customer?.name || 'عميل' }}</p>
                </td>
                <td class="px-10 py-8">
                  <div class="flex items-center gap-3">
                    <div :class="tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'" class="w-10 h-10 rounded-[14px] flex items-center justify-center">
                      <component :is="tx.type === 'deposit' ? Plus : Activity" class="w-5 h-5" />
                    </div>
                    <span class="font-black text-sm" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                      {{ tx.type === 'deposit' ? 'شحن رصيد' : 'سحب / خصم' }}
                    </span>
                  </div>
                </td>
                <td class="px-10 py-8">
                  <p class="font-black text-2xl" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                    {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} <span class="text-xs opacity-60 font-bold">ر.س</span>
                  </p>
                  <p v-if="tx.offer_id" class="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles class="w-3 h-3" /> عملية اشتراك خاصة
                  </p>
                </td>
                <td class="px-10 py-8">
                  <p class="text-sm text-slate-700 dark:text-slate-300 font-black">{{ new Date(tx.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }}</p>
                  <p class="text-xs text-slate-400 mt-1">{{ new Date(tx.created_at).toLocaleDateString('ar-EG') }}</p>
                </td>
                <td class="px-10 py-8">
                  <div class="flex justify-center">
                    <span class="px-6 py-2 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black ring-1 ring-emerald-500/20">مكتمل</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
:deep(.apexcharts-canvas) {
  margin: 0 auto;
}
:deep(.apexcharts-tooltip) {
  @apply !bg-slate-900 !border-slate-800 !text-white !rounded-[20px] !shadow-2xl;
  padding: 10px;
}
:deep(.apexcharts-tooltip-title) {
  @apply !bg-slate-800 !border-slate-700 !font-black;
  margin-bottom: 5px;
}
:deep(.apexcharts-legend-text) {
  @apply !text-slate-400 !font-bold !text-xs;
}
</style>
