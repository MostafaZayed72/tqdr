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
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-vue-next'

definePageMeta({
  layout: 'admin'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()

const shops = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showAddModal = ref(false)
const showSuccessModal = ref(false)
const currentPage = ref(1)
const pageSize = 6
const totalShops = ref(0)
const totalPages = computed(() => Math.ceil(totalShops.value / pageSize))

const displayedPages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - 2)
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// Form state for new shop owner
const form = ref({
  email: '',
  password: '',
  shop_name: '',
  mobile_number: ''
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
      query = query.or(`email.ilike.%${searchQuery.value}%,shop_name.ilike.%${searchQuery.value}%`)
    }

    const { data, count } = await query
      .select('*', { count: 'exact' })
      .range((currentPage.value - 1) * pageSize, currentPage.value * pageSize - 1)
    
    shops.value = data || []
    totalShops.value = count || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleAddShop = async () => {
  try {
    loading.value = true
    
    if (editingShop.value) {
      // Update existing shop
      const { error } = await client
        .from('profiles')
        .update({ 
          shop_name: form.value.shop_name,
          email: form.value.email
        })
        .eq('id', editingShop.value.id)
      
      if (error) throw error
    } else {
      // 1. Create auth user
      const { data: authData, error: authError } = await client.auth.signUp({
        email: form.value.email,
        password: form.value.password,
      })
      
      if (authError) throw authError

      // 2. Profile is auto-created by trigger, but we update it
      if (authData.user) {
        const { error: profileError } = await client
          .from('profiles')
          .update({ 
            role: 'shop_owner',
            shop_name: form.value.shop_name
          })
          .eq('id', authData.user.id)
        
        if (profileError) throw profileError

        // 3. Send Welcome SMS
        if (form.value.mobile_number) {
          try {
            const welcomeMsg = `مرحباً بك كصاحب محل في منصة تقدر بلس! تم إنشاء حسابك. بيانات دخولك: البريد: ${form.value.email} كلمة المرور: ${form.value.password} رابط الدخول: https://tqdrplus.sa/login`
            await $fetch('/api/sms/send', {
              method: 'POST',
              body: {
                phone: form.value.mobile_number,
                message: welcomeMsg
              }
            })
          } catch (smsErr) {
            console.error('Failed to send SMS:', smsErr)
          }
        }
      }
    }

    showAddModal.value = false
    showSuccessModal.value = true
    editingShop.value = null
    form.value = { email: '', password: '', shop_name: '', mobile_number: '' }
    fetchShops()
  } catch (e: any) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const showDeleteModal = ref(false)
const shopToDelete = ref<string | null>(null)

const confirmDeleteShop = (id: string) => {
  shopToDelete.value = id
  showDeleteModal.value = true
}

const handleDeleteShop = async () => {
  if (!shopToDelete.value) return
  
  try {
    loading.value = true
    const { error } = await client.from('profiles').delete().eq('id', shopToDelete.value)
    
    if (error) throw error
    
    showDeleteModal.value = false
    shopToDelete.value = null
    await fetchShops()
    // We can use a toast here later, for now we just refresh
  } catch (e: any) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const editingShop = ref(null)
const handleEditShop = (shop: any) => {
  editingShop.value = { ...shop }
  form.value = { 
    email: shop.email, 
    password: '', 
    shop_name: shop.shop_name 
  }
  showAddModal.value = true
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
            <template v-if="loading">
              <tr v-for="i in 6" :key="i">
                <td class="px-6 py-4"><Skeleton roundedClass="rounded w-32 h-6" /></td>
                <td class="px-6 py-4"><Skeleton roundedClass="rounded w-24 h-6" /></td>
                <td class="px-6 py-4"><Skeleton roundedClass="rounded w-28 h-6" /></td>
                <td class="px-6 py-4"><Skeleton roundedClass="rounded-full w-16 h-6" /></td>
                <td class="px-6 py-4"><Skeleton roundedClass="rounded-xl w-20 h-8 mx-auto" /></td>
              </tr>
            </template>
            <template v-else>
              <tr 
                v-for="shop in shops" :key="shop.id" 
                @click="navigateTo(`/admin-dashboard/shops/${shop.id}`)"
                class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
              >
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
                <td class="px-6 py-4" @click.stop>
                  <div class="flex items-center justify-center gap-2">
                    <button 
                      @click="handleEditShop(shop)"
                      class="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-colors"
                    >
                      <Edit2 class="w-5 h-5" />
                    </button>
                    <button 
                      @click="confirmDeleteShop(shop.id)"
                      class="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
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
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
        <p class="text-sm text-slate-500 font-bold">
          عرض 
          <span class="text-slate-900 dark:text-white">{{ (currentPage - 1) * pageSize + 1 }}</span>
          -
          <span class="text-slate-900 dark:text-white">{{ Math.min(currentPage * pageSize, totalShops) }}</span>
          من
          <span class="text-slate-900 dark:text-white">{{ totalShops }}</span>
        </p>
        
        <div class="flex items-center gap-1">
          <!-- First -->
          <button @click="currentPage = 1; fetchShops()" :disabled="currentPage === 1" 
            class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronsRight v-if="locale === 'ar'" class="w-5 h-5" />
            <ChevronsLeft v-else class="w-5 h-5" />
          </button>
          
          <!-- Prev -->
          <button @click="currentPage--; fetchShops()" :disabled="currentPage === 1" 
            class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronRight v-if="locale === 'ar'" class="w-5 h-5" />
            <ChevronLeft v-else class="w-5 h-5" />
          </button>

          <!-- Numbers -->
          <div class="flex items-center gap-1 mx-2">
            <button v-for="p in displayedPages" :key="p" 
              @click="currentPage = p; fetchShops()"
              class="w-10 h-10 rounded-xl font-black text-sm transition-all"
              :class="currentPage === p ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'"
            >
              {{ p }}
            </button>
          </div>

          <!-- Next -->
          <button @click="currentPage++; fetchShops()" :disabled="currentPage === totalPages" 
            class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronLeft v-if="locale === 'ar'" class="w-5 h-5" />
            <ChevronRight v-else class="w-5 h-5" />
          </button>

          <!-- Last -->
          <button @click="currentPage = totalPages; fetchShops()" :disabled="currentPage === totalPages" 
            class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronsLeft v-if="locale === 'ar'" class="w-5 h-5" />
            <ChevronsRight v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div @click="showAddModal = false" class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"></div>
      <BaseCard class="w-full max-w-lg relative z-10 animate-slide-up !p-8 rounded-[40px]">
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white">
            {{ editingShop ? 'تعديل بيانات المحل' : 'إضافة صاحب محل' }}
          </h3>
          <button @click="showAddModal = false; editingShop = null" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
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
              :required="!editingShop"
              class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
              placeholder="••••••••"
            />
          </div>
          <div v-if="!editingShop">
            <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">رقم الجوال (للإشعارات)</label>
            <input 
              v-model="form.mobile_number"
              type="tel" 
              required
              class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
              placeholder="05xxxxxxxx"
            />
          </div>

          <button 
            type="submit"
            :disabled="loading"
            class="w-full bg-emerald-500 text-slate-950 font-black py-5 rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
            <span>{{ editingShop ? 'حفظ التعديلات' : 'إنشاء الحساب' }}</span>
          </button>
        </form>
      </BaseCard>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div @click="showDeleteModal = false" class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"></div>
      <BaseCard class="w-full max-w-sm relative z-10 animate-in zoom-in duration-300 !p-10 rounded-[40px] text-center">
        <div class="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 class="w-10 h-10" />
        </div>
        <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">تأكيد الحذف</h3>
        <p class="text-slate-500 mb-8 font-medium">هل أنت متأكد من حذف هذا الحساب نهائياً؟ لا يمكن التراجع عن هذه الخطوة.</p>
        <div class="space-y-3">
          <button 
            @click="handleDeleteShop"
            :disabled="loading"
            class="w-full bg-red-500 text-white font-black py-4 rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>نعم، احذف الحساب</span>
          </button>
          <button 
            @click="showDeleteModal = false"
            class="w-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all"
          >
            إلغاء
          </button>
        </div>
      </BaseCard>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div @click="showSuccessModal = false" class="absolute inset-0 bg-slate-950/40 backdrop-blur-md"></div>
      <BaseCard class="w-full max-w-sm relative z-10 animate-in zoom-in duration-300 !p-10 rounded-[40px] text-center">
        <div class="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck class="w-10 h-10" />
        </div>
        <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">تم الإنشاء بنجاح!</h3>
        <p class="text-slate-500 mb-8 font-medium">تم إنشاء حساب المحل الجديد وتفعيل صلاحياته في النظام.</p>
        <button 
          @click="showSuccessModal = false"
          class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl hover:shadow-lg transition-all"
        >
          موافق
        </button>
      </BaseCard>
    </div>
  </div>
</template>
