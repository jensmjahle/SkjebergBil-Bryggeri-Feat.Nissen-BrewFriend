<template>
  <nav
    class="sticky top-0 z-40 w-full border-b border-border1 bg-cover bg-center bg-no-repeat py-1 shadow-lg"
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
        <div v-for="group in navGroups" :key="group.key" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-border2 bg-bg2 px-3 py-2 text-sm font-semibold text-text2 transition-colors hover:bg-bg4 hover:text-text4"
            :aria-expanded="openDropdown === group.key"
            @click="toggleDropdown(group.key)"
          >
            {{ group.label }}
            <ChevronDown
              class="h-4 w-4 transition-transform"
              :class="{ 'rotate-180': openDropdown === group.key }"
            />
          </button>

          <transition name="dropdown-fade">
            <div
              v-if="openDropdown === group.key"
              class="absolute right-0 mt-2 min-w-[220px] rounded-lg border border-border2 bg-bg2 p-1 shadow-2xl"
            >
              <router-link
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="block rounded-md px-3 py-2 text-sm text-text2 transition-colors hover:bg-bg4 hover:text-text4"
                :class="{ 'bg-button1 font-semibold text-button1-meta': route.path === item.to }"
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
            <div v-for="group in navGroups" :key="group.key" class="space-y-1">
              <p class="text-sm font-semibold uppercase tracking-wide text-text4 opacity-70">
                {{ group.label }}
              </p>
              <router-link
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="block rounded-md px-2 py-1 text-sm transition-colors hover:bg-bg2 hover:text-text2"
              >
                {{ item.label }}
              </router-link>
            </div>

            <div class="space-y-2 border-t border-border3 pt-2">
              <p class="text-sm font-semibold uppercase tracking-wide text-text4 opacity-70">
                {{ t("settings.title") }}
              </p>
              <SettingsWidget inline />
            </div>
          </div>
        </MobileHamburgerMenu>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { ChevronDown } from "lucide-vue-next";
import SettingsWidget from "@/components/settings/SettingsWidget.vue";
import MobileHamburgerMenu from "@/components/navigation/MobileHamburgerMenu.vue";

const route = useRoute();
const { t } = useI18n();
const openDropdown = ref(null);

const navGroups = computed(() => [
  {
    key: "brew",
    label: t("navbar.user.groups.brew"),
    items: [
      { label: t("navbar.user.items.new_brew"), to: "/brygg/nytt" },
      { label: t("navbar.user.items.previous_brews"), to: "/brygg/tidligere" },
    ],
  },
  {
    key: "recipes",
    label: t("navbar.user.groups.recipes"),
    items: [
      { label: t("navbar.user.items.new_recipe"), to: "/oppskrifter/ny" },
      { label: t("navbar.user.items.recipes"), to: "/oppskrifter" },
    ],
  },
  {
    key: "tools",
    label: t("navbar.user.groups.tools"),
    items: [
      { label: t("navbar.user.items.alcohol_calc"), to: "/verktoy/alkoholmaler" },
      { label: t("navbar.user.items.co2_volumes"), to: "/verktoy/co2-volumer" },
      {
        label: t("navbar.user.items.hydrometer_correction"),
        to: "/verktoy/hydrometer-korrigering",
      },
    ],
  },
]);

function toggleDropdown(label) {
  openDropdown.value = openDropdown.value === label ? null : label;
}

function closeDropdown() {
  openDropdown.value = null;
}

function onClickOutside(event) {
  if (event?.target instanceof Element && !event.target.closest("nav")) {
    closeDropdown();
  }
}

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
