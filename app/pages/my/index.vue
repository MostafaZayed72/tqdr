<script setup lang="ts">
import { 
  Wallet, 
  TrendingUp, 
  History, 
  LogOut, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Star,
  ShoppingBag,
  Smartphone,
  Calendar,
  CreditCard
} from 'lucide-vue-next'

definePageMeta({
  layout: false
})

const client = useSupabaseClient()
const customerId = useCookie('customer_id')

if (!customerId.value) {
  navigateTo('/my/login')
}

const customer = ref(null)
const shop = ref(null)
const transactions = ref([])
const subscriptions = ref([])
const loading = ref(true)

const fetchData = async () => {
  try {
    loading.value = true
    
    // 1. Fetch Customer Data
    const { data: custData, error: custError } = await client
      .from('customers')
      .select('*')
      .eq('id', customerId.value)
      .single()
    
    if (custError || !custData) throw new Error('Customer not found')
    customer.value = custData

    // 2. Fetch Shop Profile
    const { data: shopData } = await client
      .from('profiles')
      .select('*')
      .eq('id', custData.shop_owner_id)
      .single()
    shop.value = shopData

    // 3. Fetch Transactions
    const { data: txData } = await client
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId.value)
      .order('created_at', { ascending: false })
      .limit(10)
    transactions.value = txData || []

    // 4. Fetch Subscriptions
    const { data: subData } = await client
      .from('customer_subscriptions')
      .select('*, offer:subscription_offers(*)')
      .eq('customer_id', customerId.value)
      .gte('expires_at', new Date().toISOString())
    subscriptions.value = subData || []

  } catch (e) {
    console.error(e)
    customerId.value = null
    navigateTo('/my/login')
  } finally {
    loading.value = false
  }
}

const handleLogout = () => {
  customerId.value = null
  navigateTo('/my/login')
}

