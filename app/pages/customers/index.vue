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
  layout: 'merchant'
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

// Pagination
const currentPage = ref(1)
const pageSize = 10
const totalCustomers = ref(0)
const totalPages = computed(() => {
  const total = totalCustomers.value || 0
  return Math.max(1, Math.ceil(total / pageSize))
})

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
    if (!user.value?.id) return

    let query = client
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('shop_owner_id', user.value.id)
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * pageSize, currentPage.value * pageSize - 1)

    if (searchQuery.value) {
      query = query.or(`name.ilike.%${searchQuery.value}%,mobile_number.ilike.%${searchQuery.value}%`)
    }

    const { data, count } = await query
    customers.value = data || []
    totalCustomers.value = count || 0
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
      name: form.value.name,
      mobile_number: form.value.mobile_number,
      balance: form.value.added_balance,
      shop_owner_id: user.value.id
    }).select().single()

    if (custError) throw custError

    // 2. Create Initial Transaction (if balance > 0)
    if (form.value.added_balance > 0) {
      await client.from('transactions').insert({
        customer_id: customer.id,
        shop_owner_id: user.value.id,
        type: 'deposit',
        amount: form.value.added_balance,
        paid_amount: form.value.paid_amount,
        balance_before: 0,
        balance_after: form.value.added_balance,
        note: 'افتتاح حساب عميل جديد'
      })
    }
    
    showAddModal.value = false
    form.value = { name: '', mobile_number: '', paid_amount: 0, added_balance: 0 }
    fetchCustomers()
  } catch (e: any) {
    if (import.meta.client) alert(e.message)
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

    showTxModal.value = false
    txForm.value = { type: 'deposit', amount: 0, paid_amount: 0, saved_amount: 0, note: '' }
    fetchCustomers()
  } catch (e: any) {
    if (import.meta.client) alert(e.message)
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
  if (!user.value?.id || String(user.value.id) === 'undefined') {
    loading.value = false
    return
  }
  
  await fetchCustomers()
  const { data } = await client.from('profiles').select('shop_name').eq('id', user.value.id).maybeSingle()
  profile.value = data
})
watch(searchQuery, fetchCustomers)
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">إدارة العملاء</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">قم بإضافة عملاء جدد وإدارة أرصدتهم بكل سهولة.</p>
      </div>
      
      <button 
        @click="showAddModal = true"
        class="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 premium-btn"
      >
        <Plus class="w-5 h-5" />
        <span>إضافة عميل جديد</span>
      </button>
    </div>

    <!-- Filters & Search -->
    <BaseCard>
      <div class="relative">
        <Search :class="locale === 'ar' ? 'right-4' : 'left-4'" class="absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="ابحث بالاسم أو رقم الجوال..."
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
              <th class="px-6 py-4 text-sm font-bold text-slate-500">اسم العميل</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">رقم الجوال</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">الرصيد</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">إجمالي التوفير</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500 text-center">الإجراءات</th>
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
                <span class="text-lg font-black text-emerald-500">{{ customer.balance }} ر.س</span>
              </td>
              <td class="px-6 py-4 text-slate-500">{{ customer.total_saved }} ر.س</td>
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
                  <p>لا يوجد عملاء مضافين حالياً.</p>
                </div>
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
          <span class="font-bold text-slate-900 dark:text-white">{{ Math.min(currentPage * pageSize, totalCustomers) }}</span>
          من
          <span class="font-bold text-slate-900 dark:text-white">{{ totalCustomers }}</span>
        </p>
        
        <div class="flex items-center gap-2">
          <button 
            @click="currentPage--; fetchCustomers()"
            :disabled="currentPage === 1"
            class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ locale === 'ar' ? '→' : '←' }}
          </button>
          
          <div class="flex items-center gap-1">
            <button 
              v-for="page in totalPages" 
              :key="page"
              @click="currentPage = page; fetchCustomers()"
              class="w-10 h-10 rounded-xl font-bold transition-all"
              :class="currentPage === page ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500'"
            >
              {{ page }}
            </button>
          </div>

          <button 
            @click="currentPage++; fetchCustomers()"
            :disabled="currentPage === totalPages"
            class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ locale === 'ar' ? '←' : '→' }}
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Modals (Add, Transaction, History) ... Simplified for now to ensure stability -->
  </div>
</template>
