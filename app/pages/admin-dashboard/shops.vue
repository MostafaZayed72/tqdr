<script setup lang="ts">
import { 
  Store, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  History,
  X,
  Mail,
  Lock,
  Eye,
  ShieldCheck,
  ChevronRight
} from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()

const shops = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showAddModal = ref(false)

// Form state for new shop owner
const form = ref({
  email: '',
  password: '',
  shop_name: ''
})

const fetchShops = async () => {
  try {
    loading.value = true
    let query = client
      .from('profiles')
      .select('*')
      .eq('role', 'shop_owner')
      .order('created_at', { ascending: false })

    if (searchQuery.value) {
      query = query.ilike('email', `%${searchQuery.value}%`)
    }

    const { data } = await query
    shops.value = data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleAddShop = async () => {
  try {
    loading.value = true
    // 1. Create auth user
    const { data: authData, error: authError } = await client.auth.signUp({
      email: form.value.email,
      password: form.value.password,
    })
    
    if (authError) throw authError

    // 2. Profile is auto-created by trigger, but we might want to update it
    if (authData.user) {
      const { error: profileError } = await client
        .from('profiles')
        .update({ 
          role: 'shop_owner',
          shop_name: form.value.shop_name 
        })
        .eq('id', authData.user.id)
      
      if (profileError) throw profileError
    }

    showAddModal.value = false
    form.value = { email: '', password: '', shop_name: '' }
    fetchShops()
  } catch (e: any) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchShops)
watch(searchQuery, fetchShops)
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">{{ $t('nav.shops') }}</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">إدارة حسابات أصحاب المحلات والتحكم في صلاحياتهم.</p>
      </div>
      
      <button 
        @click="showAddModal = true"
        class="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 premium-btn"
      >
        <Plus class="w-5 h-5" />
        <span>إضافة صاحب محل جديد</span>
      </button>
    </div>

    <!-- Search & Filters -->
    <BaseCard>
      <div class="relative">
        <Search :class="locale === 'ar' ? 'right-4' : 'left-4'" class="absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="ابحث بالبريد الإلكتروني أو اسم المحل..."
          :class="locale === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'"
          class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-900 dark:text-white"
        />
      </div>
    </BaseCard>

    <!-- Shops Table -->
    <BaseCard class="!p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full" :class="locale === 'ar' ? 'text-right' : 'text-left'">
          <thead>
            <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <th class="px-6 py-4 text-sm font-bold text-slate-500">صاحب المحل</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">اسم المحل</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">تاريخ الانضمام</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500">الحالة</th>
              <th class="px-6 py-4 text-sm font-bold text-slate-500 text-center">{{ $t('customers.table.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr v-for="shop in shops" :key="shop.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center font-bold text-emerald-600">
                    {{ shop.email.charAt(0).toUpperCase() }}
                  </div>
                  <div class="font-bold text-slate-900 dark:text-white">{{ shop.email }}</div>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                {{ shop.shop_name || '-' }}
              </td>
              <td class="px-6 py-4 text-slate-500">
                {{ new Date(shop.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') }}
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold">نشط</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                  <button class="p-2 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors">
                    <Eye class="w-5 h-5" />
                  </button>
                  <button class="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-colors">
                    <Edit2 class="w-5 h-5" />
                  </button>
                  <button class="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                    <Trash2 class="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="shops.length === 0 && !loading">
              <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                {{ $t('common.no_data') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div @click="showAddModal = false" class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"></div>
      <BaseCard class="w-full max-w-lg relative z-10 animate-slide-up !p-8 rounded-[40px]">
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white">إضافة صاحب محل</h3>
          <button @click="showAddModal = false" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <X class="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form @submit.prevent="handleAddShop" class="space-y-6">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">اسم المحل</label>
            <input 
              v-model="form.shop_name"
              type="text" 
              required
              class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
              placeholder="مثال: متجر التقنية"
            />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">البريد الإلكتروني</label>
            <input 
              v-model="form.email"
              type="email" 
              required
              class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
              placeholder="shop@example.com"
            />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">كلمة المرور المؤقتة</label>
            <input 
              v-model="form.password"
              type="password" 
              required
              class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            :disabled="loading"
            class="w-full bg-emerald-500 text-slate-950 font-black py-5 rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
            <span>إنشاء الحساب</span>
          </button>
        </form>
      </BaseCard>
    </div>
  </div>
</template>
