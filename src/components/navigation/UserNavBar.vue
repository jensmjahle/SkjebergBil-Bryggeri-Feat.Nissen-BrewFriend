<template>
  <nav
    class="sticky top-0 z-40 w-full border-b border-border1 py-1 shadow-lg bg-cover bg-center bg-no-repeat"
    style="background-image: url('/assets/navbar_background.png')"
  >
    <div class="grid w-full grid-cols-2 items-center gap-3 px-2 sm:grid-cols-3">
      <router-link to="/" class="flex items-center">
        <img
          src="/assets/logo.png"
          alt="GuttaBrew logo"
          class="h-12 w-auto object-contain"
        />
      </router-link>

      <div class="hidden flex-wrap items-center justify-center gap-2 sm:flex sm:gap-3">
        <div v-for="group in navGroups" :key="group.label" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-border2 bg-bg2 px-3 py-2 text-sm font-semibold text-text2 transition-colors hover:bg-bg4"
            :aria-expanded="openDropdown === group.label"
            @click="toggleDropdown(group.label)"
          >
            {{ group.label }}
            <ChevronDown
              class="h-4 w-4 transition-transform"
              :class="{ 'rotate-180': openDropdown === group.label }"
            />
          </button>

          <transition name="dropdown-fade">
            <div
              v-if="openDropdown === group.label"
              class="absolute right-0 mt-2 min-w-[220px] rounded-lg border border-border2 bg-bg2 p-1 shadow-2xl"
            >
              <router-link
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="block rounded-md px-3 py-2 text-sm text-text2 transition-colors hover:bg-bg4"
                :class="{ 'bg-bg4 font-semibold text-button1': route.path === item.to }"
                @click="closeDropdown"
              >
                {{ item.label }}
              </router-link>
            </div>
          </transition>
        </div>
      </div>

      <div class="hidden items-center justify-end sm:flex">
        <SettingsWidget />
      </div>

      <div class="flex items-center justify-end sm:hidden">
        <MobileHamburgerMenu>
          <div class="flex flex-col gap-4 pt-12">
            <div v-for="group in navGroups" :key="group.label" class="space-y-1">
              <p class="text-sm font-semibold uppercase tracking-wide opacity-70">
                {{ group.label }}
              </p>
              <router-link
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="block rounded-md px-2 py-1 text-sm transition-colors hover:bg-bg2"
              >
                {{ item.label }}
              </router-link>
            </div>
            <div class="pt-2 border-t border-border3">
              <SettingsWidget />
            </div>
          </div>
        </MobileHamburgerMenu>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
import { ChevronDown } from "lucide-vue-next";
import SettingsWidget from "@/components/settings/SettingsWidget.vue";
import MobileHamburgerMenu from "@/components/navigation/MobileHamburgerMenu.vue";

const route = useRoute();
const openDropdown = ref(null);

const navGroups = [
  {
    label: "Brygg",
    items: [
      { label: "Nytt Brygg", to: "/brygg/nytt" },
      { label: "Tidligere Brygg", to: "/brygg/tidligere" },
    ],
  },
  {
    label: "Oppskrifter",
    items: [
      { label: "Ny Oppskrift", to: "/oppskrifter/ny" },
      { label: "Oppskrifter", to: "/oppskrifter" },
    ],
  },
  {
    label: "Verktøy",
    items: [
      { label: "Alkoholutregning", to: "/verktoy/alkoholmaler" },
      { label: "Co2 volumer", to: "/verktoy/co2-volumer" },
      { label: "Hydrometer-korrigering", to: "/verktoy/hydrometer-korrigering" },
    ],
  },
];

const toggleDropdown = (label) => {
  openDropdown.value = openDropdown.value === label ? null : label;
};

const closeDropdown = () => {
  openDropdown.value = null;
};

const onClickOutside = (event) => {
  if (!event.target.closest("nav")) {
    closeDropdown();
  }
};

watch(
  () => route.path,
  () => {
    closeDropdown();
  },
);

onMounted(() => {
  document.addEventListener("click", onClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onClickOutside);
});
</script>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
}
</style>
