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
  Calendar
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant'
})

const user = useSupabaseUser()
const client = useSupabaseClient()
const { t, locale } = useI18n()

const transactions = ref([])
const customers = ref([])
const loading = ref(true)
const showAddModal = ref(false)
const searchQuery = ref('')
const filterType = ref('all')

// Pagination
const currentPage = ref(1)
const pageSize = 10
const totalTransactions = ref(0)
const totalPages = computed(() => {
  const total = totalTransactions.value || 0
  return Math.max(1, Math.ceil(total / pageSize))
})

// Stats
const totalDeposits = ref(0)
const totalWithdrawals = ref(0)

// Form state
const form = ref({
  customer_id: '',
  type: 'deposit',
  amount: 0,
  note: ''
})
const submittng = ref(false)

const fetchData = async () => {
  try {
    loading.value = true
    
    const { data: { user: currentUser } } = await client.auth.getUser()
    if (!currentUser) return

    // 1. Fetch Stats (Total sums)
    const { data: statsData } = await client
      .from('transactions')
      .select('type, amount')
      .eq('shop_owner_id', currentUser.id)
    
    totalDeposits.value = statsData?.filter(t => t.type === 'deposit').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    totalWithdrawals.value = statsData?.filter(t => t.type === 'withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

    // 2. Fetch Transactions with Pagination
    let txQuery = client
      .from('transactions')
      .select('*, customer:customers(name, mobile_number)', { count: 'exact' })
      .eq('shop_owner_id', currentUser.id)
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * pageSize, currentPage.value * pageSize - 1)

    if (filterType.value !== 'all') {
      txQuery = txQuery.eq('type', filterType.value)
    }

    if (searchQuery.value) {
      // Searching by customer name or mobile within transactions
      txQuery = txQuery.or(`customer.name.ilike.%${searchQuery.value}%,customer.mobile_number.ilike.%${searchQuery.value}%`)
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

  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
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
      balance_after
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

    showAddModal.value = false
    form.value = { customer_id: '', type: 'deposit', amount: 0, note: '' }
    fetchData()
    alert('تم تنفيذ العملية بنجاح.')

  } catch (e: any) {
    alert(e.message)
  } finally {
    submittng.value = false
  }
}

onMounted(async () => {
  await fetchData()
})
watch([filterType], fetchData)
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">سجل العمليات</h1>
        <p class="text-slate-500 mt-1">تتبع كافة عمليات الشحن والخصم التي تمت في محلك.</p>
      </div>
      
      <button 
        @click="showAddModal = true"
        class="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
      >
        <Plus class="w-5 h-5" />
        <span>عملية جديدة</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="md:col-span-2 relative">
        <Search class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="ابحث عن عملية..."
          class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl pr-12 pl-4 py-3.5 focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-900 dark:text-white shadow-sm"
        />
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">{{ $t('nav.transactions') }}</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">سجل كامل لجميع عمليات الشحن والخصم.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button class="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <Calendar class="w-5 h-5 text-slate-400" />
          <span>تاريخ اليوم</span>
        </button>
        <button class="p-3 bg-emerald-500 text-slate-950 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
          <Filter class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <BaseCard class="flex items-center gap-6">
        <div class="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
          <ArrowUpCircle class="w-8 h-8" />
        </div>
        <div>
          <p class="text-slate-500 dark:text-slate-400 font-medium">إجمالي الشحن</p>
          <h3 class="text-2xl font-black text-emerald-500">+{{ totalDeposits.toLocaleString() }} {{ $t('common.currency') }}</h3>
        </div>
      </BaseCard>

      <BaseCard class="flex items-center gap-6">
        <div class="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
          <ArrowDownCircle class="w-8 h-8" />
        </div>
        <div>
          <p class="text-slate-500 dark:text-slate-400 font-medium">إجمالي الخصم</p>
          <h3 class="text-2xl font-black text-red-500">-{{ totalWithdrawals.toLocaleString() }} {{ $t('common.currency') }}</h3>
        </div>
      </BaseCard>
    </div>

    <!-- Transactions List -->
    <BaseCard class="!p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full" :class="locale === 'ar' ? 'text-right' : 'text-left'">
          <thead>
            <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <th class="px-6 py-4 text-sm font-bold text-slate-500">{{ $t('customers.table.name') }}</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">النوع</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">المبلغ</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">التاريخ</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">الحالة</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr v-for="tx in transactions" :key="tx.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td class="px-6 py-4">
                <div class="font-bold text-slate-900 dark:text-white">{{ tx.customer?.name || 'عميل محذوف' }}</div>
                <div class="text-xs text-slate-500">{{ tx.customer?.mobile_number }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <component 
                    :is="tx.type === 'deposit' ? ArrowUpCircle : ArrowDownCircle" 
                    :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'"
                    class="w-4 h-4"
                  />
                  <span class="font-medium text-slate-700 dark:text-slate-300">
                    {{ tx.type === 'deposit' ? 'إيداع' : 'سحب' }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 font-black" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
                {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} {{ $t('common.currency') }}
              </td>
              <td class="px-6 py-4 text-sm text-slate-500">
                {{ new Date(tx.created_at).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US') }}
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold">مكتمل</span>
              </td>
            </tr>
            <tr v-if="transactions.length === 0 && !loading">
              <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                <History class="w-16 h-16 mx-auto mb-4 opacity-10" />
                {{ $t('common.no_data') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <p class="text-sm text-slate-500 font-medium">
          عرض 
          <span class="font-bold text-slate-900 dark:text-white">{{ (currentPage - 1) * pageSize + 1 }}</span>
          -
          <span class="font-bold text-slate-900 dark:text-white">{{ Math.min(currentPage * pageSize, totalTransactions) }}</span>
          من
          <span class="font-bold text-slate-900 dark:text-white">{{ totalTransactions }}</span>
        </p>
        
        <div class="flex items-center gap-2">
          <button 
            @click="currentPage--; fetchData()"
            :disabled="currentPage === 1"
            class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ locale === 'ar' ? '→' : '←' }}
          </button>
          <button 
            @click="currentPage++; fetchData()"
            :disabled="currentPage === totalPages"
            class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ locale === 'ar' ? '←' : '→' }}
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
  </div>
</template>
