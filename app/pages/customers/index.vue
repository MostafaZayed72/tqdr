<script setup lang="ts">
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  History,
  X,
  Phone,
  PlusCircle,
  MinusCircle,
  TrendingUp,
  Wallet
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth'
})

const { t, locale } = useI18n()
const user = useSupabaseUser()
const client = useSupabaseClient()

const customers = ref([])
const profile = ref(null)
const loading = ref(true)
const searchQuery = ref('')
const showAddModal = ref(false)
const showHistoryModal = ref(false)
const selectedCustomer = ref(null)
const customerHistory = ref([])

// Form state
const form = ref({
  name: '',
  mobile_number: '',
  paid_amount: 0,
  added_balance: 0
})

const txForm = ref({
  type: 'deposit',
  amount: 0,
  paid_amount: 0,
  saved_amount: 0,
  note: ''
})

const showTxModal = ref(false)

const fetchCustomers = async () => {
  try {
    loading.value = true
    let query = client
      .from('customers')
      .select('*')
      .eq('shop_owner_id', user.value.id)
      .order('created_at', { ascending: false })

    if (searchQuery.value) {
      query = query.ilike('mobile_number', `%${searchQuery.value}%`)
    }

    const { data } = await query
    customers.value = data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleAddCustomer = async () => {
  try {
    loading.value = true
    
    // 1. Create Customer
    const { data: customer, error: custError } = await client.from('customers').insert({
      name: form.name,
      mobile_number: form.mobile_number,
      balance: form.added_balance,
      shop_owner_id: user.value.id
    }).select().single()

    if (custError) throw custError

    // 2. Create Initial Transaction (if balance > 0)
    if (form.added_balance > 0) {
      await client.from('transactions').insert({
        customer_id: customer.id,
        shop_owner_id: user.value.id,
        type: 'deposit',
        amount: form.added_balance,
        paid_amount: form.paid_amount,
        balance_before: 0,
        balance_after: form.added_balance,
        note: t('nav.dashboard') + ': ' + t('customers.add_new')
      })
      
      // Simulate SMS
      const shopName = profile.value?.shop_name || 'تقدر Plus'
      console.log(`SMS to ${form.mobile_number}: تم تسجيلك في محل (${shopName}). دفعت ${form.paid_amount} ورصيدك أصبح ${form.added_balance}`)
    }

    showAddModal.value = false
    form.value = { name: '', mobile_number: '', paid_amount: 0, added_balance: 0 }
    fetchCustomers()
  } catch (e: any) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const handleQuickTx = async () => {
  try {
    loading.value = true
    const customer = selectedCustomer.value
    const balanceBefore = Number(customer.balance)
    let balanceAfter = balanceBefore

    if (txForm.value.type === 'deposit') {
      balanceAfter += Number(txForm.value.amount)
    } else {
      balanceAfter -= Number(txForm.value.amount)
    }

    if (balanceAfter < 0) throw new Error('رصيد العميل غير كافٍ')

    // 1. Update Customer Balance
    const totalSavedUpdate = txForm.value.type === 'withdrawal' 
      ? Number(customer.total_saved) + Number(txForm.value.saved_amount)
      : Number(customer.total_saved)

    const { error: custError } = await client.from('customers').update({
      balance: balanceAfter,
      total_saved: totalSavedUpdate
    }).eq('id', customer.id)

    if (custError) throw custError

    // 2. Create Transaction
    await client.from('transactions').insert({
      customer_id: customer.id,
      shop_owner_id: user.value.id,
      type: txForm.value.type,
      amount: txForm.value.amount,
      paid_amount: txForm.value.paid_amount,
      saved_amount: txForm.value.saved_amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      note: txForm.value.note
    })

    // Simulate SMS
    const shopName = profile.value?.shop_name || 'تقدر Plus'
    if (txForm.value.type === 'deposit') {
      console.log(`SMS to ${customer.mobile_number}: من محل (${shopName}) تم شحن رصيدك بـ ${txForm.value.amount}. رصيدك الحالي: ${balanceAfter}`)
    } else {
      console.log(`SMS to ${customer.mobile_number}: من محل (${shopName}) تم خصم ${txForm.value.amount}. رصيدك أصبح ${balanceAfter}. وفرت ${txForm.value.saved_amount} ر.س`)
    }

    showTxModal.value = false
    txForm.value = { type: 'deposit', amount: 0, paid_amount: 0, saved_amount: 0, note: '' }
    fetchCustomers()
  } catch (e: any) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const openTxModal = (customer: any, type: 'deposit' | 'withdrawal') => {
  selectedCustomer.value = customer
  txForm.value.type = type
  showTxModal.value = true
}

const viewHistory = async (customer: any) => {
  selectedCustomer.value = customer
  showHistoryModal.value = true
  const { data } = await client
    .from('transactions')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
  customerHistory.value = data || []
}

onMounted(async () => {
  await fetchCustomers()
  if (!user.value?.id || String(user.value.id) === 'undefined') return
  const { data } = await client.from('profiles').select('shop_name').eq('id', user.value.id).single()
  profile.value = data
})
watch(searchQuery, fetchCustomers)
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">{{ $t('customers.title') }}</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">{{ $t('customers.subtitle') }}</p>
      </div>
      
      <button 
        @click="showAddModal = true"
        class="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 premium-btn"
      >
        <Plus class="w-5 h-5" />
        <span>{{ $t('customers.add_new') }}</span>
      </button>
    </div>

    <!-- Filters & Search -->
    <BaseCard>
      <div class="relative">
        <Search :class="locale === 'ar' ? 'right-4' : 'left-4'" class="absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          v-model="searchQuery"
          type="text" 
          :placeholder="$t('customers.search_placeholder')"
          :class="locale === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'"
          class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-900 dark:text-white"
        />
      </div>
    </BaseCard>

    <!-- Customers Table -->
    <BaseCard class="!p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full" :class="locale === 'ar' ? 'text-right' : 'text-left'">
          <thead>
            <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <th class="px-6 py-4 text-sm font-bold text-slate-500">{{ $t('customers.table.name') }}</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">{{ $t('customers.table.phone') }}</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">{{ $t('customers.table.balance') }}</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">{{ $t('customers.table.total_saved') }}</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500 text-center">{{ $t('customers.table.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr v-for="customer in customers" :key="customer.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
              <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">{{ customer.name }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone class="w-4 h-4 text-slate-400" />
                  {{ customer.mobile_number }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-lg font-black text-emerald-500">{{ customer.balance }} {{ $t('common.currency') }}</span>
              </td>
              <td class="px-6 py-4 text-slate-500">{{ customer.total_saved }} {{ $t('common.currency') }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                  <button 
                    @click="openTxModal(customer, 'deposit')" 
                    class="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl font-bold hover:bg-emerald-500 hover:text-white transition-all group"
                  >
                    <PlusCircle class="w-4 h-4" />
                    <span>شحن</span>
                  </button>
                  <button 
                    @click="openTxModal(customer, 'withdrawal')" 
                    class="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-600 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all group"
                  >
                    <MinusCircle class="w-4 h-4" />
                    <span>خصم</span>
                  </button>
                  <div class="w-[1px] h-6 bg-slate-100 dark:bg-white/5 mx-1"></div>
                  <button @click="viewHistory(customer)" class="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors">
                    <History class="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="customers.length === 0 && !loading">
              <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                <div class="flex flex-col items-center gap-4">
                  <Users class="w-12 h-12 text-slate-300" />
                  <p>{{ $t('common.no_data') }}</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Add Customer Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="showAddModal = false"></div>
      <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">إضافة عميل جديد</h3>
          <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="w-6 h-6" />
          </button>
        </div>
        <form @submit.prevent="handleAddCustomer" class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">اسم العميل</label>
              <input v-model="form.name" type="text" required class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الجوال</label>
              <input v-model="form.mobile_number" type="tel" required class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
          </div>
          <div class="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-4">
            <h4 class="text-sm font-black text-emerald-600 uppercase tracking-wider flex items-center gap-2">
              <Wallet class="w-4 h-4" />
              الرصيد الافتتاحي
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">المبلغ المدفوع (كاش)</label>
                <input v-model="form.paid_amount" type="number" step="0.01" class="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">الرصيد المضاف</label>
                <input v-model="form.added_balance" type="number" step="0.01" class="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
            </div>
          </div>
          <button type="submit" :disabled="loading" class="w-full bg-emerald-500 text-slate-900 font-black py-5 rounded-2xl mt-4 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
            <span v-if="loading" class="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
            <span>حفظ العميل والاشتراك</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Quick Transaction Modal -->
    <div v-if="showTxModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="showTxModal = false"></div>
      <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white">
              {{ txForm.type === 'deposit' ? 'شحن رصيد جديد' : 'تسجيل عملية شراء (خصم)' }}
            </h3>
            <p class="text-sm text-slate-500">{{ selectedCustomer?.name }} - {{ selectedCustomer?.mobile_number }}</p>
          </div>
          <button @click="showTxModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="w-6 h-6" />
          </button>
        </div>
        <form @submit.prevent="handleQuickTx" class="p-6 space-y-4">
          <div v-if="txForm.type === 'deposit'" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ المدفوع (كاش)</label>
                <input v-model="txForm.paid_amount" type="number" step="0.01" required class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">الرصيد المضاف</label>
                <input v-model="txForm.amount" type="number" step="0.01" required class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
            </div>
          </div>
          <div v-else class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">مبلغ الخصم</label>
                <input v-model="txForm.amount" type="number" step="0.01" required class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ الموفر</label>
                <input v-model="txForm.saved_amount" type="number" step="0.01" required class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات (اختياري)</label>
            <textarea v-model="txForm.note" class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 h-20"></textarea>
          </div>
          
          <button 
            type="submit" 
            :disabled="loading"
            :class="txForm.type === 'deposit' ? 'bg-emerald-500' : 'bg-red-500 text-white'"
            class="w-full font-black py-5 rounded-2xl mt-4 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ txForm.type === 'deposit' ? 'تأكيد الشحن' : 'تأكيد الخصم' }}</span>
          </button>
        </form>
      </div>
    </div>

    <!-- History Modal -->
    <div v-if="showHistoryModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="showHistoryModal = false"></div>
      <div class="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white">سجل العمليات</h3>
            <p class="text-sm text-slate-500">{{ selectedCustomer?.name }} - {{ selectedCustomer?.mobile_number }}</p>
          </div>
          <button @click="showHistoryModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="w-6 h-6" />
          </button>
        </div>
        <div class="p-6 max-h-[60vh] overflow-y-auto">
          <div v-if="customerHistory.length === 0" class="text-center py-12 text-slate-500">لا توجد عمليات مسجلة لهذا العميل.</div>
          <div v-else class="space-y-4">
            <div v-for="tx in customerHistory" :key="tx.id" class="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div :class="`p-2 rounded-xl ${tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`">
                  <Plus v-if="tx.type === 'deposit'" class="w-5 h-5" />
                  <Trash2 v-else class="w-5 h-5" />
                </div>
                <div>
                  <div class="font-bold text-slate-900 dark:text-white">{{ tx.type === 'deposit' ? 'شحن رصيد' : 'خصم رصيد' }}</div>
                  <div class="text-xs text-slate-500">{{ new Date(tx.created_at).toLocaleString('ar-EG') }}</div>
                </div>
              </div>
              <div class="text-left">
                <div :class="`font-black ${tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'}`">
                  {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} ر.س
                </div>
                <div class="text-[10px] text-slate-400">الرصيد بعد: {{ tx.balance_after }} ر.س</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
