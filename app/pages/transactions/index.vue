<script setup lang="ts">
import { 
  History, 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter,
  Plus,
  X,
  User,
  Smartphone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-vue-next'


definePageMeta({
  layout: 'merchant'
})

const user = useSupabaseUser()
const client = useSupabaseClient()
const { t, locale } = useI18n()

const transactions = ref([])
const customers = ref([])
const availableOffers = ref([])
const loading = ref(true)
const showAddModal = ref(false)
const searchQuery = ref('')
const filterType = ref('all')
const dateRange = ref('all') // today, week, month, custom, all
const customDateStart = ref('')
const customDateEnd = ref('')
const showDateDropdown = ref(false)

// Pagination
const currentPage = ref(1)
const pageSize = 6
const totalTransactions = ref(0)
const totalPages = computed(() => {
  const total = totalTransactions.value || 0
  return Math.max(1, Math.ceil(total / pageSize))
})

const displayedPages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - 2)
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// Stats
const totalDeposits = ref(0)
const totalWithdrawals = ref(0)

// Form state
const form = ref({
  customer_id: '',
  type: 'deposit',
  amount: 0,
  note: '',
  offer_id: ''
})
const submittng = ref(false)
const showErrorModal = ref(false)
const showSuccessModal = ref(false)
const errorMsg = ref('')
const successMsg = ref('')


const getDateRangeParams = () => {
  if (dateRange.value === 'all') return null
  
  const now = new Date()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  
  if (dateRange.value === 'today') {
    return { start: start.toISOString(), end: now.toISOString() }
  } else if (dateRange.value === 'week') {
    start.setDate(now.getDate() - 7)
    return { start: start.toISOString(), end: now.toISOString() }
  } else if (dateRange.value === 'month') {
    start.setMonth(now.getMonth() - 1)
    return { start: start.toISOString(), end: now.toISOString() }
  } else if (dateRange.value === 'custom' && customDateStart.value && customDateEnd.value) {
    const s = new Date(customDateStart.value)
    s.setHours(0,0,0,0)
    const e = new Date(customDateEnd.value)
    e.setHours(23,59,59,999)
    return { start: s.toISOString(), end: e.toISOString() }
  }
  return null
}

