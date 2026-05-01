<script setup lang="ts">
import { 
  BarChart3, 
  Search, 
  Filter, 
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Activity
} from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()

const transactions = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    loading.value = true
    const { data } = await client
      .from('transactions')
      .select('*, customer:customers(name), shop:profiles!transactions_shop_owner_id_fkey(email, shop_name)')
      .order('created_at', { ascending: false })
    
    transactions.value = data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">{{ $t('nav.reports') }}</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">مراقبة جميع العمليات المالية عبر المنصة بالكامل.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button class="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm">
          <Download class="w-5 h-5 text-emerald-500" />
          <span>تصدير Excel</span>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <BaseCard>
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          <Search :class="locale === 'ar' ? 'right-4' : 'left-4'" class="absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="البحث في العمليات..."
            :class="locale === 'ar' ? 'pr-12' : 'pl-12'"
            class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-900 dark:text-white"
          />
        </div>
        <div class="flex items-center gap-3">
          <button class="flex items-center gap-2 px-6 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-bold text-slate-700 dark:text-slate-300">
            <Calendar class="w-5 h-5" />
            <span>آخر 30 يوم</span>
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Global Transactions Table -->
    <BaseCard class="!p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full" :class="locale === 'ar' ? 'text-right' : 'text-left'">
          <thead>
            <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <th class="px-6 py-4 text-sm font-bold text-slate-500">المحل</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">العميل</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">النوع</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">المبلغ</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">التاريخ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr v-for="tx in transactions" :key="tx.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td class="px-6 py-4">
                <div class="font-bold text-slate-900 dark:text-white">{{ tx.shop?.shop_name || tx.shop?.email }}</div>
                <div class="text-[10px] text-slate-400">ID: {{ tx.shop_owner_id.split('-')[0] }}</div>
              </td>
              <td class="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                {{ tx.customer?.name || 'غير متوفر' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div :class="tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'" class="p-1 rounded-lg">
                    <component :is="tx.type === 'deposit' ? ArrowUpRight : ArrowDownRight" class="w-4 h-4" />
                  </div>
                  <span class="text-sm font-bold" :class="tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'">
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
            </tr>
            <tr v-if="transactions.length === 0 && !loading">
              <td colspan="5" class="px-6 py-20 text-center text-slate-500">
                <Activity class="w-16 h-16 mx-auto mb-4 opacity-10" />
                {{ $t('common.no_data') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
