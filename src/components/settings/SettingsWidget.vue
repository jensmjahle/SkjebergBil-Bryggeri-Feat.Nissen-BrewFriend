<template>
  <div class="sm:block" ref="settingsRef">
    <div v-if="inline" class="rounded-lg border border-border3 bg-bg2 p-3">
      <p class="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">
        {{ t("settings.title") }}
      </p>
      <div class="flex flex-col gap-4">
        <LanguageSelect />
        <ThemeSelect />
        <ChaosModeToggle />
        <ClearSession />
      </div>
    </div>

    <div v-else class="relative w-max">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="scale-0 opacity-0"
        enter-to-class="scale-100 opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="scale-100 opacity-100"
        leave-to-class="scale-0 opacity-0"
      >
        <div
          v-if="isOpen"
          class="absolute top-0 right-0 z-10 w-72 origin-top-right rounded-lg border-2 border-border2 bg-bg1 p-4 shadow-lg"
        >
          <p class="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">
            {{ t("settings.title") }}
          </p>
          <div class="flex flex-col gap-4">
            <LanguageSelect />
            <ThemeSelect />
            <ChaosModeToggle />
            <ClearSession />
          </div>
        </div>
      </Transition>

      <button
        id="settings-button"
        class="relative z-20 rounded-full p-2 transition-transform duration-300"
        :class="{ 'rotate-180': isOpen }"
        :aria-label="t('settings.open')"
        @click="toggleOpen"
      >
        <Settings class="h-6 w-6 text-text1" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { Settings } from "lucide-vue-next";
import LanguageSelect from "@/components/settings/LanguageSelect.vue";
import ThemeSelect from "@/components/settings/ThemeSelect.vue";
import ClearSession from "@/components/settings/ClearSession.vue";
import ChaosModeToggle from "@/components/settings/ChaosModeToggle.vue";

defineProps({
  inline: {
    type: Boolean,
    default: false,
  },
});

const isOpen = ref(false);
const settingsRef = ref(null);
const { t } = useI18n();

const toggleOpen = () => (isOpen.value = !isOpen.value);

function handleClickOutside(event) {
  if (settingsRef.value && !settingsRef.value.contains(event.target)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>