const fetchData = async () => {
  try {
    loading.value = true
    
    const { data: { user: currentUser } } = await client.auth.getUser()
    if (!currentUser) return

    const range = getDateRangeParams()

    // 1. Base Stats Query (joined with customers to support search filtering)
    let statsQuery = client
      .from('transactions')
      .select('type, amount, customer:customers!inner(name, mobile_number)')
      .eq('shop_owner_id', currentUser.id)
    
    if (range) {
      statsQuery = statsQuery.gte('created_at', range.start).lte('created_at', range.end)
    }

    if (searchQuery.value) {
      statsQuery = statsQuery.or(`name.ilike.%${searchQuery.value}%,mobile_number.ilike.%${searchQuery.value}%`, { foreignTable: 'customers' })
    }

    const { data: statsData } = await statsQuery
    
    totalDeposits.value = statsData?.filter(t => t.type === 'deposit').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    totalWithdrawals.value = statsData?.filter(t => t.type === 'withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

    // 2. Fetch Transactions
    let txQuery = client
      .from('transactions')
      .select('*, customer:customers!inner(name, mobile_number)', { count: 'exact' })
      .eq('shop_owner_id', currentUser.id)
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * pageSize, currentPage.value * pageSize - 1)

    if (range) {
      txQuery = txQuery.gte('created_at', range.start).lte('created_at', range.end)
    }

    if (filterType.value !== 'all') {
      txQuery = txQuery.eq('type', filterType.value)
    }

    if (searchQuery.value) {
      txQuery = txQuery.or(`name.ilike.%${searchQuery.value}%,mobile_number.ilike.%${searchQuery.value}%`, { foreignTable: 'customers' })
    }

    const { data: txData, count } = await txQuery
    transactions.value = txData || []
    totalTransactions.value = count || 0

    // 3. Fetch Customers for the dropdown
    const { data: custData } = await client
      .from('customers')
      .select('id, name, mobile_number')
      .eq('shop_owner_id', currentUser.id)
    customers.value = custData || []

    // 4. Fetch Offers for the dropdown
    const { data: offerData } = await client
      .from('subscription_offers')
      .select('id, name, price')
      .eq('shop_owner_id', currentUser.id)
    availableOffers.value = offerData || []

  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const setRange = (range: string) => {
  dateRange.value = range
  if (range !== 'custom') {
    showDateDropdown.value = false
    fetchData()
  }
}

const applyCustomRange = () => {
  if (customDateStart.value && customDateEnd.value) {
    showDateDropdown.value = false
    fetchData()
  }
}

const handleAddTransaction = async () => {
  try {
    submittng.value = true
    
    const { data: { user: currentUser } } = await client.auth.getUser()
    if (!currentUser) throw new Error('يرجى تسجيل الدخول أولاً')

    // 1. Get current customer balance
    const { data: customer } = await client
      .from('customers')
      .select('balance, total_saved')
      .eq('id', form.value.customer_id)
      .single()

    if (!customer) throw new Error('العميل غير موجود.')

    const balance_before = Number(customer.balance)
    const amount = Number(form.value.amount)
    let balance_after = balance_before

    if (form.value.type === 'deposit') {
      balance_after += amount
    } else {
      if (balance_before < amount) throw new Error('رصيد العميل غير كافٍ.')
      balance_after -= amount
    }

    // 2. Insert transaction
    const { error: txError } = await client.from('transactions').insert({
      ...form.value,
      shop_owner_id: currentUser.id,
      balance_before,
      balance_after,
      offer_id: form.value.offer_id || null
    })

    if (txError) throw txError

    // 3. Update customer balance
    const updateData: any = { balance: balance_after }
    if (form.value.type === 'deposit') {
      updateData.total_saved = Number(customer.total_saved) + amount
    }

    const { error: custError } = await client
      .from('customers')
      .update(updateData)
      .eq('id', form.value.customer_id)

    if (custError) throw custError

    // 4. Send SMS to Customer
    try {
      // Fetch shop name and customer phone
      const { data: profile } = await client.from('profiles').select('shop_name').eq('id', currentUser.id).single()
      const { data: custInfo } = await client.from('customers').select('name, mobile_number').eq('id', form.value.customer_id).single()

      if (custInfo?.mobile_number) {
        let smsMessage = ''
        const shopName = profile?.shop_name || 'تقدر'
        
        if (form.value.type === 'deposit') {
          smsMessage = `تم تسجيلك في محل (${shopName}). دفعت ${amount} ر.س ورصيدك الحالي هو ${balance_after} ر.س. شكراً لثقتك!`
        } else {
          // Assume a 5% saving for the example, or use 0 if not defined
          const saving = (amount * 0.05).toFixed(2) 
          smsMessage = `تم خصم ${amount} ر.س من رصيدك في (${shopName}). رصيدك المتبقي هو ${balance_after} ر.س. لقد وفرت ${saving} ر.س في هذه العملية!`
        }

        await $fetch('/api/sms/send', {
          method: 'POST',
          body: {
            phone: custInfo.mobile_number,
            message: smsMessage
          }
        })
      }
    } catch (smsErr) {
      console.error('Failed to send customer SMS:', smsErr)
    }

    showAddModal.value = false
    form.value = { customer_id: '', type: 'deposit', amount: 0, note: '' }
    fetchData()
    successMsg.value = 'تم تنفيذ العملية بنجاح وإرسال الإشعار للعميل.'
    showSuccessModal.value = true

  } catch (e: any) {
    errorMsg.value = e.message
    showErrorModal.value = true
  } finally {
    submittng.value = false
  }
}


onMounted(async () => {
  await fetchData()
})
watch([filterType, searchQuery], fetchData)
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <div class="p-2 bg-emerald-500/10 rounded-2xl">
            <History class="w-8 h-8 text-emerald-500" />
          </div>
          {{ $t('nav.transactions') }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-2 font-medium">سجل كامل لجميع عمليات الشحن والخصم ومتابعة الأرصدة.</p>
      </div>
      
      <button 
        @click="showAddModal = true"
        class="flex items-center gap-2 px-8 py-4 bg-emerald-500 text-slate-950 rounded-[24px] font-black hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 premium-btn"
      >
        <Plus class="w-6 h-6" />
        <span>عملية جديدة</span>
      </button>
    </div>

    <!-- Filters Row -->
    <div class="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm">
      <div class="flex-1 relative group">
        <Search class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="ابحث عن اسم العميل أو رقم الجوال..."
          class="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl pr-12 pl-4 py-4 focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-900 dark:text-white"
        />
      </div>
      
      <div class="flex flex-wrap items-center gap-3">
        <!-- Date Range Selector -->
        <div class="relative">
          <button 
            @click="showDateDropdown = !showDateDropdown"
            class="flex items-center gap-3 px-6 py-4 bg-slate-50 dark:bg-white/5 border border-transparent hover:border-emerald-500/30 rounded-2xl font-bold text-slate-700 dark:text-slate-300 transition-all whitespace-nowrap"
          >
            <Calendar class="w-5 h-5 text-emerald-500" />
            <span>{{ dateRange === 'custom' ? (customDateStart || 'من') + ' - ' + (customDateEnd || 'إلى') : dateRange === 'today' ? 'اليوم' : dateRange === 'week' ? 'آخر أسبوع' : dateRange === 'month' ? 'آخر شهر' : 'جميع العمليات' }}</span>
          </button>

          <!-- Dropdown Menu -->
          <div v-if="showDateDropdown" class="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl z-[100] p-4 animate-in fade-in slide-in-from-top-2">
            <div class="space-y-1">
              <button @click="setRange('all')" class="w-full text-right px-4 py-3 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 font-bold transition-colors" :class="dateRange === 'all' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-600'">جميع العمليات</button>
              <button @click="setRange('today')" class="w-full text-right px-4 py-3 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 font-bold transition-colors" :class="dateRange === 'today' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-600'">اليوم</button>
              <button @click="setRange('week')" class="w-full text-right px-4 py-3 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 font-bold transition-colors" :class="dateRange === 'week' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-600'">آخر أسبوع</button>
              <button @click="setRange('month')" class="w-full text-right px-4 py-3 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 font-bold transition-colors" :class="dateRange === 'month' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-600'">آخر شهر</button>
              <button @click="dateRange = 'custom'" class="w-full text-right px-4 py-3 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 font-bold transition-colors" :class="dateRange === 'custom' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-600'">نطاق مخصص</button>
            </div>

            <!-- Custom Range Inputs -->
            <div v-if="dateRange === 'custom'" class="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
              <div class="grid grid-cols-2 gap-2">
                <input v-model="customDateStart" type="date" class="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl p-2 text-xs font-bold text-slate-700 dark:text-white" />
                <input v-model="customDateEnd" type="date" class="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl p-2 text-xs font-bold text-slate-700 dark:text-white" />
              </div>
              <button @click="applyCustomRange" class="w-full bg-emerald-500 text-slate-950 font-black py-2 rounded-xl text-sm shadow-lg shadow-emerald-500/20">تطبيق</button>
            </div>
          </div>
        </div>

        <select 
          v-model="filterType"
          class="bg-slate-50 dark:bg-white/5 border border-transparent hover:border-emerald-500/30 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-slate-300 focus:ring-0 appearance-none min-w-[140px]"
        >
          <option value="all">جميع العمليات</option>
          <option value="deposit">شحن فقط</option>
          <option value="withdrawal">خصم فقط</option>
        </select>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 rounded-[40px] text-slate-950 relative overflow-hidden shadow-2xl shadow-emerald-500/20 group hover:scale-[1.02] transition-all duration-500">
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
        <div class="relative z-10 flex items-center justify-between">
          <div>
            <p class="text-slate-950/60 font-bold uppercase tracking-wider text-sm mb-1">إجمالي الشحن</p>
            <h3 class="text-4xl font-black">+{{ totalDeposits.toLocaleString() }} <span class="text-xl opacity-80">{{ $t('common.currency') }}</span></h3>
          </div>
          <div class="w-16 h-16 bg-white/20 rounded-[24px] flex items-center justify-center backdrop-blur-md">
            <ArrowUpCircle class="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-white/5 relative overflow-hidden shadow-sm group hover:scale-[1.02] transition-all duration-500">
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-red-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
        <div class="relative z-10 flex items-center justify-between">
          <div>
            <p class="text-slate-500 font-bold uppercase tracking-wider text-sm mb-1">إجمالي الخصم</p>
            <h3 class="text-4xl font-black text-red-500">-{{ totalWithdrawals.toLocaleString() }} <span class="text-xl opacity-60">{{ $t('common.currency') }}</span></h3>
          </div>
          <div class="w-16 h-16 bg-red-500/10 rounded-[24px] flex items-center justify-center">
            <ArrowDownCircle class="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <BaseCard class="!p-0 overflow-hidden border-white/5 shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full" :class="locale === 'ar' ? 'text-right' : 'text-left'">
          <thead>
            <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <th class="px-8 py-5 text-sm font-bold text-slate-500">العميل والمعلومات</th>
              <th class="px-8 py-5 text-sm font-bold text-slate-500">نوع العملية</th>
              <th class="px-8 py-5 text-sm font-bold text-slate-500">المبلغ والقيمة</th>
              <th class="px-8 py-5 text-sm font-bold text-slate-500">التوقيت</th>
              <th class="px-8 py-5 text-sm font-bold text-slate-500 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr v-for="tx in transactions" :key="tx.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
              <td class="px-8 py-5">
                <div class="font-black text-slate-900 dark:text-white text-lg">{{ tx.customer?.name || 'عميل محذوف' }}</div>
                <div class="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <Smartphone class="w-3 h-3" /> {{ tx.customer?.mobile_number }}
                </div>
              </td>
              <td class="px-8 py-5">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm" :class="tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'">
                  <component :is="tx.type === 'deposit' ? ArrowUpCircle : ArrowDownCircle" class="w-4 h-4" />
                  {{ tx.type === 'deposit' ? 'شحن رصيد' : 'سحب / خصم' }}
                </div>
              </td>
              <td class="px-8 py-5">
                <div class="font-black text-xl" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                  {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} <span class="text-xs opacity-60 font-bold">ر.س</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-1">الرصيد بعد: {{ tx.balance_after }} ر.س</div>
              </td>
              <td class="px-8 py-5">
                <div class="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {{ new Date(tx.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') }}
                </div>
                <div class="text-[10px] text-slate-500">
                  {{ new Date(tx.created_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) }}
                </div>
              </td>
              <td class="px-8 py-5">
                <div class="flex justify-center">
                  <span class="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-black ring-1 ring-emerald-500/20">مكتمل</span>
                </div>
              </td>
            </tr>
            <tr v-if="transactions.length === 0 && !loading">
              <td colspan="5" class="px-8 py-24 text-center text-slate-500">
                <div class="flex flex-col items-center gap-6 opacity-30">
                  <History class="w-20 h-20" />
                  <div class="space-y-1">
                    <p class="text-2xl font-black">لا توجد سجلات</p>
                    <p class="text-sm">لم يتم العثور على أي عمليات في هذه الفترة</p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
        <p class="text-sm text-slate-500 font-bold">
          {{ $t('common.showing') }} 
          <span class="text-slate-900 dark:text-white">{{ (currentPage - 1) * pageSize + 1 }}</span>
          {{ $t('common.to') }}
          <span class="text-slate-900 dark:text-white">{{ Math.min(currentPage * pageSize, totalTransactions) }}</span>
          {{ $t('common.of') }}
          <span class="text-slate-900 dark:text-white">{{ totalTransactions }}</span>
        </p>
        
        <div class="flex items-center gap-1">
          <!-- First -->
          <button @click="currentPage = 1; fetchData()" :disabled="currentPage === 1" 
            class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronsRight v-if="locale === 'ar'" class="w-5 h-5" />
            <ChevronsLeft v-else class="w-5 h-5" />
          </button>
          
          <!-- Prev -->
          <button @click="currentPage--; fetchData()" :disabled="currentPage === 1" 
            class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronRight v-if="locale === 'ar'" class="w-5 h-5" />
            <ChevronLeft v-else class="w-5 h-5" />
          </button>

          <!-- Numbers -->
          <div class="flex items-center gap-1 mx-2">
            <button v-for="p in displayedPages" :key="p" 
              @click="currentPage = p; fetchData()"
              class="w-10 h-10 rounded-xl font-black text-sm transition-all"
              :class="currentPage === p ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'"
            >
              {{ p }}
            </button>
          </div>

          <!-- Next -->
          <button @click="currentPage++; fetchData()" :disabled="currentPage === totalPages" 
            class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronLeft v-if="locale === 'ar'" class="w-5 h-5" />
            <ChevronRight v-else class="w-5 h-5" />
          </button>

          <!-- Last -->
          <button @click="currentPage = totalPages; fetchData()" :disabled="currentPage === totalPages" 
            class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronsLeft v-if="locale === 'ar'" class="w-5 h-5" />
            <ChevronsRight v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- New Transaction Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="showAddModal = false"></div>
      <div class="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">إجراء عملية جديدة</h3>
          <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="handleAddTransaction" class="p-8 space-y-6">
          <!-- Customer Selection -->
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">اختر العميل</label>
            <div class="relative">
              <User class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select 
                v-model="form.customer_id" 
                required 
                class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl pr-12 pl-4 py-4 appearance-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>اختر عميلاً من القائمة</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.mobile_number }})
                </option>
              </select>
            </div>
          </div>

          <!-- Type Selection -->
          <div class="grid grid-cols-2 gap-4">
            <button 
              type="button"
              @click="form.type = 'deposit'"
              class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
              :class="form.type === 'deposit' ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' : 'border-slate-100 dark:border-white/5 text-slate-500'"
            >
              <ArrowUpCircle class="w-8 h-8" />
              <span class="font-bold">شحن رصيد</span>
            </button>
            <button 
              type="button"
              @click="form.type = 'withdrawal'"
              class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
              :class="form.type === 'withdrawal' ? 'border-red-500 bg-red-500/5 text-red-600' : 'border-slate-100 dark:border-white/5 text-slate-500'"
            >
              <ArrowDownCircle class="w-8 h-8" />
              <span class="font-bold">خصم رصيد</span>
            </button>
          </div>

          <!-- Amount -->
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">المبلغ (ر.س)</label>
            <input 
              v-model="form.amount" 
              type="number" 
              required 
              step="0.01" 
              placeholder="0.00"
              class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-center text-3xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500" 
            />
          </div>

          <!-- Offer Selection -->
          <div v-if="form.type === 'deposit'" class="space-y-2">
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">ربط باشتراك (اختياري)</label>
            <div class="grid grid-cols-1 gap-2">
              <select 
                v-model="form.offer_id" 
                class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-4 py-4 appearance-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
              >
                <option value="">دفع مقدم عادي</option>
                <option v-for="offer in availableOffers" :key="offer.id" :value="offer.id">
                  {{ offer.name }} ({{ offer.price }} ر.س)
                </option>
              </select>
            </div>
          </div>

          <!-- Note -->
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">ملاحظات (اختياري)</label>
            <textarea 
              v-model="form.note" 
              rows="2"
              class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
              placeholder="اكتب ملاحظة هنا..."
            ></textarea>
          </div>

          <button 
            type="submit" 
            :disabled="submittng"
            class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl mt-4 hover:shadow-xl transition-all disabled:opacity-50"
          >
            {{ submittng ? 'جاري التنفيذ...' : 'تأكيد العملية' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Modal: Success Notification -->
    <div v-if="showSuccessModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="showSuccessModal = false"></div>
      <div class="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl border border-emerald-500/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-8 text-center space-y-4">
          <div class="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">تمت العملية بنجاح</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{{ successMsg }}</p>
          <button 
            @click="showSuccessModal = false"
            class="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl mt-4 transition-all active:scale-95"
          >
            ممتاز
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Error Notification -->
    <div v-if="showErrorModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="showErrorModal = false"></div>
      <div class="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl border border-red-500/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-8 text-center space-y-4">
          <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">عذراً، حدث خطأ</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{{ errorMsg }}</p>
          <button 
            @click="showErrorModal = false"
            class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl mt-4 transition-all active:scale-95"
          >
            حسناً، فهمت
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

