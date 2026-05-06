<script setup lang="ts">
import { 
  Plus, 
  Trash2, 
  Edit2, 
  CreditCard, 
  X,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant'
})

const client = useSupabaseClient()
const user = useSupabaseUser()
const { t, locale } = useI18n()

const offers = ref([])
const loading = ref(false)
const showModal = ref(false)
const editingOffer = ref(null)

const form = ref({
  name: '',
  price: '',
  usage_limit: '',
  discount: '',
  duration: 30
})

const fetchOffers = async () => {
  const { data: { user: authUser } } = await client.auth.getUser()
  const userId = authUser?.id
  
  if (!userId) return

  try {
    loading.value = true
    console.log('Fetching offers for:', userId)
    const { data, error } = await client
      .from('subscription_offers')
      .select('*')
      .eq('shop_owner_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    console.log('Offers fetched successfully:', data)
    offers.value = data || []
  } catch (e: any) {
    console.error('Error fetching offers:', e)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  try {
    loading.value = true
    const { data: { user: authUser } } = await client.auth.getUser()
    if (!authUser) throw new Error('لم يتم العثور على بيانات المستخدم')

    const payload = {
      name: form.value.name,
      price: parseFloat(form.value.price),
      usage_limit: parseInt(form.value.usage_limit),
      discount: parseFloat(form.value.discount),
      duration: parseInt(form.value.duration),
      shop_owner_id: authUser.id
    }

    console.log('Inserting subscription offer with payload:', payload)

    if (editingOffer.value) {
      const { error } = await client
        .from('subscription_offers')
        .update(payload)
        .eq('id', editingOffer.value.id)
      if (error) throw error
    } else {
      const { error } = await client
        .from('subscription_offers')
        .insert(payload)
      if (error) throw error
    }

    showModal.value = false
    editingOffer.value = null
    form.value = { name: '', price: '', usage_limit: '', discount: '', duration: 30 }
    await fetchOffers()
  } catch (e: any) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const handleEdit = (offer: any) => {
  editingOffer.value = offer
  form.value = {
    name: offer.name,
    price: offer.price.toString(),
    usage_limit: offer.usage_limit.toString(),
    discount: offer.discount.toString(),
    duration: offer.duration
  }
  showModal.value = true
}

const handleDelete = async (id: string) => {
  if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return
  try {
    loading.value = true
    const { error } = await client
      .from('subscription_offers')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchOffers()
  } catch (e: any) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

watch(() => user.value?.id, (newId) => {
  if (newId) fetchOffers()
}, { immediate: true })

onMounted(() => {
  fetchOffers()
})
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">{{ $t('subscriptions.offers') }}</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">قم بإنشاء وإدارة عروض الاشتراكات لعملائك لزيادة الولاء والنشاط.</p>
      </div>
      
      <button 
        @click="showModal = true"
        class="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
      >
        <Plus class="w-5 h-5" />
        <span>{{ $t('subscriptions.add_offer') }}</span>
      </button>
    </div>

    <!-- Offers Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <BaseCard 
        v-for="offer in offers" :key="offer.id"
        class="group relative overflow-hidden !p-0 hover:scale-[1.02] transition-all duration-300"
      >
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <CreditCard class="w-6 h-6" />
            </div>
            <div class="flex gap-2">
              <button @click="handleEdit(offer)" class="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all">
                <Edit2 class="w-4 h-4" />
              </button>
              <button @click="handleDelete(offer.id)" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ offer.name }}</h3>
          
          <div class="space-y-3 mb-6">
            <div class="flex items-center gap-2 text-sm text-slate-500">
              <Clock class="w-4 h-4" />
              <span>مدة العرض: {{ offer.duration }} يوم</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 class="w-4 h-4" />
              <span>مرات الاشتراك: {{ offer.usage_limit }}</span>
            </div>
          </div>

          <div class="flex items-end justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">قيمة الاشتراك</p>
              <p class="text-2xl font-black text-emerald-500">{{ offer.price }} <span class="text-xs">{{ $t('common.currency') }}</span></p>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">الخصم</p>
              <p class="text-lg font-bold text-amber-500">{{ offer.discount }} <span class="text-xs">{{ $t('common.currency') }}</span></p>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Empty State -->
      <div v-if="offers.length === 0 && !loading" class="md:col-span-2 lg:col-span-3">
        <BaseCard class="!p-12 text-center border-2 border-dashed border-slate-200 dark:border-white/10 bg-transparent">
          <div class="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <CreditCard class="w-10 h-10" />
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">لا توجد عروض حالياً</h3>
          <p class="text-slate-500 mb-8 max-w-sm mx-auto">ابدأ بإنشاء أول عرض اشتراك لعملائك لزيادة التفاعل مع محلك.</p>
          <button 
            @click="showModal = true"
            class="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:shadow-xl transition-all"
          >
            <Plus class="w-5 h-5" />
            <span>إضافة عرضك الأول</span>
          </button>
        </BaseCard>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div @click="showModal = false" class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"></div>
      <BaseCard class="w-full max-w-lg relative z-10 animate-slide-up !p-8 rounded-[40px]">
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white">
            {{ editingOffer ? 'تعديل عرض' : 'إضافة عرض جديد' }}
          </h3>
          <button @click="showModal = false; editingOffer = null" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <X class="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">اسم العرض</label>
            <input 
              v-model="form.name"
              type="text" 
              required
              class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
              placeholder="مثال: عرض الصيف المميز"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">قيمة الاشتراك (ريال)</label>
              <input 
                v-model="form.price"
                type="number" 
                required
                class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
                placeholder="100"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">قيمة الخصم (ريال)</label>
              <input 
                v-model="form.discount"
                type="number" 
                required
                class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
                placeholder="10"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">عدد مرات الاشتراك</label>
              <input 
                v-model="form.usage_limit"
                type="number" 
                required
                class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
                placeholder="5"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">مدة العرض</label>
              <select 
                v-model="form.duration"
                required
                class="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white appearance-none"
              >
                <option :value="30">30 يوم</option>
                <option :value="60">60 يوم</option>
                <option :value="90">90 يوم</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            :disabled="loading"
            class="w-full bg-emerald-500 text-slate-950 font-black py-5 rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
            <span>{{ editingOffer ? 'حفظ التعديلات' : 'إضافة العرض' }}</span>
          </button>
        </form>
      </BaseCard>
    </div>
  </div>
</template>
