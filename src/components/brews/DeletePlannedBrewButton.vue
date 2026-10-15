<template>
  <div v-if="brew.status === 'planned'" class="space-y-1" @click.stop>
    <button
      type="button"
      class="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md p-2 text-[var(--color-error-text,#dc2626)] opacity-75 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-40"
      :disabled="deleting || disabled"
      :aria-label="`${t('brews.actions.delete_plan')}: ${brew.name || ''}`"
      :title="t('brews.actions.delete_plan')"
      @click="remove"
    >
      <LoaderCircle v-if="deleting" class="h-4 w-4 animate-spin" aria-hidden="true" />
      <Trash2 v-else class="h-4 w-4" aria-hidden="true" />
      <span v-if="showText">{{ t('brews.actions.delete_plan') }}</span>
    </button>
    <p v-if="error" role="alert" class="max-w-xs text-sm text-[var(--color-error-text,#dc2626)]">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { LoaderCircle, Trash2 } from 'lucide-vue-next';
import { deleteBrew } from '@/services/brews.service.js';
import { useFloatingBrewTimersStore } from '@/store/useFloatingBrewTimersStore.js';

const props = defineProps({ brew: { type: Object, required: true }, showText: Boolean, disabled: Boolean });
const emit = defineEmits(['deleted']);
const { t } = useI18n();
const floatingTimers = useFloatingBrewTimersStore();
const deleting = ref(false);
const error = ref('');

async function remove() {
  if (deleting.value || props.disabled || props.brew.status !== 'planned') return;
  if (!window.confirm(t('brews.plan.confirm_delete', { name: props.brew.name || '' }))) return;
  const id = props.brew._id;
  deleting.value = true;
  error.value = '';
  try {
    await deleteBrew(id);
    floatingTimers.removeBrew(String(id));
    emit('deleted', id);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t('brews.errors.delete_failed');
  } finally { deleting.value = false; }
}
</script>
