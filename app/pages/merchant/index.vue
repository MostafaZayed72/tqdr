<script setup lang="ts">
import { 
  Users, 
  Wallet, 
  Activity, 
  ArrowUpRight,
  Plus,
  ArrowRight
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()
const user = useSupabaseUser()

const stats = ref([
  { label: 'إجمالي العملاء', value: '0', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'إجمالي الأرصدة', value: '0', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'إيداعات اليوم', value: '0', icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { label: 'سحوبات اليوم', value: '0', icon: Activity, color: 'text-red-500', bg: 'bg-red-500/10' },
])

const recentTransactions = ref([])
const loading = ref(true)

const fetchDashboardData = async () => {
  const { data: { user: currentUser } } = await client.auth.getUser()
  if (!currentUser) return
  
  try {
    loading.value = true
    
    // 1. Fetch Total Customers
    const { count: customersCount } = await client
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('shop_owner_id', currentUser.id)

    // 2. Fetch Total Balance
    const { data: balanceData } = await client
      .from('customers')
      .select('balance')
      .eq('shop_owner_id', currentUser.id)
    
    const totalBalance = balanceData?.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0) || 0

    // 3. Fetch Today's Stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayTxs } = await client
      .from('transactions')
      .select('type, amount')
      .eq('shop_owner_id', currentUser.id)
      .gte('created_at', today.toISOString())

    const todayDeposits = todayTxs?.filter(t => t.type === 'deposit').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    const todayWithdrawals = todayTxs?.filter(t => t.type === 'withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

    stats.value[0].value = customersCount?.toString() || '0'
    stats.value[1].value = `${totalBalance.toLocaleString()} ${t('common.currency')}`
    stats.value[2].value = `${todayDeposits.toLocaleString()} ${t('common.currency')}`
    stats.value[3].value = `${todayWithdrawals.toLocaleString()} ${t('common.currency')}`

    // 4. Fetch Recent Transactions
    const { data: txs } = await client
      .from('transactions')
      .select('*, customer:customers(name)')
      .eq('shop_owner_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(8)
    
    recentTransactions.value = txs || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboardData)
</script>

<template>
  <div class="space-y-10 animate-fade-in pb-12">
    <!-- Welcome Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <span>أهلاً بك، {{ user?.email?.split('@')[0] }}</span>
          <span class="animate-bounce">👋</span>
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-2 font-medium">إليك نظرة شاملة على أداء متجرك الحقيقي اليوم.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <NuxtLink to="/customers" class="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-slate-950 rounded-[24px] font-black hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
          <Plus class="w-6 h-6" />
          <span>عميل جديد</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="stat in stats" :key="stat.label" class="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-emerald-500/50 transition-all duration-300 relative overflow-hidden">
        <div :class="stat.bg" class="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700"></div>
        <div class="relative z-10">
          <div :class="stat.bg" class="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12">
            <component :is="stat.icon" :class="stat.color" class="w-7 h-7" />
          </div>
          <h3 class="text-slate-500 dark:text-slate-400 font-bold mb-2 text-sm uppercase tracking-widest">{{ stat.label }}</h3>
          <p class="text-3xl font-black text-slate-900 dark:text-white">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- Recent Transactions Section -->
    <BaseCard class="!p-0 overflow-hidden border-white/5 shadow-2xl">
      <div class="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-emerald-500/10 rounded-2xl">
            <Activity class="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white">أحدث العمليات</h3>
            <p class="text-sm text-slate-500 font-medium">متابعة لحظية لآخر حركات المتجر</p>
          </div>
        </div>
        <NuxtLink to="/transactions" class="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-sm rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-all">
          {{ $t('common.view_all') || 'سجل العمليات الكامل' }}
        </NuxtLink>
      </div>
      
      <div class="overflow-x-auto">
        <div v-if="loading" class="p-20 text-center text-slate-400">
          <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p class="font-bold text-lg">جاري تحديث التقارير...</p>
        </div>
        <div v-else-if="recentTransactions.length === 0" class="p-20 text-center text-slate-500">
          <div class="flex flex-col items-center gap-4 opacity-30">
            <Activity class="w-20 h-20" />
            <p class="text-xl font-bold">لا توجد عمليات مسجلة حالياً.</p>
          </div>
        </div>
        <div v-else class="min-w-[800px]">
          <table class="w-full text-right">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 text-slate-500 text-sm font-bold border-b border-slate-100 dark:border-white/5">
                <th class="px-8 py-4">العميل</th>
                <th class="px-8 py-4">النوع</th>
                <th class="px-8 py-4">المبلغ</th>
                <th class="px-8 py-4">التوقيت</th>
                <th class="px-8 py-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              <tr v-for="tx in recentTransactions" :key="tx.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <td class="px-8 py-5">
                  <p class="font-black text-slate-900 dark:text-white">{{ tx.customer?.name || 'عميل' }}</p>
                </td>
                <td class="px-8 py-5">
                  <div class="flex items-center gap-2">
                    <div :class="tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'" class="w-8 h-8 rounded-lg flex items-center justify-center">
                      <component :is="tx.type === 'deposit' ? Plus : Activity" class="w-4 h-4" />
                    </div>
                    <span class="font-bold text-sm" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                      {{ tx.type === 'deposit' ? 'شحن رصيد' : 'سحب / خصم' }}
                    </span>
                  </div>
                </td>
                <td class="px-8 py-5">
                  <p class="font-black text-lg" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                    {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} <span class="text-xs opacity-60">ر.س</span>
                  </p>
                </td>
                <td class="px-8 py-5">
                  <p class="text-sm text-slate-500 font-bold">{{ new Date(tx.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }}</p>
                  <p class="text-[10px] text-slate-400">{{ new Date(tx.created_at).toLocaleDateString('ar-EG') }}</p>
                </td>
                <td class="px-8 py-5">
                  <div class="flex justify-center">
                    <span class="px-4 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-black ring-1 ring-emerald-500/20">مكتمل</span>
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
