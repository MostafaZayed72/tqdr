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
  { label: 'عمليات اليوم', value: '0', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
])

const recentTransactions = ref([])
const loading = ref(true)

const fetchDashboardData = async () => {
  if (!user.value?.id) return
  
  try {
    loading.value = true
    
    // 1. Fetch Stats
    const { count: customersCount } = await client
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('shop_owner_id', user.value.id)

    const { data: balanceData } = await client
      .from('customers')
      .select('balance')
      .eq('shop_owner_id', user.value.id)
    
    const totalBalance = balanceData?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayTxs } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('shop_owner_id', user.value.id)
      .gte('created_at', today.toISOString())

    stats.value[0].value = customersCount?.toString() || '0'
    stats.value[1].value = `${totalBalance.toLocaleString()} ${t('common.currency')}`
    stats.value[2].value = todayTxs?.toString() || '0'

    // 2. Fetch Recent Transactions
    const { data: txs } = await client
      .from('transactions')
      .select('*, customer:customers(name)')
      .eq('shop_owner_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
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
  <div class="space-y-8 animate-fade-in">
    <!-- Welcome Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">أهلاً بك، {{ user?.email?.split('@')[0] }} 👋</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">إليك نظرة سريعة على أداء متجرك اليوم.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <NuxtLink to="/customers" class="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
          <Plus class="w-5 h-5" />
          <span>عميل جديد</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <BaseCard v-for="stat in stats" :key="stat.label" class="group hover:border-emerald-500/50 transition-all duration-300">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-slate-500 dark:text-slate-400 font-bold mb-2 text-sm uppercase tracking-wider">{{ stat.label }}</h3>
            <p class="text-3xl font-black text-slate-900 dark:text-white">{{ stat.value }}</p>
          </div>
          <div :class="stat.bg" class="p-3 rounded-2xl transition-transform group-hover:scale-110">
            <component :is="stat.icon" :class="stat.color" class="w-6 h-6" />
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Transactions -->
      <BaseCard class="!p-0 overflow-hidden flex flex-col h-full">
        <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h3 class="text-xl font-black text-slate-900 dark:text-white">أحدث العمليات</h3>
          <NuxtLink to="/transactions" class="text-emerald-500 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
            {{ $t('common.view_all') || 'عرض الكل' }}
            <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>
        
        <div class="flex-1">
          <div v-if="loading" class="p-12 text-center text-slate-400">
            <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            جاري جلب البيانات...
          </div>
          <div v-else-if="recentTransactions.length === 0" class="p-12 text-center text-slate-500">
            لا توجد عمليات مسجلة حالياً.
          </div>
          <div v-else class="divide-y divide-slate-100 dark:divide-white/5">
            <div v-for="tx in recentTransactions" :key="tx.id" class="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div :class="tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'" class="w-10 h-10 rounded-xl flex items-center justify-center">
                  <component :is="tx.type === 'deposit' ? Plus : Activity" class="w-5 h-5" />
                </div>
                <div>
                  <p class="font-bold text-slate-900 dark:text-white text-sm">{{ tx.customer?.name || 'عميل' }}</p>
                  <p class="text-[10px] text-slate-500">{{ new Date(tx.created_at).toLocaleString('ar-EG') }}</p>
                </div>
              </div>
              <p class="font-black" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} {{ $t('common.currency') }}
              </p>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Quick Actions / Guide -->
      <BaseCard class="bg-gradient-to-br from-emerald-500 to-teal-600 text-white !p-8 relative overflow-hidden h-full">
        <div class="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div class="relative z-10 flex flex-col h-full">
          <h3 class="text-2xl font-black mb-4 tracking-tight">نصيحة اليوم 💡</h3>
          <p class="text-emerald-100 font-medium mb-8 leading-relaxed">
            اجعل عملاءك يشعرون بالتقدير! قم بإضافة رصيد مجاني (بونص) لعملائك الدائمين لزيادة ولائهم لمتجرك.
          </p>
          
          <div class="mt-auto grid grid-cols-2 gap-4">
            <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <p class="text-xs text-emerald-100 mb-1">متوسط العمليات</p>
              <p class="text-xl font-bold">120 ر.س</p>
            </div>
            <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <p class="text-xs text-emerald-100 mb-1">نشاط اليوم</p>
              <p class="text-xl font-bold">مرتفع 🔥</p>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