onMounted(fetchData)
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Tajawal'] text-slate-900 dark:text-white pb-20">
    <div v-if="loading" class="space-y-8 pb-20">
      <!-- Skeleton Header -->
      <div class="bg-slate-900 px-6 pt-16 pb-12 rounded-b-[60px] space-y-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-5">
            <Skeleton roundedClass="rounded-2xl w-16 h-16" />
            <div class="space-y-2">
              <Skeleton roundedClass="rounded w-24 h-4" />
              <Skeleton roundedClass="rounded w-48 h-8" />
            </div>
          </div>
          <Skeleton roundedClass="rounded-2xl w-12 h-12" />
        </div>
        <Skeleton roundedClass="rounded-[40px] w-full h-48" />
      </div>
      
      <!-- Skeleton Content -->
      <div class="px-6 space-y-8">
        <Skeleton roundedClass="rounded-[40px] w-full h-32" />
        <Skeleton roundedClass="rounded-[32px] w-full h-20" />
        <div class="space-y-4">
          <Skeleton roundedClass="rounded w-32 h-6" />
          <div class="space-y-4">
            <Skeleton v-for="i in 3" :key="i" roundedClass="rounded-[35px] w-full h-24" />
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Header / Profile Section -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 px-6 pt-16 pb-12 rounded-b-[60px] shadow-2xl relative overflow-hidden">
        <!-- Decorative background elements -->
        <div class="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute top-1/2 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
        
        <div class="relative z-10 flex items-center justify-between mb-10">
          <div class="flex items-center gap-5">
            <div class="relative">
              <div class="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <Star class="w-8 h-8 fill-white/20" />
              </div>
              <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-950 border-2 border-slate-900 shadow-lg">
                <Sparkles class="w-3 h-3" />
              </div>
            </div>
            <div>
              <p class="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">{{ $t('dashboard.customer_stats.welcome_back') }}</p>
              <h1 class="text-3xl font-black text-white leading-tight">{{ customer?.name }}</h1>
            </div>
          </div>
          <button @click="handleLogout" class="w-12 h-12 bg-white/5 hover:bg-red-500/10 border border-white/10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all duration-300 backdrop-blur-md">
            <LogOut class="w-6 h-6" />
          </button>
        </div>

        <!-- Featured Savings Card (Prominent) -->
        <div class="bg-white/10 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp class="w-32 h-32 text-white -mr-8 -mt-8 rotate-12" />
          </div>
          
          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <TrendingUp class="w-4 h-4 text-slate-950" />
              </div>
              <p class="text-sm font-bold text-emerald-400">{{ $t('dashboard.customer_stats.total_saved') }}</p>
            </div>
            <div class="flex items-baseline gap-2">
              <h2 class="text-6xl font-black text-white tracking-tighter">{{ customer?.total_saved || 0 }}</h2>
              <span class="text-2xl font-bold text-white/50">{{ $t('common.currency') }}</span>
            </div>
            <p class="text-xs text-white/40 mt-4 font-medium">{{ $t('dashboard.customer_stats.savings_desc') }}</p>
          </div>
        </div>
      </div>

      <div class="px-6 -mt-8 space-y-8">
        <!-- Main Stats Grid -->
        <div class="grid grid-cols-1 gap-6">
          <div class="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:scale-[1.02] transition-all duration-500">
            <div>
              <div class="flex items-center gap-2 mb-2 text-slate-400">
                <Wallet class="w-4 h-4" />
                <p class="text-xs font-black uppercase tracking-widest">{{ $t('dashboard.customer_stats.current_balance') }}</p>
              </div>
              <div class="flex items-baseline gap-2">
                <h3 class="text-5xl font-black text-emerald-500 tracking-tighter">{{ customer?.balance }}</h3>
                <span class="text-xl font-bold text-slate-300">{{ $t('common.currency') }}</span>
              </div>
            </div>
            <div class="w-20 h-20 bg-emerald-500/10 rounded-[32px] flex items-center justify-center text-emerald-500 group-hover:rotate-12 transition-transform duration-500">
              <Wallet class="w-10 h-10" />
            </div>
          </div>
        </div>

        <!-- Shop Info Section -->
        <div class="bg-slate-100 dark:bg-white/5 p-6 rounded-[32px] flex items-center justify-between border border-transparent hover:border-emerald-500/20 transition-all">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
              <ShoppingBag class="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ $t('dashboard.customer_stats.current_shop') }}</p>
              <h4 class="text-lg font-black text-slate-900 dark:text-white">{{ shop?.shop_name || 'Tqdr Plus' }}</h4>
            </div>
          </div>
          <div class="text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full text-[10px] font-black">{{ $t('dashboard.customer_stats.premium_customer') }}</div>
        </div>

        <!-- Active Subscriptions -->
        <div v-if="subscriptions.length > 0" class="space-y-4">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <CreditCard class="w-6 h-6 text-amber-500" /> {{ $t('dashboard.customer_stats.active_subscriptions') }}
            </h3>
            <span class="text-xs font-bold text-slate-400">{{ $t('dashboard.customer_stats.subscription_count', { count: subscriptions.length }) }}</span>
          </div>
          
          <div class="grid grid-cols-1 gap-4">
            <div v-for="sub in subscriptions" :key="sub.id" class="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-100 dark:border-white/5 shadow-lg shadow-slate-200/20 dark:shadow-none group relative overflow-hidden">
              <div class="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
              <div class="flex justify-between items-start mb-6">
                <div>
                  <h4 class="text-xl font-black text-slate-900 dark:text-white mb-1">{{ sub.offer?.name }}</h4>
                  <div class="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Calendar class="w-3.5 h-3.5 text-amber-500" />
                    <span>{{ $t('transactions.date') }}: {{ new Date(sub.expires_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') }}</span>
                  </div>
                </div>
                <div class="px-4 py-2 bg-amber-500/10 text-amber-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">{{ $t('dashboard.customer_stats.premium') }}</div>
              </div>
              <div class="w-full bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-400">{{ $t('dashboard.customer_stats.subscription_status') }}</span>
                <span class="text-xs font-black text-emerald-500 flex items-center gap-1">
                  <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div> {{ $t('dashboard.customer_stats.active_now') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Transactions History -->
        <div class="space-y-4">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <History class="w-6 h-6 text-slate-400" /> {{ $t('dashboard.customer_stats.recent_transactions') }}
            </h3>
            <button class="text-xs font-bold text-emerald-500">{{ $t('dashboard.customer_stats.view_all') }}</button>
          </div>
          
          <div class="space-y-4">
            <div v-if="transactions.length === 0" class="bg-white dark:bg-slate-900 p-12 rounded-[40px] text-center border border-dashed border-slate-200 dark:border-white/10">
              <p class="text-slate-400 font-bold italic">{{ $t('dashboard.customer_stats.no_transactions') }}</p>
            </div>
            
            <div 
              v-for="tx in transactions" 
              :key="tx.id"
              class="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-100 dark:border-white/5 flex items-center justify-between hover:translate-x-[-4px] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none"
            >
              <div class="flex items-center gap-5">
                <div :class="tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'" class="w-14 h-14 rounded-[22px] flex items-center justify-center shadow-inner">
                  <component :is="tx.type === 'deposit' ? ArrowUpCircle : ArrowDownCircle" class="w-7 h-7" />
                </div>
                <div>
                  <p class="font-black text-slate-900 dark:text-white">{{ tx.type === 'deposit' ? $t('dashboard.customer_stats.deposit') : $t('dashboard.customer_stats.withdraw') }}</p>
                  <p class="text-xs font-bold text-slate-400 mt-0.5">{{ new Date(tx.created_at).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xl font-black tracking-tighter" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                  {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} <span class="text-xs opacity-50">{{ $t('common.currency') }}</span>
                </p>
                <div class="flex items-center gap-1 justify-end mt-1">
                  <div class="w-1 h-1 rounded-full bg-slate-300"></div>
                  <p class="text-[10px] font-bold text-slate-400">{{ $t('dashboard.customer_stats.balance_after', { balance: tx.balance_after }) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <div class="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
        <div class="max-w-md mx-auto bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-2xl p-3 rounded-[35px] border border-white/10 flex items-center justify-around shadow-2xl pointer-events-auto">
          <button class="flex flex-col items-center gap-1.5 text-emerald-500 p-2 min-w-[70px] relative">
            <div class="absolute -top-1 w-1 h-1 bg-emerald-500 rounded-full"></div>
            <Star class="w-6 h-6 fill-emerald-500/20" />
            <span class="text-[9px] font-black uppercase tracking-widest">{{ $t('dashboard.customer_stats.home') }}</span>
          </button>
          <button class="flex flex-col items-center gap-1.5 text-slate-400 p-2 min-w-[70px] hover:text-white transition-colors">
            <History class="w-6 h-6" />
            <span class="text-[9px] font-black uppercase tracking-widest">{{ $t('dashboard.customer_stats.transactions') }}</span>
          </button>
          <button class="flex flex-col items-center gap-1.5 text-slate-400 p-2 min-w-[70px] hover:text-white transition-colors">
            <CreditCard class="w-6 h-6" />
            <span class="text-[9px] font-black uppercase tracking-widest">{{ $t('dashboard.customer_stats.offers') }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.animate-in {
  animation: fadeIn 0.6s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
