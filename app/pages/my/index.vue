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
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <template v-else>
      <!-- Header / Profile Section -->
      <div class="bg-white dark:bg-slate-900 px-6 pt-12 pb-8 rounded-b-[50px] shadow-sm border-b border-slate-100 dark:border-white/5 relative overflow-hidden">
        <div class="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
        
        <div class="relative z-10 flex items-center justify-between mb-8">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Star class="w-7 h-7 fill-white/20" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">مرحباً بك</p>
              <h1 class="text-2xl font-black">{{ customer?.name }}</h1>
            </div>
          </div>
          <button @click="handleLogout" class="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-red-500 transition-colors">
            <LogOut class="w-6 h-6" />
          </button>
        </div>

        <!-- Shop Info Card -->
        <div class="bg-slate-900 dark:bg-emerald-500/10 p-6 rounded-[32px] border border-white/10 flex items-center justify-between group">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-white/10 rounded-xl">
              <ShoppingBag class="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">أنت عميل في متجر</p>
              <p class="text-lg font-black text-white dark:text-emerald-500">{{ shop?.shop_name || 'تقدر بلس' }}</p>
            </div>
          </div>
          <div class="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
             <Smartphone class="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      <div class="px-6 -mt-6 space-y-6">
        <!-- Stats Row -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5">
            <div class="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-4">
              <Wallet class="w-5 h-5" />
            </div>
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">رصيدك الحالي</p>
            <h3 class="text-2xl font-black text-emerald-500">{{ customer?.balance }} <span class="text-xs opacity-60">ر.س</span></h3>
          </div>
          <div class="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5">
            <div class="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-4">
              <TrendingUp class="w-5 h-5" />
            </div>
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">إجمالي توفيرك</p>
            <h3 class="text-2xl font-black text-blue-500">{{ customer?.total_saved || 0 }} <span class="text-xs opacity-60">ر.س</span></h3>
          </div>
        </div>

        <!-- Active Subscriptions -->
        <div v-if="subscriptions.length > 0" class="space-y-4">
          <h3 class="text-lg font-black flex items-center gap-2 px-2">
            <CreditCard class="w-5 h-5 text-amber-500" /> اشتراكاتك النشطة
          </h3>
          <div class="space-y-3">
            <div v-for="sub in subscriptions" :key="sub.id" class="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-[32px] text-slate-950 shadow-lg shadow-amber-500/20 relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
              <div class="relative z-10">
                <div class="flex justify-between items-start mb-4">
                  <h4 class="text-xl font-black">{{ sub.offer?.name }}</h4>
                  <span class="px-3 py-1 bg-white/30 rounded-full text-[10px] font-bold">نشط</span>
                </div>
                <div class="flex items-center gap-4 text-xs font-bold opacity-80">
                  <div class="flex items-center gap-1">
                    <Calendar class="w-3 h-3" />
                    ينتهي في: {{ new Date(sub.expires_at).toLocaleDateString('ar-EG') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Transactions History -->
        <div class="space-y-4">
          <h3 class="text-lg font-black flex items-center gap-2 px-2">
            <History class="w-5 h-5 text-slate-400" /> آخر المعاملات
          </h3>
          <div class="space-y-3">
            <div v-if="transactions.length === 0" class="text-center py-10 opacity-40 italic">لا توجد عمليات سابقة حتى الآن.</div>
            <div 
              v-for="tx in transactions" 
              :key="tx.id"
              class="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-white/5 flex items-center justify-between hover:scale-[1.01] transition-transform"
            >
              <div class="flex items-center gap-4">
                <div :class="tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'" class="w-12 h-12 rounded-2xl flex items-center justify-center">
                  <component :is="tx.type === 'deposit' ? ArrowUpCircle : ArrowDownCircle" class="w-6 h-6" />
                </div>
                <div>
                  <p class="font-bold text-sm">{{ tx.type === 'deposit' ? 'شحن رصيد' : 'خصم من الرصيد' }}</p>
                  <p class="text-[10px] text-slate-400">{{ new Date(tx.created_at).toLocaleString('ar-EG', { day: 'numeric', month: 'short' }) }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-black text-lg" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                  {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} ر.س
                </p>
                <p class="text-[10px] text-slate-400">رصيدك: {{ tx.balance_after }} ر.س</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Nav (Optional Placeholder) -->
      <div class="fixed bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-xl p-4 rounded-[32px] border border-white/10 flex items-center justify-around shadow-2xl z-50">
        <div class="flex flex-col items-center gap-1 text-emerald-500">
          <Star class="w-6 h-6" />
          <span class="text-[10px] font-bold">الرئيسية</span>
        </div>
        <div class="flex flex-col items-center gap-1 text-slate-400">
          <History class="w-6 h-6" />
          <span class="text-[10px] font-bold">المعاملات</span>
        </div>
        <div class="flex flex-col items-center gap-1 text-slate-400">
          <CreditCard class="w-6 h-6" />
          <span class="text-[10px] font-bold">العروض</span>
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
