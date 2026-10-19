<script setup>
import Footer from "./components/Footer.vue";
import ConfirmDialog from "@/components/base/ConfirmDialog.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog.js";
import FloatingBrewTimers from "@/components/brews/FloatingBrewTimers.vue";

const { isVisible, options, confirm, cancel } = useConfirmDialog();
</script>

<template>
  <FloatingBrewTimers />
  <ConfirmDialog
    v-if="isVisible"
    :title="options.title"
    :message="options.message"
    :confirmText="options.confirmText"
    :cancelText="options.cancelText"
    :visible="isVisible"
    @confirm="confirm"
    @cancel="cancel"
  />
  <div class="min-h-screen flex flex-col bg-bg1">
    <main class="flex-grow">
      <router-view />
    </main>
  </div>
</template>
