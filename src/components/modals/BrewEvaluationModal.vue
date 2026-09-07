<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
    @click.self="$emit('close')"
  >
    <div
      class="flex max-h-[85svh] w-full max-w-lg flex-col rounded-t-xl border border-border3 bg-bg2 shadow-2xl sm:max-h-[90vh] sm:rounded-xl"
    >
      <div class="flex items-center justify-between gap-2 border-b border-border3 px-4 py-3">
        <h3 class="min-w-0 truncate">{{ t("brews.evaluation.title") }}</h3>
        <button
          type="button"
          class="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
          :aria-label="t('common.close')"
          @click="$emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <p class="text-sm opacity-80">{{ t("brews.evaluation.intro") }}</p>

        <div>
          <p class="mb-2 text-sm font-medium">{{ t("brews.evaluation.rating_label") }}</p>
          <BaseStarRating
            v-model="rating"
            :size="32"
            :show-value="true"
            :empty-text="t('brews.evaluation.no_rating')"
            :aria-label="t('brews.evaluation.rating_label')"
          />
          <p v-if="showRatingError" class="mt-2 text-sm text-red-600">
            {{ t("brews.evaluation.rating_required") }}
          </p>
        </div>

        <BaseTextarea
          v-model="note"
          :rows="5"
          :label="t('brews.evaluation.note_label')"
          :placeholder="t('brews.evaluation.note_placeholder')"
        />
      </div>

      <div
        class="flex justify-end gap-2 border-t border-border3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
      >
        <BaseButton
          type="button"
          variant="button3"
          class="flex-1 sm:flex-none"
          @click="$emit('close')"
        >
          {{ t("common.cancel") }}
        </BaseButton>
        <BaseButton type="button" :disabled="loading" class="flex-1 sm:flex-none" @click="submit">
          {{ loading ? t("common.saving") : t("brews.evaluation.submit") }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { X } from "lucide-vue-next";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
import BaseStarRating from "@/components/base/BaseStarRating.vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  // An existing evaluation, when the brew is being re-evaluated.
  evaluation: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close", "submit"]);

const { t } = useI18n();

const rating = ref(null);
const note = ref("");
const showRatingError = ref(false);

function resetForm() {
  const existing = Number(props.evaluation?.rating);
  rating.value = Number.isFinite(existing) && existing > 0 ? existing : null;
  note.value = props.evaluation?.note || "";
  showRatingError.value = false;
}

// A brew cannot be finished without a rating, so the modal blocks on it.
function submit() {
  if (!rating.value) {
    showRatingError.value = true;
    return;
  }
  emit("submit", { rating: rating.value, note: note.value || null });
}

watch(
  () => [props.open, props.evaluation],
  ([isOpen]) => {
    if (isOpen) resetForm();
  },
  { immediate: true },
);

watch(rating, (value) => {
  if (value) showRatingError.value = false;
});
</script>
