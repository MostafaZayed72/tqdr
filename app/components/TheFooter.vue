<script setup lang="ts">
const { locale } = useI18n()
</script>

<template>
  <footer class="bg-black border-t border-gray-900 text-gray-400">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

        <!-- Logo + Description -->
        <div class="lg:col-span-2 flex flex-col gap-5 max-w-sm">
          <div class="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" class="h-12 w-auto brightness-0 invert" />
          </div>
          <p class="text-sm leading-relaxed text-gray-500">
            {{ $t('landing.footer.description') }}
          </p>
          <div class="flex items-center gap-4">
            <a
              href="https://wa.me/966550570751"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-[#25D366] hover:bg-green-500/20 text-xs font-bold transition-all"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {{ $t('landing.contact.form.send') }}
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="flex flex-col gap-5">
          <h3 class="text-white font-black text-sm">{{ $t('landing.footer.quick_links') }}</h3>
          <ul class="flex flex-col gap-3 text-sm">
            <li><a href="#home" class="hover:text-green-400 transition-colors">{{ $t('landing.nav.home') }}</a></li>
            <li><a href="#features" class="hover:text-green-400 transition-colors">{{ $t('landing.nav.how_it_works') }}</a></li>
            <li><a href="#shops" class="hover:text-green-400 transition-colors">{{ $t('landing.nav.features') }}</a></li>
            <li><a href="#faq" class="hover:text-green-400 transition-colors">{{ $t('landing.nav.faq') }}</a></li>
          </ul>
        </div>

        <!-- Contact -->
        <div class="flex flex-col gap-5">
          <h3 class="text-white font-black text-sm">{{ $t('landing.footer.contact_info') }}</h3>
          <ul class="flex flex-col gap-4 text-sm">
            <li>
              <a href="tel:+966550570751" class="group flex items-center gap-3 hover:text-green-400 transition-colors">
                <div class="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <svg class="w-4 h-4 text-gray-500 group-hover:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                  </svg>
                </div>
                <span dir="ltr" class="font-bold">+966 55 057 0751</span>
              </a>
            </li>
            <li>
              <a href="mailto:info@tqdrplus.sa" class="group flex items-center gap-3 hover:text-green-400 transition-colors">
                <div class="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <svg class="w-4 h-4 text-gray-500 group-hover:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                  </svg>
                </div>
                <span class="font-bold">info@tqdrplus.sa</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="pt-6 border-t border-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
        <p>© 2026 {{ $t('landing.footer.rights') }}</p>
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>{{ $t('landing.footer.status') }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>
