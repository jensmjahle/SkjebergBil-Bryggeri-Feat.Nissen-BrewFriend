<template>
  <span class="inline-flex shrink-0 items-center gap-1" role="group" :aria-label="t('brews.actions.edit')">
    <button type="button" class="inline-action" :disabled="saving" :aria-label="t('common.cancel')" :title="t('common.cancel')" @click="$emit('cancel')"><X class="h-4 w-4" aria-hidden="true" /></button>
    <button type="button" class="inline-action inline-action--save" :disabled="saving" :aria-label="t(saving ? 'common.saving' : 'common.save')" :title="t('common.save')" @click="$emit('save')"><LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" aria-hidden="true" /><Check v-else class="h-4 w-4" aria-hidden="true" /></button>
  </span>
</template>
<script setup>
import { Check, X, LoaderCircle } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
defineProps({ saving: Boolean });
defineEmits(['save', 'cancel']);
const { t } = useI18n();
</script>
<style scoped>
.inline-action { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; padding: 0; border: 0; border-radius: .375rem; background: transparent; color: inherit; opacity: .6; transition: opacity .15s, background .15s; }
.inline-action:hover { opacity: 1; background: color-mix(in srgb, currentColor 7%, transparent); }
.inline-action:focus-visible { outline: 2px solid var(--color-button1); outline-offset: 2px; }
.inline-action--save { opacity: 1; color: var(--color-button1); }
.inline-action:disabled { opacity: .35; cursor: wait; }
</style>
