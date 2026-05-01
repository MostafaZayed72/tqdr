<script setup lang="ts">
import { 
  Users, 
  Search, 
  Download,
  Filter,
  ArrowUpRight,
  User,
  Smartphone,
  Wallet,
  Activity,
  Trash2
} from 'lucide-vue-next'

definePageMeta({
  layout: 'admin'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()

const customers = ref([])
const loading = ref(true)
const searchQuery = ref('')

const fetchAllCustomers = async () => {
  try {
    loading.value = true
    let query = client
      .from('customers')
      .select('*, shop:profiles!customers_shop_owner_id_fkey(shop_name, email)')
      .order('created_at', { ascending: false })

    if (searchQuery.value) {
      query = query.or(`name.ilike.%${searchQuery.value}%,mobile_number.ilike.%${searchQuery.value}%`)
    }

    const { data, error } = await query
    if (error) throw error
    customers.value = data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleDeleteCustomer = async (id: string) => {
  if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return
  
  try {
    console.log('Attempting to delete customer with ID:', id)
    loading.value = true
    const { error, data } = await client.from('customers').delete().eq('id', id).select()
    
    console.log('Delete response:', { error, data })
    
    if (error) throw error
    
    await fetchAllCustomers()
    alert('تم حذف العميل بنجاح.')
  } catch (e: any) {
    console.error('Delete error:', e)
    alert(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchAllCustomers)
watch(searchQuery, fetchAllCustomers)
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">إدارة كافة العملاء 👥</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">عرض ومراقبة جميع العملاء المسجلين عبر كافة المحلات.</p>
      </div>
      
      <button class="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm">
        <Download class="w-5 h-5 text-emerald-500" />
        <span>تصدير قائمة العملاء</span>
      </button>
    </div>

    <!-- Search & Filters -->
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

    <!-- Global Customers Table -->
    <BaseCard class="!p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full" :class="locale === 'ar' ? 'text-right' : 'text-left'">
          <thead>
            <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <th class="px-6 py-4 text-sm font-bold text-slate-500">العميل</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">المحل التابع له</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">الرصيد</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">تاريخ التسجيل</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr v-for="customer in customers" :key="customer.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center font-bold text-emerald-600">
                    {{ customer.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900 dark:text-white">{{ customer.name }}</div>
                    <div class="text-[10px] text-slate-500">{{ customer.mobile_number }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-slate-700 dark:text-slate-300 text-sm">
                  {{ customer.shop?.shop_name || 'غير محدد' }}
                </div>
                <div class="text-[10px] text-slate-400">{{ customer.shop?.email }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1 font-black text-emerald-500">
                  <Wallet class="w-4 h-4" />
                  <span>{{ customer.balance }} {{ $t('common.currency') }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-slate-500">
                {{ new Date(customer.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') }}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                  <button class="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all">
                    <Activity class="w-5 h-5" />
                  </button>
                  <button 
                    @click="handleDeleteCustomer(customer.id)"
                    class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 class="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="customers.length === 0 && !loading">
              <td colspan="5" class="px-6 py-20 text-center text-slate-500">
                <Users class="w-16 h-16 mx-auto mb-4 opacity-10" />
                لم يتم العثور على عملاء في النظام.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
