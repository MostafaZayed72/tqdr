<template>
  <section id="how-it-works" class="py-20 sm:py-28 bg-white dark:bg-[#030f03]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">

      <!-- Header -->
      <div class="text-center mb-14">
        <span class="inline-block px-4 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 text-sm font-semibold mb-4">
          {{ $t('landing.how_it_works.subtitle') }}
        </span>
        <h2 class="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
          {{ $t('landing.how_it_works.title') }}
        </h2>
      </div>

      <!-- Steps Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 relative">

        <!-- Connector line (desktop) -->
        <div class="hidden lg:block absolute top-10 inset-x-0 mx-auto w-3/4 h-px bg-gradient-to-l from-transparent via-green-300 dark:via-green-800 to-transparent" />

        <div
          v-for="step in steps"
          :key="step.num"
          class="relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-[#0a1a0a] border border-gray-100 dark:border-green-900/20 hover:border-green-300 dark:hover:border-green-700/50 transition-all duration-300 group"
        >
          <!-- Step Number -->
          <div class="w-16 h-16 rounded-full bg-green-500 dark:bg-green-500 text-black font-black text-2xl flex items-center justify-center shadow-lg shadow-green-900/20 group-hover:scale-110 transition-transform duration-300 z-10">
            {{ step.num }}
          </div>

          <div>
            <h3 class="text-lg font-black text-gray-900 dark:text-white mb-2">{{ step.title }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

const steps = computed(() => [
  {
    num: locale.value === 'ar' ? '١' : '1',
    title: t('landing.how_it_works.steps[0].title'),
    desc: t('landing.how_it_works.steps[0].desc'),
  },
  {
    num: locale.value === 'ar' ? '٢' : '2',
    title: t('landing.how_it_works.steps[1].title'),
    desc: t('landing.how_it_works.steps[1].desc'),
  },
  {
    num: locale.value === 'ar' ? '٣' : '3',
    title: t('landing.how_it_works.steps[2].title'),
    desc: t('landing.how_it_works.steps[2].desc'),
  },
  {
    num: locale.value === 'ar' ? '٤' : '4',
    title: 'تتبّع سجل عملياتك',
    desc: 'ارجع وشاهد سجل عملياتك ورصيدك في أي وقت من حسابك.',
  },
])
</script>
