<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { t } = useI18n()
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">لوحة تحكم التاجر 🏪</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">أهلاً بك مجدداً، إليك ملخص نشاط متجرك اليوم.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <BaseCard class="group hover:border-emerald-500/50 transition-colors">
        <h3 class="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">إجمالي العملاء</h3>
        <p class="text-4xl font-black text-slate-900 dark:text-white">24</p>
        <div class="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold">
          <span class="px-2 py-1 bg-emerald-500/10 rounded-lg">+3 الجدد اليوم</span>
        </div>
      </BaseCard>

      <BaseCard class="group hover:border-emerald-500/50 transition-colors">
        <h3 class="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">إجمالي الأرصدة</h3>
        <p class="text-4xl font-black text-emerald-500">1,250 ر.س</p>
        <div class="mt-4 flex items-center gap-2 text-slate-400 text-xs font-medium">
          تم تحديثه منذ 5 دقائق
        </div>
      </BaseCard>

      <BaseCard class="group hover:border-emerald-500/50 transition-colors">
        <h3 class="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">عمليات اليوم</h3>
        <p class="text-4xl font-black text-slate-900 dark:text-white">8</p>
        <div class="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold">
          <span class="px-2 py-1 bg-emerald-500/10 rounded-lg">نمو 12%</span>
        </div>
      </BaseCard>
    </div>

    <!-- Recent Activity Placeholder -->
    <BaseCard>
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-black text-slate-900 dark:text-white">أحدث العمليات</h3>
        <button class="text-emerald-500 font-bold text-sm hover:underline">عرض الكل</button>
      </div>
      <div class="space-y-4">
        <div v-for="i in 3" :key="i" class="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center font-bold">#{{ i }}</div>
            <div>
              <p class="font-bold text-slate-900 dark:text-white text-sm">عملية شحن رصيد</p>
              <p class="text-[10px] text-slate-500">منذ {{ i * 15 }} دقيقة</p>
            </div>
          </div>
          <p class="font-black text-emerald-500">+50 ر.س</p>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
