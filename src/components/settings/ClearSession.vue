<template>
  <div v-if="hasToken">
    <p class="text-sm font-medium text-text1 mb-1">
      {{ $t("settings.clearSession") }}
    </p>
    <BaseButton
      variant="button4"
      class="w-full font-normal text-danger underline hover:opacity-80"
      @click="clearSession"
    >
      {{ $t("settings.clearSessionButton") }}
    </BaseButton>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import BaseButton from "@/components/base/BaseButton.vue";

const hasToken = ref(false);

function clearSession() {
  sessionStorage.removeItem("jwt");
  localStorage.removeItem("jwt");
  hasToken.value = false;
  // Full reload to clear navigation state like sidebar buttons or chat route
  window.location.reload();
}

onMounted(() => {
  hasToken.value = !!(
    sessionStorage.getItem("jwt") || localStorage.getItem("jwt")
  );
});
</script>
